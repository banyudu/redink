# macOS Gatekeeper "App is Damaged" Fix

## Problem
When opening the built Redink.app, macOS shows: **"Redink is damaged and can't be opened. You should move it to the Bin."**

This is NOT because the app is actually damaged - it's macOS Gatekeeper preventing unsigned apps from running.

## Quick Fix (For Personal Use)

### Option 1: Remove Quarantine Attributes
```bash
# Remove quarantine attribute from the app
xattr -cr /Applications/Redink.app

# Or if it's in a different location:
xattr -cr /path/to/Redink.app
```

### Option 2: Remove Specific Attribute
```bash
# Check what attributes are set
xattr -l /Applications/Redink.app

# Remove just the quarantine attribute
xattr -d com.apple.quarantine /Applications/Redink.app
```

### Option 3: Allow in System Settings
1. Try to open the app (it will fail)
2. Go to **System Settings** > **Privacy & Security**
3. Scroll down to find "Redink was blocked..."
4. Click **Open Anyway**

## Viewing Detailed Logs

### Method 1: Console.app
1. Open `/Applications/Utilities/Console.app`
2. Search for "Redink" or "Gatekeeper"
3. Try to open the app again and watch for errors

### Method 2: Command Line Logs
```bash
# Real-time system logs
log stream --predicate 'process == "Redink"' --level debug

# Or watch for Gatekeeper messages
log stream --predicate 'subsystem == "com.apple.security.gatekeeper"'
```

### Method 3: Launch from Terminal
```bash
# Launch the app from terminal to see stderr/stdout
/Applications/Redink.app/Contents/MacOS/Redink

# Or with more verbose output:
open -a Redink --stderr /tmp/redink-error.log --stdout /tmp/redink-output.log
```

## Proper Fix (For Distribution)

To properly sign and distribute your app on macOS, you need to:

1. **Get an Apple Developer Account** ($99/year)
2. **Configure Code Signing** in tauri.conf.json
3. **Optionally Notarize** for distribution outside App Store

See the detailed setup below.

---

## Proper Code Signing Setup

### Step 1: Get Apple Developer Certificates

1. Enroll in Apple Developer Program: https://developer.apple.com/programs/
2. Create certificates in Apple Developer Console:
   - **Developer ID Application** certificate (for distribution outside App Store)
   - **Developer ID Installer** certificate (if creating .pkg installers)
3. Download and install certificates in Keychain Access

### Step 2: Find Your Signing Identity

```bash
# List available signing identities
security find-identity -v -p codesigning

# You should see something like:
# 1) ABC123... "Developer ID Application: Your Name (TEAM_ID)"
```

### Step 3: Configure Tauri for Code Signing

Add to `src-tauri/tauri.conf.json`:

```json
{
  "bundle": {
    "active": true,
    "targets": "all",
    "macOS": {
      "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)",
      "entitlements": null,
      "exceptionDomain": "",
      "frameworks": [],
      "providerShortName": "TEAM_ID",
      "hardenedRuntime": true
    }
  }
}
```

### Step 4: Configure GitHub Actions for Signing

Add these secrets to your GitHub repository:
- `APPLE_CERTIFICATE`: Base64-encoded .p12 certificate file
- `APPLE_CERTIFICATE_PASSWORD`: Password for the .p12 file
- `APPLE_SIGNING_IDENTITY`: Your signing identity string
- `APPLE_ID`: Your Apple ID email (for notarization)
- `APPLE_PASSWORD`: App-specific password (for notarization)
- `APPLE_TEAM_ID`: Your Apple Developer Team ID

Update the release workflow:

```yaml
- name: Import Code-Signing Certificates
  if: startsWith(matrix.platform, 'macos-')
  uses: Apple-Actions/import-codesign-certs@v2
  with:
    p12-file-base64: ${{ secrets.APPLE_CERTIFICATE }}
    p12-password: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}

- name: Build Tauri app
  uses: tauri-apps/tauri-action@v0
  env:
    APPLE_SIGNING_IDENTITY: ${{ secrets.APPLE_SIGNING_IDENTITY }}
    APPLE_ID: ${{ secrets.APPLE_ID }}
    APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
    APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
```

### Step 5: Notarization (Optional but Recommended)

Notarization ensures your app runs smoothly on macOS 10.15+:

```bash
# After building, notarize the app
xcrun notarytool submit Redink.dmg \
  --apple-id "your@email.com" \
  --password "app-specific-password" \
  --team-id "TEAM_ID" \
  --wait

# Staple the notarization ticket
xcrun stapler staple Redink.dmg
```

Tauri's build process can handle this automatically if you set the environment variables above.

## References

- [Tauri Code Signing Guide](https://tauri.app/v2/guides/distribution/sign-macos/)
- [Apple Code Signing Documentation](https://developer.apple.com/support/code-signing/)
- [Tauri GitHub Actions Setup](https://tauri.app/v2/guides/distribution/github-actions/)

## Common Issues

### "No identity found" Error
- Make sure certificates are properly installed in Keychain
- Check certificate validity dates
- Ensure certificate type is "Developer ID Application"

### "The app is notarized but still shows warning"
- Make sure to staple the notarization ticket: `xcrun stapler staple`
- Wait a few minutes after notarization for Apple servers to sync

### "Entitlements not valid"
- Ensure hardened runtime is enabled
- Check entitlements plist file syntax
- Verify signing identity has required capabilities

