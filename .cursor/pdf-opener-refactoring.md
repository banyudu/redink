# PDF Opener Refactoring

## Summary
Extracted duplicate PDF opening logic into a shared utility module (`src/lib/pdf-opener.ts`) to eliminate code duplication and improve maintainability.

## Problem Identified
The logic for opening PDF files was duplicated across multiple locations:

1. **PDFViewer.tsx** - `handleArxivPaperClick` (79 lines)
   - Fetched arXiv paper info
   - Downloaded if needed
   - Extracted PDF metadata
   - Added to recent files
   - Navigated to chat

2. **Home.tsx** - `processPdfFile` (36 lines)
   - Extracted PDF metadata
   - Added to recent files (both cacheManager and store)
   - Navigated to chat

3. **Home.tsx** - `handleArxivDownload` (24 lines)
   - Downloaded arXiv paper
   - Called `processPdfFile`

## Solution: Shared Utility Module

Created `src/lib/pdf-opener.ts` with three main functions:

### 1. `openPdfByPath(filePath, options)`
Opens a PDF file by its file system path.

**What it does:**
- Extracts PDF metadata (title, page count, file size)
- Creates RecentFile entry
- Adds to both cache (persistent) and store (in-memory)
- Sets current paper and path in store
- Navigates to chat page

**Parameters:**
- `filePath`: Path to the PDF file
- `options`: Object containing store functions and callbacks
  - `addRecentFile`, `setCurrentPaper`, `setLastSelectedPdfPath`, `navigate`
  - Optional: `preferredTitle` - Use this title instead of extracting from PDF metadata
  - Optional: `onStart`, `onComplete`, `onError`

### 2. `openArxivPaper(arxivId, options)`
Opens an arXiv paper by its ID, downloading if needed.

**What it does:**
- Initializes storage manager
- Fetches paper metadata from arXiv API
- Constructs file path
- Downloads paper if not already present
- Calls `openPdfByPath` to complete the process

**Parameters:**
- `arxivId`: ArXiv paper ID (e.g., "2506.17113")
- `options`: Same as `openPdfByPath`

### 3. `openArxivPaperFromObject(paper, options)`
Convenience wrapper when you already have an ArxivPaper object.

**Parameters:**
- `paper`: ArxivPaper object
- `options`: Same as `openPdfByPath`

## Code Reduction

### Before
- **PDFViewer.tsx**: 79 lines for `handleArxivPaperClick`
- **Home.tsx**: 36 lines for `processPdfFile` + 24 lines for `handleArxivDownload`
- **Total**: ~139 lines of duplicate logic

### After
- **pdf-opener.ts**: 155 lines (shared utility, well-documented)
- **PDFViewer.tsx**: 23 lines (simplified `handleArxivPaperClick`)
- **Home.tsx**: 27 lines (simplified `processPdfFile`) + 22 lines (simplified `handleArxivDownload`)
- **Total**: ~72 lines in consuming code

## Benefits

### 1. **Single Source of Truth**
- All PDF opening logic is centralized in one place
- Changes to the opening flow only need to be made once
- Consistent behavior across the application

### 2. **Better Error Handling**
- Unified error handling through callbacks
- Easier to add logging and monitoring
- Consistent error messages

### 3. **Improved Testability**
- Utility functions are easier to unit test
- No need to mock React hooks for testing core logic
- Can test PDF opening logic independently

### 4. **Cleaner Component Code**
- Components are less cluttered
- Easier to understand component responsibilities
- Separation of concerns (UI vs business logic)

### 5. **Consistent Behavior**
- Both places now:
  - Add to cache (persistent storage)
  - Add to store (in-memory)
  - Use the same error handling
  - Call the same navigation logic

### 6. **Extensibility**
- Easy to add new features (e.g., analytics, notifications)
- Can add new ways to open PDFs (e.g., from URLs, from other sources)
- Callback system allows flexible customization per use case

## Bug Fixes Included

### Fixed: Missing Cache Persistence
**Problem**: PDFViewer was only adding to store, not to cacheManager
**Fix**: Shared utility always adds to both

### Fixed: Inconsistent Error Handling
**Problem**: Different error messages and handling in different places
**Fix**: Unified error handling through callbacks

### Fixed: Inconsistent Title Formatting (v2)
**Problem**: Papers opened from homepage showed clean titles (e.g., "My Paper Title"), but papers opened from references showed sanitized titles with underscores (e.g., "My_Paper_Title")
**Root Cause**: When downloading arXiv papers, the filename uses a sanitized title for filesystem compatibility. When extracting PDF metadata fails, it would fall back to the filename, resulting in ugly underscored titles in the UI.
**Fix**: Added `preferredTitle` optional parameter to `OpenPdfOptions`. When opening arXiv papers, we now pass the original paper title from the arXiv API as the `preferredTitle`, ensuring consistent clean titles regardless of how the paper was opened.

## Usage Examples

