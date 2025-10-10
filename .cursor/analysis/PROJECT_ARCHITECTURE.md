# Redink Project Architecture

Last Updated: October 10, 2025

## Overview

Redink is a desktop application built with Tauri 2, combining a React frontend with a Rust backend. The application enables users to manage and chat with ArXiv papers using local LLM models with RAG (Retrieval Augmented Generation) capabilities.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Desktop Application                  │
│                        (Tauri 2)                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────┐      ┌────────────────────┐    │
│  │   React Frontend   │◄────►│   Rust Backend     │    │
│  │   (TypeScript)     │ IPC  │   (Tauri Core)     │    │
│  └────────────────────┘      └────────────────────┘    │
│           │                            │                │
│           ▼                            ▼                │
│  ┌────────────────────┐      ┌────────────────────┐    │
│  │  UI Components     │      │  Vector Store      │    │
│  │  State Management  │      │  (LanceDB)         │    │
│  │  PDF Viewer        │      │  File System       │    │
│  │  ML Models         │      │  HTTP Client       │    │
│  └────────────────────┘      └────────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   Local Storage      │
              │  ~/.cache/redink/    │
              └──────────────────────┘
```

## Frontend Architecture

### Technology Stack
- **Framework**: React 18.3 with TypeScript 5.6
- **Build Tool**: Vite 6.0
- **Styling**: Tailwind CSS v4.1.8
- **UI Components**: shadcn/ui (Radix UI primitives)
- **State Management**: Zustand 4.5 with persistence
- **Routing**: React Router v6
- **Internationalization**: i18next + react-i18next
- **PDF Processing**: pdfjs-dist 5.3.93, react-pdf 10.1
- **ML/Embeddings**: @xenova/transformers 2.17.2

### Directory Structure
```
src/
├── components/          # UI Components
│   ├── Layout.tsx       # Main layout wrapper
│   ├── Navbar.tsx       # Navigation bar
│   ├── PDFViewer.tsx    # PDF document viewer
│   ├── RecentFiles.tsx  # Recent files list
│   └── ui/              # shadcn/ui primitives
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       └── ...
├── pages/               # Route pages
│   ├── Home.tsx         # Home/landing page
│   ├── Chat.tsx         # Chat with papers
│   └── Settings.tsx     # Application settings
├── lib/                 # Business logic
│   ├── vector-store.ts  # LanceDB interface
│   ├── rag.ts           # RAG implementation
│   ├── hybrid-rag.ts    # Hybrid RAG (semantic + keyword)
│   ├── embeddings.ts    # Embedding generation
│   ├── llm.ts           # LLM integration
│   ├── pdf.ts           # PDF processing
│   ├── arxiv.ts         # ArXiv API client
│   ├── chunking.ts      # Text chunking
│   ├── storage.ts       # Local storage
│   ├── cache.ts         # Cache management
│   └── utils.ts         # Utilities
├── store/               # State management
│   └── index.ts         # Zustand store
├── i18n/                # Internationalization
│   └── index.ts         # i18n configuration
├── types/               # TypeScript types
│   └── tauri-plugin-dialog.d.ts
├── App.tsx              # Main app component
├── main.tsx             # Entry point
└── index.css            # Global styles
```

### Data Flow

1. **User Interaction** → React Components
2. **State Updates** → Zustand Store (persisted to localStorage)
3. **Business Logic** → lib/ modules
4. **Backend Calls** → Tauri IPC (invoke API)
5. **ML Processing** → @xenova/transformers (WebWorker)

### State Management

```typescript
// Global state with Zustand
interface AppState {
  theme: 'light' | 'dark';
  language: 'en' | 'zh';
  currentPaper: string | null;
  selectedModel: string;
  recentFiles: RecentFile[];
  chatHistory: ChatMessage[];
  // ... actions
}
```

State is persisted to browser localStorage and survives app restarts.

## Backend Architecture

### Technology Stack
- **Framework**: Tauri 2
- **Language**: Rust 2021 edition
- **Vector Database**: LanceDB 0.22.2
- **Async Runtime**: tokio
- **Data Formats**: Arrow (arrow-array, arrow-schema)
- **Serialization**: serde, serde_json

### Directory Structure
```
src-tauri/
├── src/
│   ├── lib.rs           # Library entry, command registration
│   ├── main.rs          # Application entry
│   └── vector_store.rs  # LanceDB operations
├── Cargo.toml           # Dependencies
└── tauri.conf.json      # Tauri configuration
```

### Tauri Commands (IPC Interface)

```rust
// Vector Store Commands
vector_store_initialize(storage_path) -> Result<String>
vector_store_add_chunks(document_id, chunks, storage_path) -> Result<String>
vector_store_search(document_id, query_embedding, top_k, storage_path) -> Result<Vec<VectorSearchResult>>
vector_store_has_document(document_id, storage_path) -> Result<bool>
vector_store_delete_document(document_id, storage_path) -> Result<String>
vector_store_clear_all(storage_path) -> Result<String>
vector_store_get_count(document_id, storage_path) -> Result<i64>
```

### Data Models

```rust
// Rust side
pub struct VectorSearchResult {
    pub id: String,
    pub text: String,
    pub score: f32,
    pub distance: f32,
}

