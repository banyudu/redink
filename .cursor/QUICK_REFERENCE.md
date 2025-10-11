# Redink - Quick Reference Guide

This guide provides quick access to common patterns, commands, and examples for working with Redink.

## Table of Contents
- [Common Commands](#common-commands)
- [Code Patterns](#code-patterns)
- [File Locations](#file-locations)
- [Troubleshooting](#troubleshooting)

## Common Commands

### Development
```bash
# Start frontend dev server only
pnpm dev

# Start full Tauri app in dev mode
pnpm tauri dev

# Build frontend
pnpm build

# Build Tauri app (production)
pnpm tauri build
```

### Package Management
```bash
# Install dependencies
pnpm install

# Add frontend dependency
pnpm add <package>

# Add dev dependency
pnpm add -D <package>

# Update dependencies
pnpm update
```

### Rust/Cargo
```bash
# Build Rust backend
cd src-tauri && cargo build

# Run tests
cd src-tauri && cargo test

# Format code
cd src-tauri && cargo fmt

# Check for errors
cd src-tauri && cargo check
```

## Code Patterns

### Creating a New Component

```typescript
// src/components/MyComponent.tsx
import React from 'react';
import { cn } from '@/lib/utils';

interface MyComponentProps {
  title: string;
  onAction?: () => void;
  className?: string;
}

export const MyComponent: React.FC<MyComponentProps> = ({
  title,
  onAction,
  className
}) => {
  return (
    <div className={cn('p-4 rounded-md', className)}>
      <h2 className="text-xl font-semibold">{title}</h2>
      {onAction && (
        <button onClick={onAction}>Action</button>
      )}
    </div>
  );
};
```

### Creating a New Page

```typescript
// src/pages/MyPage.tsx
import React from 'react';
import { useAppStore } from '@/store';
import { Layout } from '@/components/Layout';

export const MyPage: React.FC = () => {
  const { theme } = useAppStore();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">My Page</h1>
      {/* Page content */}
    </div>
  );
};

// Add route in src/App.tsx:
// <Route path="/mypage" element={<MyPage />} />
```

### Adding Zustand State

```typescript
// src/store/index.ts
interface AppState {
  // ... existing state
  myNewState: string;
  setMyNewState: (value: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // ... existing state
      myNewState: 'default',
      setMyNewState: (value) => set({ myNewState: value }),
    }),
    {
      name: 'redink-storage',
    }
  )
);
```

### Creating a Tauri Command

```rust
// src-tauri/src/lib.rs or module file
use tauri::State;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct MyData {
    pub id: String,
    pub value: i32,
}

#[tauri::command]
pub async fn my_command(
    input: String,
    state: State<'_, Arc<Mutex<MyState>>>,
) -> Result<MyData, String> {
    // Process input
    let result = MyData {
        id: input,
        value: 42,
    };
    
    Ok(result)
}

// Register in src-tauri/src/lib.rs:
// .invoke_handler(tauri::generate_handler![my_command])
```

### Invoking Tauri Command from Frontend

```typescript
// src/lib/my-service.ts
import { invoke } from '@tauri-apps/api/core';

interface MyData {
  id: string;
  value: number;
}

export async function callMyCommand(input: string): Promise<MyData> {
  try {
    const result = await invoke<MyData>('my_command', { input });
    console.log('[MyService] Command succeeded:', result);
    return result;
  } catch (error) {
    console.error('[MyService] Command failed:', error);
    throw error;
  }
}
```

### Creating a shadcn/ui Component

```typescript
// src/components/ui/my-element.tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const myElementVariants = cva(
  "base-classes-here",
  {
    variants: {
      variant: {
        default: "default-classes",
        secondary: "secondary-classes",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3",
        lg: "h-12 px-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface MyElementProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof myElementVariants> {
  // Additional props
}

const MyElement = React.forwardRef<HTMLDivElement, MyElementProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <div
        className={cn(myElementVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
MyElement.displayName = "MyElement"

export { MyElement, myElementVariants }
```

### Using Vector Store

```typescript
// In any component or service
import { vectorStore } from '@/lib/vector-store';

async function setupVectorSearch() {
  // Initialize (automatically done on first use)
  await vectorStore.initialize();
  
  // Add chunks with embeddings
  await vectorStore.addChunks(documentId, chunks, embeddings);
  
  // Search
  const results = await vectorStore.search(documentId, queryEmbedding, 5);
  
  // Check if document exists
  const exists = await vectorStore.hasDocument(documentId);
  
  // Get count
  const count = await vectorStore.getCollectionCount(documentId);
  
  // Delete document
  await vectorStore.deleteDocument(documentId);
}
```

### Error Handling Pattern

```typescript
async function performOperation() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  try {
    setLoading(true);
    setError(null);
    
    const result = await someAsyncOperation();
    
    // Handle success
    console.log('[Component] Operation succeeded:', result);
    return result;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Component] Operation failed:', err);
    setError(errorMessage);
    
    // Show user-friendly message
    // toast.error(errorMessage);
  } finally {
    setLoading(false);
  }
}
```

## File Locations

### Key Configuration Files
- `package.json` - Frontend dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Vite bundler configuration
- `postcss.config.cjs` - PostCSS/Tailwind configuration
- `src-tauri/Cargo.toml` - Rust dependencies
- `src-tauri/tauri.conf.json` - Tauri app configuration

### Important Source Files
- `src/App.tsx` - Main application component with routing
- `src/main.tsx` - Application entry point
- `src/store/index.ts` - Global state management
- `src/lib/vector-store.ts` - Vector database interface
- `src/lib/rag.ts` - RAG implementation
- `src/lib/embeddings.ts` - Embedding generation
- `src-tauri/src/lib.rs` - Rust library entry point
- `src-tauri/src/vector_store.rs` - LanceDB operations

### Storage Locations
- `~/.cache/redink/vectors` - LanceDB vector storage
- Browser localStorage - Zustand persisted state

## Troubleshooting

### Common Issues

#### 1. TypeScript Path Alias Not Working
```typescript
// Use @ alias consistently
import { Button } from '@/components/ui/button'
// Not: import { Button } from '../components/ui/button'
```

#### 2. Tauri Command Not Found
```rust
// Make sure command is registered in lib.rs:
.invoke_handler(tauri::generate_handler![
    vector_store_initialize,
    vector_store_add_chunks,
    // ... add your command here
])
```

#### 3. LanceDB Connection Error
```typescript
// Ensure storage path is initialized
await vectorStore.initialize();
// Check that ~/.cache/redink/vectors exists
```

#### 4. Vector Dimension Mismatch
```typescript
// all-MiniLM-L6-v2 model produces 384-dimensional vectors
// Ensure all vectors have same dimension
console.log('Vector dimension:', embedding.length); // Should be 384
```

#### 5. React State Not Updating
```typescript
// Zustand handles immutability automatically
const { setValue } = useAppStore();
setValue(newValue); // ✅ Correct

// Don't mutate directly
const { value } = useAppStore();
value.property = newValue; // ❌ Wrong
```

#### 6. Styling Not Applied
```typescript
// Use cn() utility to merge classes
import { cn } from '@/lib/utils';

<div className={cn('base-class', className)} />
// Not: <div className={`base-class ${className}`} />
```

### Debug Tips

#### Frontend Debugging
```typescript
// Console logging with context
console.log('[ComponentName] Event:', data);
console.error('[ComponentName] Error:', error);

// Check Zustand state
const state = useAppStore.getState();
console.log('Current state:', state);

// Monitor store changes
useAppStore.subscribe(console.log);
```

#### Backend Debugging
```rust
// Print debugging
println!("[CommandName] Processing: {:?}", input);
eprintln!("[CommandName] Error: {:?}", error);

// Use Result for error propagation
.map_err(|e| format!("Operation failed: {}", e))?
```

#### Tauri IPC Debugging
```typescript
// Log invoke calls
console.log('[Tauri] Invoking command:', commandName, params);
const result = await invoke(commandName, params);
console.log('[Tauri] Command result:', result);
```

## Quick Checks

### Before Committing
- [ ] TypeScript compiles without errors
- [ ] No console errors in browser
- [ ] Rust code builds successfully
- [ ] Tauri commands work as expected
- [ ] UI looks correct in light and dark modes
- [ ] New files follow naming conventions
- [ ] Temporary docs are in `.cursor/` directory

### Before Creating PR
- [ ] All tests pass (when implemented)
- [ ] Code follows project conventions
- [ ] New features are documented
- [ ] Dependencies are up to date
- [ ] No unnecessary dependencies added
- [ ] Error handling is comprehensive

## Resources

### Official Documentation
- [Tauri v2 Docs](https://tauri.app/v2/)
- [React 18 Docs](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [LanceDB](https://lancedb.github.io/lancedb/)

### Project Resources
- `.cursorrules` - Comprehensive project guidelines
- `.cursor/README.md` - Temporary files directory info
- `.cursor/plans/` - Implementation plans and guides
- `README.md` - Project overview and setup

## Keyboard Shortcuts

### VS Code/Cursor
- `Cmd/Ctrl + P` - Quick file open
- `Cmd/Ctrl + Shift + P` - Command palette
- `Cmd/Ctrl + Click` - Go to definition
- `Cmd/Ctrl + Space` - Trigger suggestions
- `F2` - Rename symbol

### Chrome DevTools
- `Cmd/Ctrl + Shift + C` - Inspect element
- `Cmd/Ctrl + Shift + J` - Open console
- `Cmd/Ctrl + R` - Reload page
- `Cmd/Ctrl + Shift + R` - Hard reload

---

Last Updated: October 2025