### From PDFViewer (Opening Referenced Paper)
```typescript
await openArxivPaper(arxivId, {
  addRecentFile,
  setCurrentPaper,
  setLastSelectedPdfPath,
  navigate,
  onStart: () => setDownloadingArxiv(true),
  onComplete: () => setDownloadingArxiv(false),
  onError: (error) => {
    setDownloadingArxiv(false);
    alert(`Failed to open paper: ${error.message}`);
  }
});
```

### From Home (Opening Local File)
```typescript
await openPdfByPath(filePath, {
  addRecentFile,
  setCurrentPaper,
  setLastSelectedPdfPath,
  navigate,
  onStart: () => {
    setLoading(true);
    setLoadingFile(filePath);
  },
  onComplete: () => {
    setLoading(false);
    setLoadingFile(null);
  },
  onError: (err) => {
    setLoading(false);
    setLoadingFile(null);
    alert(`Failed to load PDF: ${err.message}`);
  }
});
```

### From Home (Downloading ArXiv Paper)
```typescript
await openArxivPaperFromObject(paper, {
  addRecentFile,
  setCurrentPaper,
  setLastSelectedPdfPath,
  navigate,
  onStart: () => setDownloadingPaper(paper.id),
  onComplete: () => {
    setDownloadingPaper(null);
    setDownloadedPapers(prev => new Set(prev).add(paper.id));
  },
  onError: (error) => {
    setDownloadingPaper(null);
    alert(`Failed to download paper: ${error.message}`);
  }
});
```

## Implementation Details

### Callback Pattern
The utility uses a callback pattern for lifecycle hooks:
- `onStart()`: Called when operation begins
- `onComplete()`: Called when operation succeeds
- `onError(error)`: Called when operation fails

This allows consuming code to:
- Show/hide loading states
- Display error messages
- Update UI state
- Track analytics

### Store Functions as Parameters
Instead of directly importing and using store functions, they are passed as parameters. This:
- Makes the utility more testable
- Keeps dependencies explicit
- Allows for easy mocking in tests
- Follows dependency injection pattern

### Error Propagation
Errors are:
1. Logged to console (for debugging)
2. Passed to `onError` callback (for UI handling)
3. Re-thrown (for additional handling if needed)

## Future Enhancements

### Possible Additions
1. **Progress Tracking**: Add `onProgress(percent)` callback for download progress
2. **Cancellation**: Support aborting downloads with AbortController
3. **Validation**: Add PDF validation before opening
4. **Analytics**: Track which papers are opened most frequently
5. **Offline Queue**: Queue downloads when offline
6. **Batch Operations**: Support opening multiple papers at once

### Alternative Approach: Event System
Could also implement using a custom event system:
```typescript
// Emit event
window.dispatchEvent(new CustomEvent('openPdf', { detail: { path } }));

// Listen for event
window.addEventListener('openPdf', handleOpenPdf);
```

However, the current callback-based approach is simpler and more explicit.

## Migration Guide

If adding new PDF opening functionality:

### ❌ Don't Do This
```typescript
// Duplicating logic
const result = await extractPdfFromPathWithMeta(filePath);
const recentFile = { ... };
await cacheManager.addRecentFile(...);
addRecentFile(recentFile);
setCurrentPaper(filePath);
navigate('/chat');
```

### ✅ Do This
```typescript
// Use shared utility
import { openPdfByPath } from '@/lib/pdf-opener';

await openPdfByPath(filePath, {
  addRecentFile,
  setCurrentPaper,
  setLastSelectedPdfPath,
  navigate,
  onStart: () => setLoading(true),
  onComplete: () => setLoading(false),
  onError: (err) => alert(err.message)
});
```

## Testing Recommendations

### Unit Tests for pdf-opener.ts
```typescript
describe('openPdfByPath', () => {
  it('should extract metadata and add to recent files', async () => {
    // Mock extractPdfFromPathWithMeta
    // Mock cacheManager
    // Call openPdfByPath
    // Assert all callbacks were called
  });
  
  it('should handle errors gracefully', async () => {
    // Mock to throw error
    // Call openPdfByPath
    // Assert onError was called
  });
});
```

### Integration Tests
```typescript
describe('Opening PDFs', () => {
  it('should open PDF from home page', async () => {
    // Render Home component
    // Select file
    // Verify navigation to chat
  });
  
  it('should open arXiv reference from PDF', async () => {
    // Render PDFViewer with test PDF
    // Click arXiv link
    // Verify download and navigation
  });
});
```

## Files Changed

### New Files
- `src/lib/pdf-opener.ts` - Shared PDF opening utility

### Modified Files
- `src/components/PDFViewer.tsx` - Simplified using shared utility
- `src/pages/Home.tsx` - Simplified using shared utility

### Lines of Code
- **Added**: 155 lines (pdf-opener.ts)
- **Removed**: ~139 lines (duplicate logic)
- **Net**: +16 lines (but much better organized and maintainable)

## Conclusion

This refactoring significantly improves code quality by:
- Eliminating duplication
- Centralizing business logic
- Improving testability
- Making the codebase more maintainable
- Fixing subtle bugs (missing cache persistence)

The callback-based approach provides flexibility while maintaining simplicity, and the explicit parameter passing makes dependencies clear and testable.