pub struct ChunkData {
    pub id: String,
    pub text: String,
    pub vector: Vec<f32>,
    pub chunk_index: i32,
    pub text_length: i32,
}
```

```typescript
// TypeScript side (matching)
interface VectorSearchResult {
  id: string;
  text: string;
  score: number;
  distance: number;
}
```

## Vector Store (LanceDB)

### Architecture

LanceDB is used as an embedded vector database for storing document embeddings and performing similarity search.

```
Storage: ~/.cache/redink/vectors/
├── doc_<document_id>/       # Per-document tables
│   ├── data files
│   └── metadata
└── ...
```

### Data Schema

Each document table contains:
- `id` (String): Chunk identifier
- `text` (String): Chunk text content
- `vector` (FixedSizeList<Float32>[384]): Embedding vector
- `chunk_index` (Int32): Chunk order index
- `text_length` (Int32): Character count

### Operations

1. **Insert**: Create table, convert chunks to Arrow format, insert batch
2. **Search**: Perform L2 distance-based nearest neighbor search
3. **Query**: Retrieve top-k most similar chunks
4. **Delete**: Drop entire document table

### Vector Dimension
- Model: all-MiniLM-L6-v2
- Dimension: 384 (fixed)
- Distance Metric: L2 (Euclidean)

## RAG (Retrieval Augmented Generation)

### Hybrid RAG Architecture

Combines two retrieval strategies:

1. **Semantic Search** (Vector-based)
   - Uses embeddings for meaning-based similarity
   - Query → Embedding → Vector Search → Results

2. **Keyword Search** (BM25-like)
   - Uses term frequency for exact matches
   - Query → Keywords → Text Search → Results

3. **Fusion** (Reciprocal Rank Fusion)
   - Combines and re-ranks results from both methods
   - Balances semantic understanding with keyword precision

### RAG Flow

```
User Query
    ↓
1. Generate Query Embedding
    ↓
2. Perform Vector Search (Semantic)
    ↓
3. Perform Keyword Search (TF-IDF/BM25)
    ↓
4. Fuse Results (RRF)
    ↓
5. Build Context from Top Chunks
    ↓
6. Generate Prompt with Context
    ↓
7. Call LLM
    ↓
Response to User
```

### Text Chunking Strategy

- **Chunk Size**: 500 characters (configurable)
- **Overlap**: 100 characters (prevents context loss)
- **Sentence Preservation**: Uses compromise library for sentence boundaries
- **Metadata**: Preserves chunk index and length

## PDF Processing

### Pipeline

```
PDF File
    ↓
1. Load PDF (pdfjs-dist)
    ↓
2. Extract Text per Page
    ↓
3. Combine Pages
    ↓
4. Text Chunking
    ↓
5. Generate Embeddings (per chunk)
    ↓
6. Store in Vector DB
```

### Rendering

- Uses react-pdf for display
- Server-side rendering via PDF.js worker
- Canvas-based rendering for performance

## Embeddings

### Model: all-MiniLM-L6-v2

- **Type**: Sentence transformer
- **Dimension**: 384
- **Language**: English (multilingual support)
- **Runtime**: Browser-based (via @xenova/transformers)
- **Execution**: WebWorker (non-blocking)

### Generation Process

```typescript
// Initialize model
const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

// Generate embedding
const output = await extractor(text, { pooling: 'mean', normalize: true });
const embedding = Array.from(output.data); // 384-dimensional vector
```

## LLM Integration

### Supported Models

- Local LLMs via Ollama (default)
- Configurable model selection
- Default: llama3.2:latest

### API Interface

```typescript
interface LLMRequest {
  model: string;
  prompt: string;
  context: string[];
  temperature?: number;
}
```

## Storage Architecture

### Local Storage Hierarchy

```
~/.cache/redink/
├── vectors/              # LanceDB vector storage
│   ├── doc_xxx/
│   └── ...
└── (future)
    ├── cache/            # Response cache
    ├── models/           # Downloaded models
    └── documents/        # Cached PDFs
