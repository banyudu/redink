# Redink - GitHub Copilot Instructions

## Project Overview

Redink is a Tauri-based desktop application for managing and chatting with ArXiv papers using local LLM models. It features PDF viewing, RAG (Retrieval Augmented Generation) with vector search, and offline-first architecture.

## Core Tech Stack

- **Frontend**: React 18.3, TypeScript 5.6, Vite 6.0
- **Backend**: Rust (Tauri 2), LanceDB 0.22.2
- **Styling**: Tailwind CSS v4.1.8, shadcn/ui components
- **State**: Zustand 4.5 with persistence
- **Routing**: React Router v6
- **i18n**: i18next + react-i18next
- **PDF**: pdfjs-dist 5.3.93, react-pdf 10.1
- **ML**: @xenova/transformers 2.17.2 for embeddings

## Critical File Organization Rule

**IMPORTANT**: All temporary files, documentation, plans, summaries, and analysis documents MUST be placed in `.cursor/` directory:

- `.cursor/plans/` - Planning docs, migration guides, implementation summaries
- `.cursor/notes/` - Development notes, research findings
- `.cursor/analysis/` - Code analysis, architecture docs
- **Never** create temporary markdown files in project root
- **Never** create `.md` files outside `.cursor/` unless they're permanent project docs

## Directory Structure

### Frontend (`src/`)

- `components/` - Reusable UI components (Layout, Navbar, PDFViewer, etc.)
- `components/ui/` - shadcn/ui primitive components (button, card, input, etc.)
- `pages/` - Route pages (Home, Chat, Settings)
- `lib/` - Business logic and utilities (vector-store, rag, embeddings, llm, etc.)
- `store/` - Zustand state management
- `i18n/` - Internationalization configuration
- `types/` - TypeScript type definitions

### Backend (`src-tauri/`)

- `src/` - Rust source code
  - `lib.rs` - Library entry point
  - `main.rs` - Application entry point
  - `vector_store.rs` - LanceDB vector operations
  - `arxiv.rs` - ArXiv paper handling
- `Cargo.toml` - Rust dependencies
- `tauri.conf.json` - Tauri configuration

### Temporary Files

- `.cursor/` - **ALL temporary files, plans, summaries, analysis documents**
- `.cursor/plans/` - Planning documents, migration guides, summaries

## Development Status

- ✅ Complete Tauri application structure
- ✅ React + TypeScript frontend with Vite
- ✅ Tailwind CSS v4 integration with modern styling
- ✅ shadcn/ui component library setup
- ✅ Complete routing and layout system
- ✅ Advanced state management with Zustand + persistence
- ✅ Full i18n support (English/Chinese)
- ✅ Theme support (light/dark) with system detection
- ✅ PDF viewer with advanced features (zoom, navigation)
- ✅ LanceDB 0.22.2 vector database integration
- ✅ RAG (Retrieval Augmented Generation) implementation
- ✅ Hybrid RAG with keyword + vector search
- ✅ Local LLM integration with @xenova/transformers
- ✅ ArXiv paper search and download functionality
- ✅ Vector embeddings and similarity search
- ✅ Recent files management
- ✅ Settings page with model configuration
- ✅ Chat interface with context-aware conversations
- ✅ Auto-updater functionality
- ✅ Cross-platform build system

## Code Style & Conventions

### TypeScript

1. **Strict Mode**: Always use TypeScript strict mode
2. **Import Aliases**: Use `@/*` for imports from `src/` directory
3. **Async/Await**: Prefer async/await over promises
4. **Error Handling**: Always use try-catch for async operations
5. **Type Safety**:
   - Define interfaces for all data structures
   - Use `type` for unions, `interface` for objects
   - Avoid `any` type; use `unknown` if type is truly unknown
6. **Naming Conventions**:
   - Files: kebab-case (`vector-store.ts`, `hybrid-rag.ts`)
   - Components: PascalCase (`PDFViewer.tsx`, `RecentFiles.tsx`)
   - Functions/Variables: camelCase (`addRecentFile`, `currentPaper`)
   - Constants: UPPER_SNAKE_CASE for true constants
   - Interfaces: PascalCase without `I` prefix (`VectorSearchResult`, `AppState`)
7. **Function Documentation**: Use JSDoc for public APIs and complex functions
8. **Console Logging**: Use contextual prefixes `[ComponentName]` or `[ModuleName]`

### React Components

1. Use functional components with hooks
2. Use React.forwardRef for components that need ref forwarding
3. Export components as named exports
4. Follow Rules of Hooks (no conditionals, loops)
5. Custom hooks start with `use` prefix
6. Use Zustand for global state, local state for UI-only state
7. Memoize expensive computations with `useMemo`
8. Use `useCallback` for functions passed as props

### shadcn/ui Components

1. Use `class-variance-authority` (cva) for variant-based styling
2. Use `tailwind-merge` via `cn()` utility for class merging
3. Define clear variant names (default, outline, ghost, destructive)
4. Support size variants (sm, default, lg, icon)
5. Use gradient backgrounds for primary actions
6. Use glass morphism effects for secondary elements
7. Use Radix UI primitives for accessibility
8. Include proper ARIA attributes and keyboard navigation

### Rust (Tauri Backend)

