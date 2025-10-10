# Hybrid RAG Testing Guide

## Quick Start

### 1. Install Dependencies

```bash
cd /Users/banyudu/dev/yudu/redink
pnpm install
```

### 2. Start the Application

```bash
pnpm dev
```

This will:
- Start Vite dev server
- Launch Tauri application
- Open the app window

### 3. Load a PDF

1. Click "Upload PDF" or select from recent files
2. Wait for indexing to complete (progress shown in console)
3. Look for the **"Hybrid RAG"** badge with sparkle icon ✨

### 4. Test Queries

Try these example queries to test different aspects:

#### Exact Keyword Matching (TF-IDF Strong)
- "What is the abstract?"
- "Find references to 'neural network'"
- "What page mentions 'methodology'?"

#### Concept/Semantic Matching (Semantic Strong)
- "How does the system learn?"
- "What machine learning approach was used?"
- "Explain the main contribution"

#### Hybrid (Both Working Together)
- "What techniques improve performance?"
- "How was the experiment designed?"
- "What are the key findings?"

## Detailed Testing

### Test 1: Verify Installation

Open browser console (in dev mode) and check for:

```
[Embeddings] Initializing embedding model: Xenova/all-MiniLM-L6-v2
[Embeddings] Model loaded successfully
[VectorStore] Storage path: /Users/banyudu/.cache/redink/vectors
[VectorStore] ChromaDB client initialized
[HybridRAG] Building hybrid index for: <document-id>
```

### Test 2: Verify Chunking

After loading a PDF, check console for:

```
[HybridRAG] Chunking with strategy: semantic
[HybridRAG] Created XX chunks
[HybridRAG] Building TF-IDF index...
[HybridRAG] Generating embeddings for chunks...
```

### Test 3: Verify Search

Ask a question and check console for:

```
[Chat] Searching for: <your question>
[HybridRAG] Running TF-IDF search...
[HybridRAG] Running semantic search...
[HybridRAG] Fusing results (method: weighted)...
[Chat] Search results: 5
```

### Test 4: Verify Caching

1. Load a PDF (will take 5-35s)
2. Close and reopen app
3. Load the same PDF
4. Should be instant! Check console for:

```
[HybridRAG] Loading from cache: <document-id>
```

### Test 5: Compare Results

Load a research paper and try:

**Question**: "What machine learning techniques were used?"

**Expected without Hybrid RAG** (old system):
- Might miss mentions of "neural networks", "deep learning", etc.
- Only finds exact phrase "machine learning"

**Expected with Hybrid RAG** (new system):
- Finds related concepts even without exact keywords
- Better context understanding
- More comprehensive answer

## Performance Benchmarks

### Test Document Sizes

| Document | Pages | Expected Index Time | Storage |
|----------|-------|-------------------|---------|
| Small paper | 5-10 | 3-5s | ~500KB |
| Medium paper | 20-50 | 10-18s | ~2MB |
| Large paper | 100+ | 25-35s | ~5MB |

### Query Performance

Run 10 queries and measure average time:

```typescript
// In browser console
const times = [];
for (let i = 0; i < 10; i++) {
  const start = performance.now();
  // Ask a question
  const end = performance.now();
  times.push(end - start);
}
console.log('Average query time:', times.reduce((a,b)=>a+b)/times.length, 'ms');
```

Expected: 100-300ms per query

## Visual Verification

### UI Elements to Check

1. **Header Badge**
   - Look for "Hybrid RAG" badge with sparkle icon
   - Should appear after successful indexing
   - Blue color indicates semantic search active

2. **Status Messages**
   - "Loading Document" during PDF extraction
   - "Processing Document for AI chat..." during indexing
   - "Ready to chat!" when complete

3. **Search Feedback**
   - Debug info in chat (TF-IDF and Semantic scores)
   - Example: `[Hybrid Search: TF-IDF=0.234, Semantic=0.789]`

4. **Input Placeholder**
   - Should show "Ask about the paper..." when ready
   - Shows "Processing document..." during indexing

## Debugging

### Check Model Download

```typescript
// In browser console
import { embeddingService } from './src/lib/embeddings';
await embeddingService.initialize();
console.log('Model loaded:', embeddingService.isInitialized());
console.log('Model name:', embeddingService.getModelName());
console.log('Dimension:', embeddingService.getDimension());
```

### Check Vector Store

```typescript
// In browser console
import { vectorStore } from './src/lib/vector-store';
await vectorStore.initialize();
console.log('Storage path:', vectorStore.getStoragePath());
// Should show: /Users/banyudu/.cache/redink/vectors
```

### Check Cache

```typescript
// In browser console
import { ragCache } from './src/lib/rag-cache';
await ragCache.initialize();
const stats = ragCache.getStats();
console.log('Cache stats:', stats);
// Shows: embeddingCacheSize, documentCount, cachePath
```

### Check Index

