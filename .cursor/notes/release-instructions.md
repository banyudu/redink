# Release Instructions for Unsigned macOS Apps

## What to Include in GitHub Releases

When distributing unsigned macOS apps, we need to provide clear instructions to users on how to bypass Gatekeeper.

### 1. Release Notes Template

Include this in every release description:

```markdown
## Installation Instructions

### macOS Installation

⚠️ **Important for macOS users**: This app is not notarized with Apple. You'll see a "damaged" error on first launch.

**Option 1: Remove Quarantine (Recommended)**
```bash
# After downloading, run this in Terminal:
xattr -cr ~/Downloads/Redink_*_*.dmg
xattr -cr /Applications/Redink.app
```

**Option 2: System Settings**
1. Try to open Redink (it will fail)
2. Open **System Settings** > **Privacy & Security**
3. Scroll down and click **"Open Anyway"** next to the Redink warning
4. Click **Open** in the confirmation dialog

**Option 3: Right-Click Method**
1. Right-click (or Control-click) on Redink.app
2. Select **Open** from the menu
3. Click **Open** in the dialog

### Why This Happens
This app is built without an Apple Developer certificate ($99/year). It's safe to use, but macOS Gatekeeper requires these extra steps for unsigned apps.
```

### 2. Include Script in Release Assets

We should bundle a helper script with each release that users can run.

### 3. Update README.md

Add installation instructions to the main README so users know what to expect.

