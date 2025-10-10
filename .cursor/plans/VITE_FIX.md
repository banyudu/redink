# Vite Configuration Fix for LanceDB

## Problem
Error: "No loader is configured for '.node' files"

This occurs because LanceDB uses native Node.js addons (`.node` files) that Vite doesn't know how to bundle.

## Solution

Updated `vite.config.ts` to properly handle native modules in Tauri:

### Changes Made

1. **Exclude from optimization**: Tell Vite not to pre-bundle LanceDB
   ```typescript
   optimizeDeps: {
     exclude: ['@lancedb/lancedb'],
   }
   ```

2. **Mark as external**: Tell Rollup not to bundle native modules
   ```typescript
   build: {
     rollupOptions: {
       external: [
         '@lancedb/lancedb',
         '@lancedb/lancedb-darwin-arm64',  // macOS ARM
         '@lancedb/lancedb-darwin-x64',    // macOS Intel
         '@lancedb/lancedb-linux-arm64-gnu',
         '@lancedb/lancedb-linux-x64-gnu',
         '@lancedb/lancedb-win32-x64-msvc',
       ],
     },
   }
   ```

## How It Works

- **Development**: LanceDB is loaded directly from node_modules by Tauri's Node.js runtime
- **Production**: Native modules are packaged separately by Tauri, not by Vite
- **Cross-platform**: All platform-specific binaries are marked as external

## Testing

Run the dev server:
```bash
pnpm dev
```

You should now see the app start without the `.node` file error.

## Why This Works

In Tauri apps:
- Frontend (Vite): Bundles React/TypeScript code
- Backend (Node.js): Handles native modules like LanceDB
- By marking LanceDB as external, we tell Vite "don't bundle this, Node.js will handle it"

This is the standard approach for native Node.js modules in Tauri applications.