1. Follow standard Rust conventions (rustfmt)
2. Use `Result<T, String>` for Tauri commands
3. Convert errors to strings with `.map_err(|e| format!("...: {}", e))`
4. Annotate with `#[tauri::command]`
5. Use snake_case for function names
6. Accept serializable types (impl Serialize + Deserialize)
7. Use `State<'_, Arc<Mutex<T>>>` for shared state
8. Use tokio for async runtime

## Common Patterns

### Singleton Services

```typescript
export class ServiceName {
  private static instance: ServiceName;
  private constructor() {}

  public static getInstance(): ServiceName {
    if (!ServiceName.instance) {
      ServiceName.instance = new ServiceName();
    }
    return ServiceName.instance;
  }
}

export const serviceName = ServiceName.getInstance();
```

### Zustand Store Pattern

```typescript
interface StoreState {
  someValue: string;
  setSomeValue: (value: string) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      someValue: "default",
      setSomeValue: (value) => set({ someValue: value }),
    }),
    { name: "store-name" }
  )
);
```

### Tauri Command Pattern (Rust)

```rust
#[tauri::command]
pub async fn command_name(
    param: String,
    state: State<'_, Arc<Mutex<StateType>>>,
) -> Result<ReturnType, String> {
    // implementation
    Ok(result)
}
```

### Loading States Pattern

```typescript
const [loading, setLoading] = useState(false);
try {
  setLoading(true);
  // async operation
} catch (error) {
  console.error("[Component]", error);
} finally {
  setLoading(false);
}
```

### Vector Store Usage

```typescript
import { vectorStore } from "@/lib/vector-store";

await vectorStore.initialize();
await vectorStore.addChunks(docId, chunks, embeddings);
const results = await vectorStore.search(docId, queryEmbedding, topK);
```

### Tauri Invoke Pattern

```typescript
import { invoke } from "@tauri-apps/api/core";

try {
  const result = await invoke<ResultType>("command_name", {
    param1: value1,
    param2: value2,
  });
} catch (error) {
  console.error("Command failed:", error);
}
```

## Best Practices

### Performance

1. Lazy load heavy components (PDF viewer, transformers)
2. Memoize expensive computations with `useMemo`
3. Use React.memo for pure components
4. Implement virtual scrolling for long lists
5. Optimize vector embeddings (batch operations)

### Security

1. Validate all user inputs
2. Sanitize file paths before file operations
3. Use Tauri's security features (CSP, permissions)
4. Don't expose sensitive data in error messages

### Offline-First Architecture

1. Store data locally (LanceDB, local cache)
2. Handle network failures gracefully
3. Cache embeddings to avoid recomputation
4. Use local storage path: `~/.cache/redink/`

### Error Handling

1. Always catch and log errors with contextual prefixes `[ComponentName]`
2. Show user-friendly error messages
3. Provide actionable error recovery options
4. Log detailed errors for debugging

## Architecture Principles

1. **Separation of Concerns**: UI components, business logic, and state are separate
2. **Offline First**: All critical features work without network
3. **Type Safety**: Strong typing in both TS and Rust
4. **Performance**: Lazy loading, caching, efficient algorithms
5. **Modularity**: Small, focused modules with clear interfaces
6. **Error Resilience**: Graceful degradation, clear error messages

## Key Technologies Notes

### LanceDB 0.22.2

- Vector database for embeddings
- Uses Arrow arrays for data representation
- Offline storage in `~/.cache/redink/vectors`
- Per-document tables: `doc_{document_id}`

### @xenova/transformers

- Browser-based ML models
- Used for generating embeddings
- Model: all-MiniLM-L6-v2 (384 dimensions)
- Runs in WebWorker for performance

### Tailwind CSS v4

- No config file (uses defaults)
- Import in CSS: `@import "tailwindcss"`
- Use modern CSS features
- Gradient backgrounds for modern UI

## Dependencies to Know

- `@tauri-apps/api`: Tauri frontend APIs
- `@tauri-apps/plugin-*`: Tauri system plugins
- `@radix-ui/*`: Unstyled UI primitives
- `class-variance-authority`: Component variant handling
- `tailwind-merge`: Tailwind class merging utility
- `lucide-react`: Icon library
- `pdfjs-dist`: PDF processing
- `react-pdf`: React PDF viewer component
- `@xenova/transformers`: Browser-based ML models
- `lancedb`: Vector database
- `zustand`: State management
- `react-router-dom`: Client-side routing
- `react-i18next`: Internationalization

## Development Commands

- `pnpm dev`: Start frontend development server
- `pnpm build`: Build frontend for production
- `pnpm tauri dev`: Start full Tauri app in development mode
- `pnpm tauri build`: Build Tauri app for distribution

## Guidelines for Code Generation

When suggesting code for this project:

1. **Always** place temporary files in `.cursor/` directory when creating documentation
2. Maintain type safety across TS-Rust boundary
3. Consider offline-first architecture in design
4. Use existing patterns and components when possible
5. Write clear, maintainable code with proper error handling
6. Include contextual logging with component/module prefixes
7. Use appropriate TypeScript types and interfaces
8. Follow React hooks rules and best practices
9. Implement proper loading states and error boundaries
10. Follow the established naming conventions and file organization
11. Use established patterns for Zustand stores, Tauri commands, and component structure
12. Consider performance implications, especially for vector operations and PDF processing
13. Ensure accessibility and responsive design
14. Support both English and Chinese languages
15. Test Tauri integrations carefully as they involve system APIs
