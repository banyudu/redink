# ArXiv Link Handling Implementation

## Summary
Implemented functionality to prevent external link navigation in PDF viewer while making arXiv paper references clickable. When users click on an arXiv reference (either a link or plain text), the application automatically downloads and opens the referenced paper.

## Bug Fixes (Second Iteration)

### Fixed Navigation Issue
**Problem**: Clicking on arXiv links would navigate back to the home page instead of opening the PDF.
**Root Cause**: Was setting `currentPaper` to the file ID instead of the file path. The Chat component expects the path.
**Fix**: Changed `setCurrentPaper(recentFile.id)` to `setCurrentPaper(finalPath)`.

### Fixed Styling Issue
**Problem**: ArXiv links and text references were not being styled with the intended blue color, underline, and hover effects.
**Root Causes**:
1. CSS selectors were not strong enough (needed `!important`)
2. Timing issues - styles were applied too early before elements were fully rendered
3. Non-arXiv links were still showing default link styling

**Fixes**:
1. Added CSS classes (`arxiv-link`, `non-arxiv-link`, `arxiv-text-ref`) with proper styling
2. Increased inline style specificity with `!important`
3. Applied styling at multiple intervals (300ms, 800ms, 1500ms) to catch all elements
4. Enhanced MutationObserver to detect annotation layer changes
5. Added explicit styling removal for non-arXiv links

## Changes Made

### 1. PDFViewer Component (`src/components/PDFViewer.tsx`)

#### Added Imports
- `useNavigate` from react-router-dom
- `extractPdfFromPathWithMeta` from pdf library
- `storageManager` for paper downloads
- `getPaperById` from arxiv API
- `generateFileId` from utils
- `RecentFile` type from cache

#### New Functionality

##### ArXiv ID Extraction
- Created `extractArxivId()` function that detects arXiv IDs in various formats:
  - URLs: `https://arxiv.org/abs/2506.17113`
  - URLs: `https://arxiv.org/pdf/2506.17113.pdf`
  - Text: `arXiv:2506.17113`
  - Text with version: `arXiv:2506.17113v1`
  - Old format: `arXiv:physics/0110044`

##### Paper Download & Opening
- `handleArxivPaperClick()` function that:
  1. Checks if paper is already downloaded
  2. Downloads paper if needed using `storageManager.downloadArxivPaper()`
  3. Processes the PDF and extracts metadata
  4. Adds to recent files
  5. Navigates to chat page with the new paper

##### Link Interception
- Event handler for annotation layer links (actual PDF links)
- Prevents all non-arXiv link navigation
- Allows arXiv links to trigger paper download/open

##### Text Layer Enhancement
- Event handler for text layer clicks
- Detects arXiv references in plain text (e.g., "arXiv:2506.17113")
- Handles text split across multiple spans by checking adjacent siblings
- Makes text clickable even when it's not a hyperlink

##### Visual Styling
- Automatically styles arXiv references with:
  - Blue color (#2563eb)
  - Underline decoration
  - Pointer cursor
  - Tooltip: "Click to open this arXiv paper"
- Uses MutationObserver to apply styling to dynamically loaded pages
- Styled spans update as user scrolls through PDF

#### UI Enhancements
- Added "Downloading ArXiv Paper" overlay with loading spinner
- Shows feedback while paper is being downloaded and opened

### 2. CSS Updates (`src/index.css`)

Added comprehensive styling for all link types:

#### ArXiv Links (Annotation Layer)
- Blue color (#2563eb) with underline
- Pointer cursor
- Hover: darker blue (#1d4ed8) with light background
- Smooth transition effects

#### Non-ArXiv Links  
- Inherit text color (no blue)
- No underline
- Default cursor
- Reduced opacity on hover to indicate disabled state
- Click events still captured for blocking

#### ArXiv Text References
- Same styling as arXiv links
- Applied to plain text spans containing arXiv IDs
- Hover effects for better UX

## Technical Details

### Pattern Matching
The regex patterns match:
- Standard format: `\d+\.\d+` (e.g., 2506.17113)
- Old format: `[a-zA-Z-]+\/\d+` (e.g., physics/0110044)
- Optional version: `v\d+` (e.g., v1, v2)

### Text Handling
Since PDF text can be split across multiple spans, the implementation:
1. Checks the clicked span first
2. Tries combining with previous sibling
3. Tries combining with next sibling
4. Tries combining with both siblings

### Styling Strategy (Enhanced)
- Multiple styling passes at 300ms, 800ms, and 1500ms to catch all elements as they render
- MutationObserver watches for:
  - New text layers (`.react-pdf__Page__textContent`)
  - New annotation layers (`.react-pdf__Page__annotations`)
  - New link elements (`<a>` tags)
- Re-applies styling 200ms after detecting relevant changes
- Prevents duplicate styling with Set tracking
- Adds CSS classes for better control and hover effects
- Uses `!important` to override PDF.js default styles
- Console logging for debugging which elements are being styled

### Link Prevention
Uses `addEventListener` with `capture: true` to intercept links before they navigate:
```javascript
container.addEventListener('click', handleAnnotationClick, true);
```

## User Experience

### For Actual Links
1. User clicks any link in PDF
2. If link is to arXiv: paper downloads and opens
3. If link is external: navigation is blocked (logged to console)

### For Text References
1. User clicks text like "arXiv:2506.17113"
2. System extracts arXiv ID
3. Paper downloads if not already available
4. Paper opens in chat view

### Visual Feedback
- Clickable references are blue and underlined
- Hover shows darker color and highlight
- Tooltip explains the action
- Loading overlay during download

## Edge Cases Handled

1. **Already Downloaded Papers**: Checks existence before downloading
2. **Split Text**: Handles arXiv IDs split across multiple spans
3. **Dynamic Pages**: Re-applies styling as pages load during scroll
4. **Concurrent Clicks**: Prevents multiple simultaneous downloads
5. **Invalid IDs**: Shows error message if paper not found
6. **Network Errors**: Catches and displays download errors

## Testing Recommendations

1. Test with PDF containing arXiv links
2. Test with text references (no hyperlinks)
3. Test with references in footnotes/bibliography
4. Test scrolling through multi-page PDFs
5. Test clicking already-downloaded papers
6. Test error handling (invalid IDs, network failures)

## Future Improvements

1. Cache arXiv paper metadata to avoid repeated API calls
2. Show paper preview before downloading
3. Add keyboard shortcut for following references
4. Support other paper repositories (e.g., DOI links)
5. Add option to open papers in new window
6. Batch download referenced papers

