# Reading Progress & UI Persistence Features

## Overview
Implemented automatic persistence for user preferences related to reading and UI layout:
1. **PDF Reading Progress**: Saves scroll position and current page for each PDF
2. **Chat Separator Position**: Remembers the split position between PDF viewer and chat interface

## Changes Made

### 1. Store Updates (`src/store/index.ts`)

#### Reading Progress Interface
```typescript
export interface ReadingProgress {
  scrollTop: number;
  scrollLeft: number;
  currentPage: number;
  lastUpdated: number;
}
```

#### New State Properties
**PDF Reading Progress:**
- `readingProgress: Record<string, ReadingProgress>` - Stores progress for each file path
- `setReadingProgress(filePath, progress)` - Save progress for a file
- `getReadingProgress(filePath)` - Retrieve saved progress

**Chat Separator Position:**
- `chatSeparatorPosition: number` - Stores the separator position as percentage (30-70%)
- `setChatSeparatorPosition(position)` - Save the separator position

All data is automatically persisted via Zustand's persist middleware.

### 2. PDFViewer Updates (`src/components/PDFViewer.tsx`)

#### New State & Refs
- `currentPage` - Tracks the currently visible page number
- `scrollContainerRef` - Reference to the scrollable container
- `saveProgressTimeoutRef` - For debounced progress saving
- `hasRestoredProgressRef` - Ensures progress is only restored once per file

#### New Functions

**`saveProgress(scrollTop, scrollLeft, page)`**
- Debounced function (500ms) to save reading progress
- Prevents excessive updates during rapid scrolling
- Saves to Zustand store with timestamp

**`detectCurrentPage(container)`**
- Calculates which page is currently visible
- Uses center of viewport to determine closest page
- Reads `data-page-number` attributes from page elements

**`handleScroll(event)`**
- Attached to scroll container
- Updates current page state
- Triggers debounced progress saving

#### Restoration Logic
- Automatically restores scroll position after PDF loads
- Uses 100ms delay to ensure pages are rendered
- Only restores once per file opening
- Resets restoration flag when file changes

#### UI Updates
- Toolbar now shows "Page X of Y" instead of just total pages
- Added `data-page-number` attribute to each page container for tracking
- Scroll event listener attached to container

### 3. Chat Page Updates (`src/pages/Chat.tsx`)

#### Separator Position Persistence

**State Management:**
- Retrieves `chatSeparatorPosition` from store on mount
- Initializes local `leftWidth` state with stored value
- Syncs with store changes via useEffect

**Drag Handling:**
- `handleMouseDown`: Starts drag operation
- `handleMouseMove`: Updates position in real-time (clamped to 30-70%)
- `handleMouseUp`: Saves final position to store
- Logs saved position to console for debugging

**User Experience:**
- Smooth dragging with proper cursor feedback
- Position constrained between 30% and 70% for usability
- Automatically restored on next visit
- No jarring jumps or resets

## How It Works

### PDF Reading Progress

1. **Tracking**: As user scrolls, the component:
   - Detects current visible page based on viewport center
   - Updates UI to show current page
   - Saves scroll position and page number (debounced)

2. **Persistence**: 
   - Progress is stored in Zustand with file path as key
   - Automatically persisted to localStorage
   - Includes timestamp for potential future use

3. **Restoration**:
   - When PDF loads, checks for saved progress
   - If found, waits for pages to render (100ms)
   - Restores exact scroll position and updates page counter
   - Logs restoration to console for debugging

### Chat Separator Position

1. **Initialization**:
   - Loads saved position from store (default: 50%)
   - Applies position to split layout on mount

2. **User Adjustment**:
   - User drags the separator handle
   - Position updates in real-time (30-70% range)
   - Mouse cursor changes to `col-resize`
   - Text selection prevented during drag

3. **Persistence**:
   - On mouse up, final position saved to store
   - Automatically persisted to localStorage
   - Restored on next app launch or page navigation

## Key Features

**PDF Reading Progress:**
- ✅ Automatic tracking without user intervention
- ✅ Debounced saving to avoid performance issues
- ✅ Accurate page detection based on viewport
- ✅ Persisted across app restarts
- ✅ Per-file tracking (unique to each PDF path)
- ✅ Visual feedback (current page in toolbar)
- ✅ Smooth restoration without jarring jumps

**Chat Separator Position:**
- ✅ Remembers split position between sessions
- ✅ Smooth drag interaction with visual feedback
- ✅ Constrained range (30-70%) for usability
- ✅ Persisted across app restarts
- ✅ Applies globally to all chat sessions
- ✅ No configuration needed

## Technical Details

### Performance Optimizations
- **Debouncing**: 500ms delay prevents excessive storage writes
- **Passive Listeners**: Scroll events use `{ passive: true }` for better performance
- **Refs for Cleanup**: Properly clears timeouts on unmount

### Edge Cases Handled
- Multiple files: Each file has independent progress
- File changes: Progress resets and restores for new file
- No saved progress: Works normally without errors
- Rapid scrolling: Debouncing ensures stable behavior

## Testing Recommendations

### PDF Reading Progress
1. Open a PDF and scroll to middle/end
2. Close and reopen the same PDF
3. Verify it scrolls to the last position
4. Test with multiple different PDFs
5. Verify page counter updates correctly while scrolling
6. Test after app restart to ensure persistence

### Chat Separator Position
1. Open the Chat page with a PDF loaded
2. Drag the separator to a custom position (e.g., 40% or 60%)
3. Navigate away from the Chat page (e.g., to Home)
4. Return to the Chat page
5. Verify the separator is in the same position
6. Restart the app and verify persistence
7. Test dragging edge cases (minimum 30%, maximum 70%)

## Future Enhancements (Optional)

### PDF Reading Progress
- Add "Jump to Page" input in toolbar
- Show thumbnail preview of pages
- Add bookmarks feature
- Sync progress across devices
- Show reading time statistics
- Add reading progress bar/indicator

### Chat Separator Position
- Add preset layout buttons (e.g., 30/70, 50/50, 70/30)
- Double-click separator to reset to 50/50
- Add visual indicator showing current percentage
- Per-document separator positions
- Keyboard shortcuts for adjusting split

