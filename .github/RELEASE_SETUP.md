# Release Setup Guide

## Prerequisites

- Node.js and pnpm installed
- Rust toolchain installed
- GitHub repository with write access
- macOS (for building DMG files)

## One-Time Setup

### 1. Generate Signing Keys

Run the key generation script:

```bash
bash scripts/generate-keys.sh
```

This will:
- Generate an Ed25519 key pair
- Save keys to `~/.tauri/redink.key` and `~/.tauri/redink.pub`
- Display the public key in base64 format

**Important:** Save the output! You'll need it for the next steps.

### 2. Update Configuration

Open `src-tauri/tauri.conf.json` and replace `YOUR_PUBLIC_KEY_HERE` with the public key from step 1:

```json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://github.com/banyudu/redink/releases/latest/download/latest.json"
      ],
      "dialog": true,
      "pubkey": "your-actual-public-key-here"
    }
  }
}
```

### 3. Add GitHub Secrets

1. Go to: https://github.com/banyudu/redink/settings/secrets/actions

2. Add a new repository secret:
   - **Name**: `TAURI_SIGNING_PRIVATE_KEY`
   - **Value**: Copy the entire content of `~/.tauri/redink.key`
   
   To get the private key content:
   ```bash
   cat ~/.tauri/redink.key
   ```

3. (Optional) If your key has a password:
   - **Name**: `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
   - **Value**: Your key password

### 4. Verify Setup

Commit your changes (but NOT the private key!):

```bash
git add src-tauri/tauri.conf.json
git commit -m "chore: configure updater with public key"
git push
```

## Creating Your First Release

### Step 1: Prepare Release

Run the draft release script:

```bash
pnpm release:draft
```

You'll be prompted to enter a new version. For your first release, use `1.0.0`:

```
Enter new version (current: 0.1.0): 1.0.0
```

The script will:
- ✅ Update `package.json`
- ✅ Update `src-tauri/Cargo.toml`
- ✅ Update `src-tauri/tauri.conf.json`
- ✅ Create a git commit
- ✅ Create a git tag `v1.0.0`

### Step 2: Push to GitHub

Push your changes and tags:

```bash
git push && git push --tags
```

### Step 3: Monitor Build

1. Go to: https://github.com/banyudu/redink/actions
2. You should see a "Release" workflow running
3. Wait for it to complete (usually 10-15 minutes)

The workflow will:
- Build for Apple Silicon (aarch64)
- Build for Intel (x86_64)
- Create DMG installers
- Create update bundles with signatures
- Upload all artifacts to a draft release

### Step 4: Publish Release

Once the build completes:

1. **Via GitHub Web UI**:
   - Go to: https://github.com/banyudu/redink/releases
   - Find the draft release
   - Edit the release notes if desired
   - Click "Publish release"

2. **Via GitHub CLI** (faster):
   ```bash
   pnpm release:publish
   # Follow the instructions or use:
   gh release edit v1.0.0 --draft=false
   ```

### Step 5: Verify Update System

After publishing:

1. Check that `latest.json` was created:
   - Go to: https://github.com/banyudu/redink/releases/latest
   - Verify `latest.json` is in the assets

2. Test the update checker:
   - Build and run your app locally
   - Go to Settings
   - Click "Check for Updates"
   - You should see an update notification (if you're running an older version)

## Subsequent Releases

For future releases, just run:

```bash
# 1. Draft the release
pnpm release:draft
# Enter new version (e.g., 1.1.0, 1.0.1, 2.0.0)

# 2. Push to GitHub
git push && git push --tags

# 3. Wait for build to complete

# 4. Publish the release
pnpm release:publish
gh release edit v1.1.0 --draft=false
```

## Version Numbering Guide

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (e.g., `2.0.0`): Breaking changes, major new features
- **MINOR** (e.g., `1.1.0`): New features, backwards compatible
- **PATCH** (e.g., `1.0.1`): Bug fixes, backwards compatible
- **Pre-release** (e.g., `1.0.0-beta.1`): Alpha/beta releases

## Troubleshooting

### Build Fails with "Invalid Signature"

**Problem**: The public key in `tauri.conf.json` doesn't match the private key.

**Solution**:
1. Regenerate keys: `bash scripts/generate-keys.sh`
2. Update `tauri.conf.json` with the new public key
3. Update GitHub secret with new private key
4. Retry the release

### "latest.json Not Found" Error

**Problem**: The updater workflow didn't run or failed.

**Solution**:
1. Ensure the release is **published** (not draft)
2. Check the "Generate Updater Files" workflow: https://github.com/banyudu/redink/actions
3. If it failed, fix the issue and re-run the workflow

### Update Not Showing in App

**Problem**: App doesn't detect new version.

**Solution**:
1. Check that `latest.json` exists in the latest release
2. Verify the version in `latest.json` is higher than your local version
3. Check browser console for errors
4. Ensure GitHub URL in updater endpoint is correct

### Can't Push Tags

**Problem**: `git push --tags` fails with permission denied.

**Solution**:
1. Ensure you have write access to the repository
2. Check your Git credentials: `git config credential.helper`
3. Use SSH instead of HTTPS: `git remote set-url origin git@github.com:banyudu/redink.git`

## Security Notes

### ⚠️ NEVER Commit Private Keys!

Your private key (`~/.tauri/redink.key`) must NEVER be committed to the repository.

The `.gitignore` file is configured to exclude:
- `*.key`
- `*.pub`
- `.tauri/`

### 🔐 Keep Secrets Secure

- Store private key in GitHub Secrets only
- Don't share private key via email, chat, or screenshots
- Rotate keys if compromised
- Use a password manager for key passwords

### ✅ What's Safe to Commit

- Public key in `tauri.conf.json` ✅
- Release scripts ✅
- Workflow files ✅
- Documentation ✅

## Getting Help

If you encounter issues:

1. Check the [detailed documentation](.cursor/plans/release-workflow-setup.md)
2. Review workflow logs: https://github.com/banyudu/redink/actions
3. Create an issue: https://github.com/banyudu/redink/issues
4. Join discussions: https://github.com/banyudu/redink/discussions

## Next Steps

After your first successful release:

- [ ] Test the update mechanism on different machines
- [ ] Set up automatic changelog generation
- [ ] Configure release notifications
- [ ] Add Windows and Linux support
- [ ] Implement beta/stable channels
- [ ] Set up automated testing before release