```typescript
// In browser console (after loading a PDF)
import { hybridRAG } from './src/lib/hybrid-rag';
const documentId = '<your-document-id>'; // From console logs
const stats = hybridRAG.getStats(documentId);
console.log('Index stats:', stats);
// Shows: chunkCount, hasSemanticIndex, embeddingModel, createdAt
```

## Common Issues

### Issue 1: Model Download Fails

**Symptoms**: Error message about model loading

**Solution**:
1. Check internet connection (needed for first download)
2. Clear browser cache
3. Check browser console for specific error
4. Restart application

### Issue 2: ChromaDB Not Working

**Symptoms**: No "Hybrid RAG" badge, only TF-IDF search

**Check**:
```bash
# Verify cache directory exists
ls -la ~/.cache/redink/vectors
```

**Solution**:
1. Check directory permissions
2. Try: `mkdir -p ~/.cache/redink/vectors`
3. Restart application

### Issue 3: Slow Performance

**Symptoms**: Queries take >1 second

**Check**:
1. Console for errors
2. System resources (CPU usage)
3. Number of chunks (shown in UI)

**Solutions**:
- Reduce chunk count (larger target size)
- Check for other CPU-intensive processes
- Wait for model warmup (first few queries slower)

### Issue 4: Poor Results

**Symptoms**: Answers not relevant

**Solutions**:

1. **Adjust fusion weights**:
   ```typescript
   // In hybrid-rag.ts search options
   { tfidfWeight: 0.5, semanticWeight: 0.5 } // More balanced
   ```

2. **Try different fusion method**:
   ```typescript
   { fusionMethod: 'rrf' } // Instead of 'weighted'
   ```

3. **Increase topK**:
   ```typescript
   { topK: 7 } // More context (default: 5)
   ```

## Success Criteria

### ✅ System Working Correctly If:

1. **Installation**
   - [ ] All dependencies installed
   - [ ] No console errors on startup
   - [ ] Model downloads successfully (~22MB)

2. **Indexing**
   - [ ] PDF loads without errors
   - [ ] Chunks created (visible in UI: "X chunks")
   - [ ] "Hybrid RAG" badge appears
   - [ ] Cache directory created

3. **Search**
   - [ ] Queries return results in <500ms
   - [ ] Both TF-IDF and semantic scores shown
   - [ ] Answers are relevant and comprehensive
   - [ ] Console shows fusion process

4. **Caching**
   - [ ] Second load is instant
   - [ ] Cache files exist in `~/.cache/redink/vectors`
   - [ ] No re-indexing on app restart

5. **Performance**
   - [ ] Query latency: 100-300ms
   - [ ] Memory usage: Reasonable (~200MB)
   - [ ] No memory leaks over time
   - [ ] Smooth UI interactions

## Automated Testing (Future)

### Unit Tests

```typescript
// tests/hybrid-rag.test.ts
describe('HybridRAG', () => {
  it('should build index', async () => {
    const index = await hybridRAG.buildIndex('test-doc', 'test text');
    expect(index.chunks.length).toBeGreaterThan(0);
    expect(index.hasSemanticIndex).toBe(true);
  });

  it('should search with fusion', async () => {
    const results = await hybridRAG.search('test-doc', 'test query');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].fusedScore).toBeGreaterThan(0);
  });
});
```

### Integration Tests

```typescript
// tests/end-to-end.test.ts
describe('End-to-End', () => {
  it('should process PDF and answer questions', async () => {
    // 1. Load PDF
    const text = await extractPdfText('test.pdf');
    
    // 2. Build index
    const index = await hybridRAG.buildIndex('test', text);
    
    // 3. Search
    const results = await hybridRAG.search('test', 'What is this about?');
    
    // 4. Verify
    expect(results.length).toBe(5);
    expect(results[0].chunk.text).toBeTruthy();
  });
});
```

## Reporting Issues

If you encounter problems, please provide:

1. **System Info**:
   - OS version
   - Browser version
   - Node.js version

2. **Console Output**:
   - Copy entire console log
   - Include any error messages

3. **Steps to Reproduce**:
   - PDF document used (if shareable)
   - Query that failed
   - Expected vs actual behavior

4. **Screenshots**:
   - UI state
   - Console errors
   - Performance metrics

## Next Steps

After confirming the system works:

1. **Tune for your use case**:
   - Adjust fusion weights
   - Test different chunk sizes
   - Try different fusion methods

2. **Monitor performance**:
   - Track query times
   - Monitor storage usage
   - Check cache effectiveness

3. **Gather feedback**:
   - Test with real users
   - Collect example queries
   - Identify edge cases

4. **Plan enhancements**:
   - Consider re-ranking (Phase 2)
   - Evaluate query transformation
   - Assess need for LlamaIndex

---

**Happy Testing!** 🚀

If you have questions or need help, refer to:
- `HYBRID_RAG_IMPLEMENTATION.md` - Complete API documentation
- `IMPLEMENTATION_SUMMARY.md` - Architecture overview
- `RAG_TECHNOLOGY_ANALYSIS.md` - Design decisions

