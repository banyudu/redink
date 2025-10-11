# Release Workflow Setup Documentation

## Overview

This document describes the automated release workflow for the Redink Tauri application, including building for multiple architectures (Apple Silicon and Intel), creating GitHub releases, and integrating with Tauri's built-in updater.

## Components

### 1. GitHub Actions Workflows

#### `release.yml`
- **Trigger**: On push of tags matching `v*` pattern (e.g., `v1.0.0`)
- **Jobs**:
  1. **create-release**: Creates a draft GitHub release
  2. **build-tauri**: Builds the app for both macOS architectures:
     - Apple Silicon (aarch64-apple-darwin)
     - Intel (x86_64-apple-darwin)
  3. **publish-release**: Automatically publishes the draft release after all builds complete

#### `updater.yml`
- **Trigger**: When a release is published (not draft)
- **Purpose**: Generates `latest.json` file for Tauri updater
- **Output**: Creates a JSON file with version, release notes, and download URLs for both architectures

### 2. Release Scripts

#### `scripts/draft-release.js`
**Command**: `pnpm release:draft`

Interactive script that:
1. Prompts for new version number
2. Validates semantic versioning format
3. Updates version in:
   - `package.json`
   - `src-tauri/Cargo.toml`
   - `src-tauri/tauri.conf.json`
4. Commits changes
5. Creates git tag
6. Provides instructions for pushing

#### `scripts/publish-release.js`
**Command**: `pnpm release:publish`

Helper script that:
1. Shows instructions for publishing draft releases
2. Lists draft releases if GitHub CLI is installed
3. Provides commands for publishing

#### `scripts/generate-keys.sh`
**Command**: `bash scripts/generate-keys.sh`

One-time setup script that:
1. Generates Ed25519 key pair for signing updates
2. Saves keys to `~/.tauri/` directory
3. Displays public key for `tauri.conf.json`
4. Shows private key for GitHub Secrets

## Setup Instructions

### Initial Setup (One-time)

1. **Generate Signing Keys**
   ```bash
   bash scripts/generate-keys.sh
   ```

2. **Update Configuration**
   - Copy the public key from the script output
   - Open `src-tauri/tauri.conf.json`
   - Replace `YOUR_PUBLIC_KEY_HERE` with the public key

3. **Add GitHub Secrets**
   - Go to: https://github.com/banyudu/redink/settings/secrets/actions
   - Add the following secrets:
     - **Name**: `TAURI_SIGNING_PRIVATE_KEY`
     - **Value**: Content of `~/.tauri/redink.key`
     - **Name**: `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (optional)
     - **Value**: Password if your key is encrypted

### Creating a New Release

1. **Prepare the Release**
   ```bash
   pnpm release:draft
   ```
   - Enter the new version when prompted (e.g., `1.0.0`)
   - The script will update all version files and create a git tag

2. **Review Changes**
   ```bash
   git log -1
   git show v1.0.0
   ```

3. **Push to GitHub**
   ```bash
   git push && git push --tags
   ```

4. **Monitor Build**
   - Go to: https://github.com/banyudu/redink/actions
   - Wait for the "Release" workflow to complete
   - This will build for both architectures and create a draft release

5. **Publish the Release**
   - Go to: https://github.com/banyudu/redink/releases
   - Find the draft release
   - Edit release notes if needed
   - Click "Publish release"
   
   Or use GitHub CLI:
   ```bash
   gh release list
   gh release edit v1.0.0 --draft=false
   ```

6. **Updater JSON Generation**
   - After publishing, the `updater.yml` workflow automatically runs
   - Generates `latest.json` and uploads it to the release
   - This file is used by the app's auto-updater

## Release Artifacts

Each release includes:

### DMG Files (User Downloads)
- `Redink_x.x.x_aarch64.dmg` - Apple Silicon version
- `Redink_x.x.x_x64.dmg` - Intel version

### Update Files (Auto-updater)
- `Redink_x.x.x_aarch64.app.tar.gz` - Apple Silicon update bundle
- `Redink_x.x.x_aarch64.app.tar.gz.sig` - Signature for Apple Silicon
- `Redink_x.x.x_x64.app.tar.gz` - Intel update bundle
- `Redink_x.x.x_x64.app.tar.gz.sig` - Signature for Intel
- `latest.json` - Updater configuration file

## Auto-Update Flow

1. **App Checks for Updates**
   - On startup, the app queries: `https://github.com/banyudu/redink/releases/latest/download/latest.json`
   - Compares current version with latest version

