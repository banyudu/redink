# Release Guide

This document provides a quick reference for creating releases of Redink.

## Quick Start

### First-Time Setup

1. **Generate signing keys** (one-time only):
   ```bash
   bash scripts/generate-keys.sh
   ```

2. **Update tauri.conf.json**:
   - Replace `YOUR_PUBLIC_KEY_HERE` with the public key from step 1

3. **Add GitHub Secrets**:
   - Go to: https://github.com/banyudu/redink/settings/secrets/actions
   - Add secret: `TAURI_SIGNING_PRIVATE_KEY` (content from `~/.tauri/redink.key`)

### Creating a Release

1. **Draft a new release**:
   ```bash
   pnpm release:draft
   ```
   Enter the new version when prompted (e.g., `1.0.0`)

2. **Push to GitHub**:
   ```bash
   git push && git push --tags
   ```

3. **Monitor the build**:
   - Visit: https://github.com/banyudu/redink/actions
   - Wait for the "Release" workflow to complete
   - First build: ~15-20 minutes (building cache)
   - Subsequent builds: ~5-10 minutes (using cache)

4. **Publish the release**:
   - Visit: https://github.com/banyudu/redink/releases
   - Edit and publish the draft release

   Or use CLI:
   ```bash
   pnpm release:publish
   gh release edit v1.0.0 --draft=false
   ```

## What Gets Built

Each release includes:
- **DMG files**: For user downloads
  - `Redink_x.x.x_aarch64.dmg` (Apple Silicon)
  - `Redink_x.x.x_x64.dmg` (Intel Mac)
- **Auto-update bundles**: For in-app updates
  - `.app.tar.gz` files with signatures
  - `latest.json` for version checking

## Auto-Updates

Users will automatically be notified of new releases when they launch the app. The updater:
- Checks GitHub for new versions
- Verifies signatures
- Downloads and installs updates
- Requires user approval

## Troubleshooting

### Build fails on GitHub Actions
- Check workflow logs: https://github.com/banyudu/redink/actions
- Ensure all secrets are set correctly
- Verify version numbers are valid
- For "Could not find protoc" error: Fixed automatically in workflow
  - Local builds: `brew install protobuf` (macOS)

### Updates not working
- Ensure public key in `tauri.conf.json` matches private key
- Verify release is published (not draft)
- Check that `latest.json` exists in release assets

## Documentation

For detailed information, see:
- [Release Workflow Setup](.cursor/plans/release-workflow-setup.md) - Complete documentation
- [GitHub Actions Workflows](.github/workflows/) - Workflow configurations

## Version Numbering

Follow semantic versioning:
- `1.0.0` - Major release
- `1.1.0` - Minor release (new features)
- `1.0.1` - Patch release (bug fixes)
- `1.0.0-beta.1` - Pre-release

## Support

For issues or questions:
- GitHub Issues: https://github.com/banyudu/redink/issues
- GitHub Discussions: https://github.com/banyudu/redink/discussions

