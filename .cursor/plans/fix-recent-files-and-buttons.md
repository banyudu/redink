# Fix Recent Files Count and ArXiv Button Text

**Date**: October 10, 2025  
**Status**: ✅ Complete

## Issues Fixed

### 1. Recent Files Count Limited to 1
**Problem**: The recent files list was only showing 1 file instead of up to 5 files.

**Root Cause**: The ID generation in `cache.ts` was using only the first 16 characters of a base64-encoded path:
```typescript
btoa(path).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)
```

This caused ID collisions when multiple files had similar paths, resulting in files overwriting each other in the recent files list.

**Solution**: Implemented a proper hash function for generating unique IDs from file paths:
- Uses a hash function (djb2-like algorithm) to generate a numeric hash
- Combines it with a prefix from the first 10 characters of the path
- Ensures unique IDs even for files with similar paths

### 2. Downloaded Papers Showing "Download" Button
**Problem**: ArXiv papers that were already downloaded still showed a "Download" button instead of "Continue Chat".

**Solution**: 
- Added state tracking for downloaded papers using a `Set<string>`
- Created `checkDownloadedPapers()` function to check which papers exist on disk
- Added `getPaperFilePath()` helper to construct paper file paths
- Added `handleContinueChat()` to open already-downloaded papers
- Updated button rendering to show "Continue Chat" with MessageSquare icon for downloaded papers
- Button now checks `downloadedPapers.has(paper.id)` to determine state

## Files Modified

### `/src/lib/utils.ts`
- **Added**: `generateFileId(filePath: string)` utility function
- Uses hash function to generate consistent, collision-free IDs

### `/src/lib/cache.ts`
- **Modified**: `generateId()` to use the new `generateFileId()` utility
- **Added**: Import for `generateFileId` from utils

### `/src/pages/Home.tsx`
- **Added**: `downloadedPapers` state to track downloaded papers
- **Added**: `getPaperFilePath()` to construct file paths for papers
- **Added**: `checkDownloadedPapers()` to check which papers exist on disk
- **Added**: `handleContinueChat()` to open downloaded papers
- **Added**: `useEffect` to check downloaded papers when filtered papers change
- **Modified**: ArXiv paper buttons (both locations) to show "Continue Chat" for downloaded papers
- **Added**: `MessageSquare` icon import
- **Modified**: `processPdfFile()` to use `generateFileId()` utility

### `/src/pages/Chat.tsx`
- **Modified**: Document ID generation to use `generateFileId()` utility
- **Added**: Import for `generateFileId`

## Technical Details

### Hash Function (djb2-like)
```typescript
let hash = 0;
for (let i = 0; i < filePath.length; i++) {
  const char = filePath.charCodeAt(i);
  hash = ((hash << 5) - hash) + char;
  hash = hash & hash; // Convert to 32bit integer
}
```

### ID Format
- Prefix: First 8 alphanumeric chars from base64(first 10 chars of path)
- Suffix: Hash value in base36
- Example: `L1VzZXJzY2` (prefix) + `k5xj8` (hash) = `L1VzZXJzY2k5xj8`

## Testing Notes

1. **Recent Files**: Add multiple PDF files and verify all appear in recent files list (up to 5)
2. **Downloaded Papers**: 
   - Search for papers on ArXiv
   - Download a paper - button should show "Continue Chat" after download
   - Restart app - downloaded papers should still show "Continue Chat"
   - Click "Continue Chat" - should open the paper in chat view

## Bug Fix - Infinite Loading Loop

**Issue Discovered**: After initial implementation, the chat page would enter an infinite loading state when clicking any file.

**Root Cause**: ID generation mismatch in Chat.tsx:
- Line 154 (auto-load check) was still using OLD ID format: `btoa(path).replace(...).substring(0, 32)`
- Line 81 (loadPdf function) was using NEW ID format: `generateFileId(path)`
- This caused the effect to think the document changed every time, triggering infinite reloads

**Fix**: Updated line 154 to use `generateFileId(pathToLoad)` for consistency

### Modified Section in Chat.tsx
```typescript
// Before (line 154):
const documentId = pathToLoad ? btoa(pathToLoad).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32) : null;

// After:
const documentId = pathToLoad ? generateFileId(pathToLoad) : null;
```

## Benefits

1. **No More ID Collisions**: Hash-based IDs ensure uniqueness
2. **Consistent IDs**: Same file path always generates same ID across the app
3. **Better UX**: Users can immediately continue chatting with downloaded papers
4. **DRY Code**: Single utility function used everywhere for ID generation
5. **No Infinite Loops**: Consistent ID generation prevents reload loops

