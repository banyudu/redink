# Hybrid RAG Implementation Guide

## Overview

This document describes the hybrid RAG (Retrieval Augmented Generation) system implemented in Redink. The system combines traditional TF-IDF keyword search with semantic embeddings to provide superior retrieval quality for PDF chat interactions.

## Architecture

### Components

1. **Embedding Service** (`src/lib/embeddings.ts`)
   - Uses transformers.js with all-MiniLM-L6-v2 model
   - Generates 384-dimensional embeddings
   - Runs entirely offline (after initial model download ~22MB)
   - Singleton pattern for efficient resource usage

2. **Vector Store** (`src/lib/vector-store.ts`)
   - Uses ChromaDB for offline vector storage
   - Stores embeddings in `~/.cache/redink/vectors`
   - Supports document-based collections
   - Persistent across app restarts

3. **Enhanced Chunking** (`src/lib/chunking.ts`)
   - Structure-aware parsing (detects sections, titles)
   - Semantic chunking (splits at paragraph boundaries)
   - Sliding window with overlap
   - Hierarchical chunking support

4. **Hybrid RAG Engine** (`src/lib/hybrid-rag.ts`)
   - Combines TF-IDF and semantic search
   - Reciprocal Rank Fusion (RRF) and weighted fusion
   - Configurable weights (default: 40% TF-IDF, 60% semantic)
   - Intelligent caching

5. **Cache Manager** (`src/lib/rag-cache.ts`)
   - Caches document metadata
   - Tracks embedding cache
   - Automatic old cache cleanup
   - Cache validation via text hashing

## System Flow

```
PDF Document
    ↓
Text Extraction (pdf.ts)
    ↓
Enhanced Chunking (chunking.ts)
    ├→ TF-IDF Index (rag.ts) [In-memory]
    └→ Semantic Embeddings (embeddings.ts)
           ↓
       Vector Store (vector-store.ts) [Persistent]
           ↓
    Hybrid RAG Index
           ↓
Query → Hybrid Search
    ├→ TF-IDF Results (keyword match)
    └→ Semantic Results (concept match)
           ↓
    Fusion (RRF or Weighted)
           ↓
    Top-K Results → LLM Context
```

## Usage

### Basic Usage

```typescript
import { hybridRAG } from './lib/hybrid-rag';

// 1. Build index for a document
const documentId = 'unique-doc-id';
const pdfText = '...extracted text...';

const index = await hybridRAG.buildIndex(documentId, pdfText, {
  chunkStrategy: 'semantic', // or 'sliding', 'hierarchical'
  forceRebuild: false, // Use cache if available
});

// 2. Search
const results = await hybridRAG.search(documentId, 'What is machine learning?', {
  topK: 5,
  tfidfWeight: 0.4,
  semanticWeight: 0.6,
  fusionMethod: 'weighted', // or 'rrf'
});

// 3. Use results
for (const result of results) {
  console.log(`Chunk: ${result.chunk.text}`);
  console.log(`TF-IDF: ${result.tfidfScore}, Semantic: ${result.semanticScore}`);
  console.log(`Fused: ${result.fusedScore}, Rank: ${result.rank}`);
}
```

### Configuration Options

#### Chunking Strategies

- **semantic**: Splits at paragraph boundaries, respects document structure (recommended)
- **sliding**: Sliding window with overlap for continuous context
- **hierarchical**: Parent-child relationships for multi-level retrieval

#### Fusion Methods

- **weighted**: Weighted average of TF-IDF and semantic scores
  - Default: 40% TF-IDF, 60% semantic
  - Adjust based on your use case
  
- **rrf**: Reciprocal Rank Fusion
  - Combines rankings rather than scores
  - More robust to score scale differences

#### Search Parameters

```typescript
{
  topK: 5,                    // Number of results to return
  tfidfWeight: 0.4,          // Weight for TF-IDF (0-1)
  semanticWeight: 0.6,       // Weight for semantic (0-1)
  fusionMethod: 'weighted',  // 'weighted' or 'rrf'
  tfidfCandidates: 15,       // Candidates from TF-IDF
  semanticCandidates: 15,    // Candidates from semantic
}
```

## Performance Characteristics

### Initial Index Build

| Document Size | Chunking | TF-IDF | Embeddings | Total |
|---------------|----------|--------|------------|-------|
| 10 pages      | ~0.5s    | ~0.1s  | ~2-4s      | ~3-5s |
| 50 pages      | ~2s      | ~0.5s  | ~10-15s    | ~13-18s |
| 100 pages     | ~4s      | ~1s    | ~20-30s    | ~25-35s |

*Note: Embeddings are cached, subsequent loads are instant*

### Query Performance

| Operation | Time |
|-----------|------|
| TF-IDF Search | 10-50ms |
| Semantic Search | 50-200ms |
| Fusion | 5-10ms |
| **Total Query** | **100-300ms** |

### Storage

- **Model**: 22MB (downloaded once)
- **Per Document**: ~1-5MB (depends on document size)
- **Cache**: Minimal (~100KB per document metadata)

## Cache Management

### Cache Location