2. **Update Available**
   - Shows update dialog (configured in `tauri.conf.json`)
   - User can accept or dismiss

3. **Download & Install**
   - Downloads appropriate `.app.tar.gz` file based on architecture
   - Verifies signature using public key
   - Installs update and restarts app

## Configuration Files

### `tauri.conf.json`
```json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://github.com/banyudu/redink/releases/latest/download/latest.json"
      ],
      "dialog": true,
      "pubkey": "YOUR_PUBLIC_KEY_HERE"
    }
  }
}
```

### `latest.json` (Auto-generated)
```json
{
  "version": "1.0.0",
  "notes": "Release notes here",
  "pub_date": "2024-01-01T00:00:00Z",
  "platforms": {
    "darwin-aarch64": {
      "signature": "...",
      "url": "https://github.com/.../Redink_1.0.0_aarch64.app.tar.gz"
    },
    "darwin-x86_64": {
      "signature": "...",
      "url": "https://github.com/.../Redink_1.0.0_x64.app.tar.gz"
    }
  }
}
```

## Troubleshooting

### Build Failures

1. **Missing Dependencies**
   - Ensure all dependencies are installed: `pnpm install`
   - Check Rust toolchain is up to date

2. **Signing Errors**
   - Verify `TAURI_SIGNING_PRIVATE_KEY` secret is set correctly
   - Ensure public key in `tauri.conf.json` matches the private key

3. **Architecture Build Issues**
   - macOS runners should have both targets installed
   - Check workflow logs for specific errors

### Update Not Working

1. **Public Key Mismatch**
   - Ensure public key in `tauri.conf.json` matches the private key used for signing
   - Regenerate keys if necessary

2. **latest.json Not Found**
   - Ensure the release is published (not draft)
   - Verify `updater.yml` workflow completed successfully
   - Check that `latest.json` is attached to the release

3. **Update Check Fails**
   - Check network connectivity
   - Verify endpoint URL is correct
   - Check browser console for errors

## Security Considerations

1. **Private Key Protection**
   - Never commit private key to repository
   - Store securely in GitHub Secrets
   - Rotate keys if compromised

2. **Signature Verification**
   - All updates are cryptographically signed
   - App verifies signature before installing
   - Prevents malicious update injection

3. **HTTPS Only**
   - All update downloads use HTTPS
   - GitHub ensures secure delivery

## Version Numbering

Follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes (e.g., `2.0.0`)
- **MINOR**: New features, backwards compatible (e.g., `1.1.0`)
- **PATCH**: Bug fixes, backwards compatible (e.g., `1.0.1`)
- **Pre-release**: Alpha/beta releases (e.g., `1.0.0-beta.1`)

## Rollback Procedure

If a release has critical issues:

1. **Mark as Pre-release**
   - Edit the problematic release
   - Check "This is a pre-release"
   - This prevents auto-updater from installing it

2. **Create Hotfix Release**
   - Fix the issue in code
   - Create new release with patch version
   - Users will update to the fixed version

3. **Delete Problematic Release** (optional)
   - Only if it's causing severe issues
   - Note: Users who already downloaded won't be affected

## Future Improvements

- [ ] Add Linux support (AppImage, Deb, RPM)
- [ ] Add Windows support (MSI, NSIS)
- [ ] Implement beta/stable channels
- [ ] Add release notes template
- [ ] Automate changelog generation
- [ ] Add smoke tests before publishing
- [ ] Implement staged rollouts
- [ ] Add metrics for update success rate

