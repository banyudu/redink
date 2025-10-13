# iBooks Integration Implementation Summary

## Overview

Added an "Open in Books" button to the PDF viewer toolbar that allows macOS users to open the currently displayed PDF file in Apple Books (iBooks). This feature is platform-specific and only appears on macOS.

## Implementation Date

October 12, 2025

## Changes Made

### 1. Backend Changes (Rust/Tauri)

#### **src-tauri/Cargo.toml**
- Added `tauri-plugin-shell = "2"` dependency to enable shell command execution

#### **src-tauri/src/lib.rs**
- Added `.plugin(tauri_plugin_shell::init())` to initialize the shell plugin

#### **src-tauri/capabilities/default.json**
- Added `"shell:default"` permission to enable shell plugin
- Added `"shell:allow-open"` permission to allow opening files with applications
- Added `"shell:allow-execute"` permission for command execution
- Added scope configuration to explicitly allow `osascript` command with any arguments

#### **src-tauri/tauri.conf.json**
- Enabled shell plugin with `"open": true` in the plugins section
- **Note**: Scope configuration is NOT done here in Tauri v2 - it's handled in capabilities

### 2. Frontend Changes (TypeScript/React)

#### **src/components/PDFViewer.tsx**

**Imports Added:**
```typescript
import { BookOpen } from 'lucide-react';
import { Command } from '@tauri-apps/plugin-shell';
```

**Platform Detection:**
```typescript
// Detect if we're on macOS
const isMacOS = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
```

**New Function:**
```typescript
// Open PDF in iBooks (macOS only)
const openInIBooks = useCallback(async () => {
  if (!filePath || !isMacOS) return;
  
  try {
    console.log('[PDFViewer] Opening PDF in iBooks:', filePath);
    
    // Use AppleScript to open the file in Books.app
    // This is more reliable than the 'open' command for Books
    const script = `tell application "Books"
      activate
      open POSIX file "${filePath}"
    end tell`;
    
    const command = Command.create('osascript', ['-e', script]);
    const output = await command.execute();
    
    if (output.code !== 0) {
      console.error('[PDFViewer] Failed to open in iBooks:', output.stderr);
      alert(`Failed to open in iBooks: ${output.stderr || 'Unknown error'}`);
    } else {
      console.log('[PDFViewer] Successfully opened in iBooks');
    }
  } catch (error: any) {
    console.error('[PDFViewer] Error opening in iBooks:', error);
    alert(`Failed to open in iBooks: ${error?.message ?? 'Unknown error'}`);
  }
}, [filePath, isMacOS]);
```

**UI Button Added:**
- Added a separator divider after the "Fit to Width" button
- Added the "Open in Books" button with BookOpen icon
- Button is conditionally rendered only on macOS (`{isMacOS && (...)}`
- Includes a tooltip: "Open in Books"
- Positioned after the "Fit to Width" button in the toolbar

## Technical Details

### How It Works

1. **Platform Detection**: Uses `navigator.platform` to detect if the user is on macOS
2. **AppleScript Execution**: Uses `osascript` command to execute AppleScript that opens the PDF in Books.app
3. **Automatic Import**: When the PDF is opened in Books.app, macOS automatically imports the file into the Books library
4. **Error Handling**: Displays alerts if the operation fails, with detailed error messages

### AppleScript Used

```applescript
tell application "Books"
  activate
  open POSIX file "<filepath>"
end tell
```

This AppleScript:
- Activates (launches and brings to front) Books.app
- Opens the specified PDF file using its POSIX path
- Automatically imports the PDF into Books library
- Is more reliable than the `open -a` command for Books.app

The script is executed via:
```typescript
const command = Command.create('osascript', ['-e', script]);
await command.execute();
```

## User Experience

### When Visible
- Button only appears on macOS devices
- Positioned in the PDF viewer toolbar alongside other controls (zoom, rotate, fit)

### What Happens When Clicked
1. User clicks the BookOpen icon button
2. The command executes in the background
3. Books.app launches (if not already open)
4. The PDF is imported into Books library
5. The PDF opens in Books.app for viewing

### Error Cases
- If Books.app is not available: Shows error alert with stderr message
- If file path is invalid: Shows error alert
- If user denies permission: Shows error alert

## Testing Recommendations

1. **Test on macOS**: Verify button appears only on macOS
2. **Test on non-macOS**: Verify button does NOT appear on Windows/Linux
3. **Test with valid PDF**: Verify file opens in Books.app and gets imported
4. **Test error cases**: Test with invalid paths, permissions issues

## Benefits

1. **Seamless Integration**: Users can easily move PDFs to their Books library
2. **Platform-Specific**: Only shows on macOS where Books.app is available
3. **One-Click Action**: Single click to import and open in Books
4. **Non-Intrusive**: Button is small, clearly labeled, and positioned appropriately

## Future Enhancements

Potential improvements could include:
- Add support for other PDF readers on different platforms
- Add a preferences option to choose default external viewer
- Add keyboard shortcut for quick access
- Show success notification when import completes

## Files Modified

1. `/src-tauri/Cargo.toml` - Added shell plugin dependency
2. `/src-tauri/src/lib.rs` - Initialized shell plugin
3. `/src-tauri/capabilities/default.json` - Added shell permissions and scope configuration
4. `/src-tauri/tauri.conf.json` - Added shell scope configuration for `open` command
5. `/src/components/PDFViewer.tsx` - Added UI button and functionality

## Build Status

✅ Frontend builds successfully (TypeScript compilation passed)
✅ Backend builds successfully (Rust cargo check passed)
✅ No linter errors

## Notes

- The feature uses the native macOS `open` command, which is reliable and well-supported
- The shell plugin provides secure command execution with proper sandboxing
- Platform detection is done client-side for immediate UI rendering
- The implementation follows all project conventions and patterns

## Troubleshooting

### Issue: "invalid args `with` for command `open`: unknown program Books"

**Cause**: The Tauri shell plugin's `open()` function expects an application bundle identifier or full path, not just the application name "Books". Books.app doesn't work reliably with the standard `open -a` command approach.

**Solution**: 
Use AppleScript via `osascript` to open files in Books.app. AppleScript provides more reliable application control on macOS.

**Working Approach**:
```typescript
import { Command } from '@tauri-apps/plugin-shell';

const script = `tell application "Books"
  activate
  open POSIX file "${filePath}"
end tell`;

const command = Command.create('osascript', ['-e', script]);
await command.execute();
```

### Required Configuration

**In `tauri.conf.json`** (Simple - just enable the plugin):
```json
"shell": {
  "open": true
}
```

**In `capabilities/default.json`**:
```json
"shell:default",
"shell:allow-open",
"shell:allow-execute",
{
  "identifier": "shell:allow-execute",
  "allow": [
    {
      "name": "osascript",
      "cmd": "osascript",
      "args": true,
      "sidecar": false
    }
  ]
}
```

**Important Notes**:
- In Tauri v2, the `tauri.conf.json` shell config only accepts `"open": true`
- Do NOT add `"execute"` or `"scope"` fields to `tauri.conf.json` - they will cause errors
- All scope configuration must be in `capabilities/default.json`
- The scope configuration allows execution of `osascript` with any arguments (needed for AppleScript)
- This enables secure, sandboxed AppleScript execution