```
~/.cache/redink/
├── vectors/          # ChromaDB vector storage
│   └── doc_*         # Per-document collections
├── embeddings/       # (Future: embedding cache)
└── metadata/         # Document metadata
    └── documents.json
```

### Cache Invalidation

The system automatically detects document changes via text hashing:

```typescript
// Document changed? Rebuild index
const textHash = hashText(pdfText);
if (!ragCache.isDocumentCacheValid(documentId, textHash)) {
  await hybridRAG.buildIndex(documentId, pdfText, { forceRebuild: true });
}
```

### Cache Cleanup

```typescript
// Clear old cache entries (>30 days)
await ragCache.clearOldCache();

// Clear specific document
await hybridRAG.deleteIndex(documentId);

// Clear all (for testing)
await hybridRAG.clearAll();
```

## Optimization Tips

### 1. Tune Fusion Weights

Different document types benefit from different weights:

```typescript
// Technical/specific terms → Higher TF-IDF weight
{ tfidfWeight: 0.6, semanticWeight: 0.4 }

// Concept-heavy queries → Higher semantic weight
{ tfidfWeight: 0.3, semanticWeight: 0.7 }

// Balanced (default)
{ tfidfWeight: 0.4, semanticWeight: 0.6 }
```

### 2. Adjust Chunk Sizes

```typescript
// Smaller chunks for specific retrieval
smartChunk(text, 'semantic', { targetSize: 500 });

// Larger chunks for more context
smartChunk(text, 'semantic', { targetSize: 1200 });

// Default (recommended)
smartChunk(text, 'semantic', { targetSize: 800 });
```

### 3. Use Caching Effectively

```typescript
// Don't force rebuild unless necessary
const index = await hybridRAG.buildIndex(documentId, text, {
  forceRebuild: false, // Use cache
});

// Only rebuild if document changed
if (documentUpdated) {
  await hybridRAG.buildIndex(documentId, text, {
    forceRebuild: true,
  });
}
```

## Troubleshooting

### Model Download Issues

```typescript
// Check initialization
const service = embeddingService;
await service.initialize();
console.log('Model loaded:', service.isInitialized());
```

### ChromaDB Connection Issues

```typescript
// Check vector store
const store = vectorStore;
await store.initialize();
console.log('Storage path:', store.getStoragePath());
```

### Poor Search Results

1. **Check if semantic index exists**:
   ```typescript
   const index = hybridRAG.getIndex(documentId);
   console.log('Has semantic:', index?.hasSemanticIndex);
   ```

2. **Try different fusion methods**:
   ```typescript
   // Try RRF instead of weighted
   const results = await hybridRAG.search(documentId, query, {
     fusionMethod: 'rrf',
   });
   ```

3. **Adjust weights**:
   ```typescript
   // More emphasis on semantic
   const results = await hybridRAG.search(documentId, query, {
     tfidfWeight: 0.3,
     semanticWeight: 0.7,
   });
   ```

## API Reference

### HybridRAG

```typescript
class HybridRAG {
  buildIndex(documentId: string, text: string, options?): Promise<HybridRagIndex>
  search(documentId: string, query: string, options?): Promise<HybridSearchResult[]>
  getIndex(documentId: string): HybridRagIndex | undefined
  hasIndex(documentId: string): boolean
  deleteIndex(documentId: string): Promise<void>
  clearAll(): Promise<void>
  getStats(documentId: string): IndexStats | null
}
```

### EmbeddingService

```typescript
class EmbeddingService {
  initialize(): Promise<void>
  embed(text: string): Promise<number[]>
  embedBatch(texts: string[], batchSize?: number): Promise<number[][]>
  isInitialized(): boolean
  getDimension(): number
  getModelName(): string
}
```

### VectorStore

```typescript
class VectorStore {
  initialize(): Promise<void>
  addChunks(documentId: string, chunks: TextChunk[], embeddings: number[][]): Promise<void>
  search(documentId: string, queryEmbedding: number[], topK?: number): Promise<VectorSearchResult[]>
  hasDocument(documentId: string): Promise<boolean>
  deleteDocument(documentId: string): Promise<void>
  clearAll(): Promise<void>
}
```

## Future Enhancements

### Planned Features

1. **Re-Ranking Layer**
   - Add Cohere re-rank API support
   - Local cross-encoder models
   - Expected: +20-30% precision improvement

2. **Query Transformation**
   - Multi-query generation
   - HyDE (Hypothetical Document Embeddings)
   - Step-back prompting

3. **Advanced Chunking**
   - PDF structure parsing (figures, tables, equations)
   - Citation extraction
   - Section-aware retrieval

4. **Performance Optimizations**
   - WebAssembly SIMD for embeddings
   - Quantized models for faster inference
   - Streaming embeddings

## Contributing

When adding new features:

1. Update this documentation
2. Add tests for new functionality
3. Ensure backward compatibility
4. Update the analysis document

## References

- [Transformers.js Documentation](https://huggingface.co/docs/transformers.js)
- [ChromaDB Documentation](https://docs.trychroma.com)
- [RAG Best Practices](https://www.promptingguide.ai/techniques/rag)
- [Reciprocal Rank Fusion Paper](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf)

