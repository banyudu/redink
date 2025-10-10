use lancedb::connect;
use lancedb::query::{ExecutableQuery, QueryBase};
use serde::{Deserialize, Serialize};
use std::sync::Arc as StdArc;
use tauri::State;
use tokio::sync::Mutex;
use futures::stream::StreamExt;
use arrow_array::{ArrayRef, Float32Array, Int32Array, StringArray, FixedSizeListArray, RecordBatch};
use arrow_schema::{DataType, Field, Schema};
use arrow_ipc::writer::FileWriter;

#[derive(Debug, Serialize, Deserialize)]
pub struct VectorSearchResult {
    pub id: String,
    pub text: String,
    pub score: f32,
    pub distance: f32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChunkData {
    pub id: String,
    pub text: String,
    pub vector: Vec<f32>,
    pub chunk_index: i32,
    pub text_length: i32,
}

pub struct VectorStoreState {
    db_path: StdArc<Mutex<Option<String>>>,
}

impl VectorStoreState {
    pub fn new() -> Self {
        Self {
            db_path: StdArc::new(Mutex::new(None)),
        }
    }
}

#[tauri::command]
pub async fn vector_store_initialize(
    storage_path: String,
    state: State<'_, StdArc<Mutex<VectorStoreState>>>,
) -> Result<String, String> {
    let mut store_state = state.lock().await;
    store_state.db_path = StdArc::new(Mutex::new(Some(storage_path.clone())));
    
    // Test connection
    let _db = connect(&storage_path)
        .execute()
        .await
        .map_err(|e| format!("Failed to connect to LanceDB: {}", e))?;
    
    Ok(format!("LanceDB initialized at: {}", storage_path))
}

#[tauri::command]
pub async fn vector_store_add_chunks(
    document_id: String,
    chunks: Vec<ChunkData>,
    storage_path: String,
) -> Result<String, String> {
    let db = connect(&storage_path)
        .execute()
        .await
        .map_err(|e| format!("Failed to connect: {}", e))?;

    let table_name = format!("doc_{}", document_id.replace(|c: char| !c.is_alphanumeric(), "_"));

    // Create table (overwrite if exists) - try drop first
    let _ = db.drop_table(&table_name).await; // Ignore error if table doesn't exist
    
    // Try simplified approach: write to temp file then import
    // LanceDB can read from Arrow IPC files
    use std::fs::File;
    use std::path::PathBuf;
    
    // Build Arrow arrays directly
    let ids: StringArray = chunks.iter().map(|c| Some(c.id.as_str())).collect();
    let texts: StringArray = chunks.iter().map(|c| Some(c.text.as_str())).collect();
    let chunk_indices: Int32Array = chunks.iter().map(|c| Some(c.chunk_index)).collect();
    let text_lengths: Int32Array = chunks.iter().map(|c| Some(c.text_length)).collect();
    
    // Create fixed-size list for vectors (384 dimensions)
    let vector_dim = if chunks.is_empty() { 384 } else { chunks[0].vector.len() as i32 };
    let mut vector_values = Vec::new();
    for chunk in &chunks {
        vector_values.extend_from_slice(&chunk.vector);
    }
    let vector_data = Float32Array::from(vector_values);
    let vectors = FixedSizeListArray::try_new(
        StdArc::new(Field::new("item", DataType::Float32, true)),
        vector_dim,
        StdArc::new(vector_data) as ArrayRef,
        None,
    )
    .map_err(|e| format!("Failed to create vector array: {}", e))?;
    
    // Define schema
    let schema = StdArc::new(Schema::new(vec![
        Field::new("id", DataType::Utf8, false),
        Field::new("text", DataType::Utf8, false),
        Field::new("vector", DataType::FixedSizeList(
            StdArc::new(Field::new("item", DataType::Float32, true)),
            vector_dim,
        ), false),
        Field::new("chunk_index", DataType::Int32, false),
        Field::new("text_length", DataType::Int32, false),
    ]));
    
    // Create RecordBatch
    let batch = RecordBatch::try_new(
        schema.clone(),
        vec![
            StdArc::new(ids) as ArrayRef,
            StdArc::new(texts) as ArrayRef,
            StdArc::new(vectors) as ArrayRef,
            StdArc::new(chunk_indices) as ArrayRef,
            StdArc::new(text_lengths) as ArrayRef,
        ],
    )
    .map_err(|e| format!("Failed to create record batch: {}", e))?;
    
    // Write to temporary file
    let temp_path = PathBuf::from(&storage_path).join(format!("temp_{}.arrow", table_name));
    {
        let file = File::create(&temp_path)
            .map_err(|e| format!("Failed to create temp file: {}", e))?;
        let mut writer = FileWriter::try_new(file, &schema)
            .map_err(|e| format!("Failed to create IPC writer: {}", e))?;
        writer.write(&batch)
            .map_err(|e| format!("Failed to write batch: {}", e))?;
        writer.finish()
            .map_err(|e| format!("Failed to finish writing: {}", e))?;
    }
    
    // Read back the file as FileReader
    let file = File::open(&temp_path)
        .map_err(|e| format!("Failed to open temp file: {}", e))?;
    let reader = arrow_ipc::reader::FileReader::try_new(file, None)
        .map_err(|e| format!("Failed to create file reader: {}", e))?;
    
    // Import from FileReader
    db.create_table(&table_name, reader)
        .execute()
        .await
        .map_err(|e| format!("Failed to create table: {}", e))?;
    
    // Clean up temp file
    let _ = std::fs::remove_file(&temp_path);

    Ok(format!("Added {} chunks to table {}", chunks.len(), table_name))
}

#[tauri::command]
pub async fn vector_store_search(
    document_id: String,
    query_embedding: Vec<f32>,
    top_k: usize,
    storage_path: String,
) -> Result<Vec<VectorSearchResult>, String> {
    let db = connect(&storage_path)
        .execute()
        .await
        .map_err(|e| format!("Failed to connect: {}", e))?;

    let table_name = format!("doc_{}", document_id.replace(|c: char| !c.is_alphanumeric(), "_"));

    let table = db
        .open_table(&table_name)
        .execute()
        .await
        .map_err(|e| format!("Table not found: {}", e))?;

    // Perform vector search
    let mut result_stream = table
        .query()
        .nearest_to(query_embedding)
        .map_err(|e| format!("Query failed: {}", e))?
        .limit(top_k)
        .execute()
        .await
        .map_err(|e| format!("Search failed: {}", e))?;

    let mut search_results = Vec::new();
    
    // Convert results to our format
    while let Some(batch_result) = result_stream.next().await {
        let batch = batch_result.map_err(|e| format!("Batch error: {}", e))?;
        
        let ids = batch.column(0)
            .as_any()
            .downcast_ref::<StringArray>()
            .ok_or("Failed to downcast id column")?;
            
        let texts = batch.column(1)
            .as_any()
            .downcast_ref::<StringArray>()
            .ok_or("Failed to downcast text column")?;
            
        let distances = batch.column_by_name("_distance")
            .ok_or("No distance column")?
            .as_any()
            .downcast_ref::<Float32Array>()
            .ok_or("Failed to downcast distance column")?;

        for i in 0..batch.num_rows() {
            let distance = distances.value(i);
            let score = 1.0 / (1.0 + distance); // Convert L2 distance to score

            search_results.push(VectorSearchResult {
                id: ids.value(i).to_string(),
                text: texts.value(i).to_string(),
                score,
                distance,
            });
        }
    }

    Ok(search_results)
}

#[tauri::command]
pub async fn vector_store_has_document(
    document_id: String,
    storage_path: String,
) -> Result<bool, String> {
    let db = connect(&storage_path)
        .execute()
        .await
        .map_err(|e| format!("Failed to connect: {}", e))?;

    let table_name = format!("doc_{}", document_id.replace(|c: char| !c.is_alphanumeric(), "_"));

    let table_names = db
        .table_names()
        .execute()
        .await
        .map_err(|e| format!("Failed to list tables: {}", e))?;

    Ok(table_names.contains(&table_name))
}

#[tauri::command]
pub async fn vector_store_delete_document(
    document_id: String,
    storage_path: String,
) -> Result<String, String> {
    let db = connect(&storage_path)
        .execute()
        .await
        .map_err(|e| format!("Failed to connect: {}", e))?;

    let table_name = format!("doc_{}", document_id.replace(|c: char| !c.is_alphanumeric(), "_"));

    db.drop_table(&table_name)
        .await
        .map_err(|e| format!("Failed to delete table: {}", e))?;

    Ok(format!("Deleted table: {}", table_name))
}

#[tauri::command]
pub async fn vector_store_clear_all(storage_path: String) -> Result<String, String> {
    let db = connect(&storage_path)
        .execute()
        .await
        .map_err(|e| format!("Failed to connect: {}", e))?;

    let table_names = db
        .table_names()
        .execute()
        .await
        .map_err(|e| format!("Failed to list tables: {}", e))?;

    for table_name in table_names {
        db.drop_table(&table_name)
            .await
            .map_err(|e| format!("Failed to delete table {}: {}", table_name, e))?;
    }

    Ok("Cleared all tables".to_string())
}

#[tauri::command]
pub async fn vector_store_get_count(
    document_id: String,
    storage_path: String,
) -> Result<i64, String> {
    let db = connect(&storage_path)
        .execute()
        .await
        .map_err(|e| format!("Failed to connect: {}", e))?;

    let table_name = format!("doc_{}", document_id.replace(|c: char| !c.is_alphanumeric(), "_"));

    let table = db
        .open_table(&table_name)
        .execute()
        .await
        .map_err(|e| format!("Table not found: {}", e))?;

    let count = table
        .count_rows(None)
        .await
        .map_err(|e| format!("Failed to count rows: {}", e))?;

    Ok(count as i64)
}