```

### Browser Storage

- **localStorage**: Zustand persisted state
- **IndexedDB**: (Future) Large document cache
- **Session**: Temporary UI state

## Communication Patterns

### Frontend ↔ Backend (Tauri IPC)

```typescript
// Frontend: Invoke command
import { invoke } from '@tauri-apps/api/core';

const result = await invoke<ResultType>('command_name', {
  param1: value1,
  param2: value2,
});
```

```rust
// Backend: Handle command
#[tauri::command]
pub async fn command_name(
    param1: Type1,
    param2: Type2,
) -> Result<ResultType, String> {
    // Implementation
    Ok(result)
}
```

### Component Communication

1. **Props**: Parent → Child data flow
2. **Callbacks**: Child → Parent events
3. **Context**: Deep prop drilling alternative
4. **Zustand**: Global state sharing

## Security Considerations

### Tauri Security

- **CSP**: Content Security Policy enforced
- **Allowlist**: Only allowed APIs accessible
- **IPC**: Type-safe command interface
- **File Access**: Restricted to allowed paths

### Data Security

- **Local Storage**: All data stored locally
- **No Cloud Sync**: Privacy-first approach
- **Input Validation**: All user inputs validated
- **Path Sanitization**: File paths sanitized

## Performance Optimizations

### Frontend

1. **Code Splitting**: Lazy load routes and heavy components
2. **React.memo**: Memoize pure components
3. **useMemo/useCallback**: Prevent unnecessary re-renders
4. **WebWorker**: ML model execution off main thread
5. **Virtual Scrolling**: For long lists (future)

### Backend

1. **Async/Await**: Non-blocking operations
2. **Batch Operations**: Process chunks in batches
3. **Connection Pooling**: Reuse LanceDB connections
4. **Lazy Initialization**: Initialize resources on demand

### Storage

1. **Incremental Loading**: Load documents progressively
2. **Embedding Cache**: Cache generated embeddings
3. **Query Cache**: Cache frequent searches (future)

## Testing Strategy (Future)

### Frontend Tests

- **Unit**: lib/ functions, utilities
- **Component**: React component testing
- **Integration**: Page-level tests
- **E2E**: User flow testing

### Backend Tests

- **Unit**: Rust functions
- **Integration**: Tauri commands
- **Performance**: Vector search benchmarks

## Development Workflow

### Local Development

```bash
# Terminal 1: Frontend dev server
pnpm dev

# Terminal 2: Tauri app
pnpm tauri dev
```

### Build Process

```bash
# Frontend build
pnpm build
  ↓
# Tauri collects frontend assets
  ↓
# Rust compilation
cargo build --release
  ↓
# Bundle creation
tauri build
  ↓
# Platform-specific installers
```

## Deployment

### Platforms

- macOS (.dmg, .app)
- Windows (.exe, .msi)
- Linux (.AppImage, .deb)

### Distribution

- Direct download (future)
- Auto-update support (Tauri built-in)

## Future Enhancements

### Planned Features

1. **Cloud Sync** (Optional)
   - Encrypted cloud storage
   - Cross-device synchronization
   
2. **Advanced RAG**
   - Multi-document queries
   - Graph-based retrieval
   - Citation tracking

3. **Annotation System**
   - Highlight PDFs
   - Take notes
   - Organize references

4. **Collaboration**
   - Share papers
   - Collaborative annotations
   - Discussion threads

5. **Advanced Search**
   - Full-text search
   - Metadata filtering
   - Tag system

## Dependencies

### Critical Dependencies

- **Tauri**: Desktop framework
- **React**: UI framework
- **LanceDB**: Vector database
- **@xenova/transformers**: ML models
- **pdfjs-dist**: PDF rendering
- **Zustand**: State management
- **Tailwind CSS**: Styling

### Update Policy

- Regular security updates
- Feature updates when stable
- Breaking changes documented in CHANGELOG

## Performance Metrics (Target)

- **Startup Time**: < 2 seconds
- **PDF Load**: < 1 second
- **Embedding Generation**: < 500ms per chunk
- **Vector Search**: < 100ms
- **LLM Response**: Depends on model (2-10s typical)

## Troubleshooting

See `.cursor/QUICK_REFERENCE.md` for common issues and solutions.

## References

- [Tauri Documentation](https://tauri.app/v2/)
- [LanceDB Documentation](https://lancedb.github.io/lancedb/)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

This architecture document should be updated as the system evolves.

