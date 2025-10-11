# 🚀 Quick Start: Release Workflow

This is your 5-minute guide to setting up automated releases for Redink.

## ✅ Prerequisites Checklist

Before you start, make sure you have:
- [x] GitHub repository with write access
- [x] macOS machine (for building DMG files)
- [x] Node.js and pnpm installed
- [x] Rust toolchain installed
- [ ] OpenSSL installed (`brew install openssl` if not present)

## 📋 Setup Steps (5 minutes)

### Step 1: Generate Signing Keys (2 min)

```bash
bash scripts/generate-keys.sh
```

**Expected Output**: You'll see a public key in base64 format. Copy it!

### Step 2: Update Configuration (1 min)

Open `src-tauri/tauri.conf.json` and find this line:

```json
"pubkey": "YOUR_PUBLIC_KEY_HERE"
```

Replace `YOUR_PUBLIC_KEY_HERE` with the public key you copied.

### Step 3: Add GitHub Secret (2 min)

1. Go to: https://github.com/banyudu/redink/settings/secrets/actions
2. Click "New repository secret"
3. Name: `TAURI_SIGNING_PRIVATE_KEY`
4. Value: Run `cat ~/.tauri/redink.key` and paste the entire output
5. Click "Add secret"

### Step 4: Commit & Push

```bash
git add src-tauri/tauri.conf.json
git commit -m "chore: configure updater with signing key"
git push
```

## 🎉 You're Done!

Now you can create releases. Here's how:

### Create Your First Release

```bash
# 1. Draft the release
pnpm release:draft
# When prompted, enter: 1.0.0

# 2. Push to GitHub
git push && git push --tags

# 3. Wait ~10 minutes for build

# 4. Go to https://github.com/banyudu/redink/releases
#    and publish the draft release
```

## 📱 Test the Update System

After your first release is published:

1. Build the app locally: `pnpm tauri build`
2. Open the app
3. Go to Settings → App Updates
4. Click "Check for Updates"
5. You should see "You're up to date!" (since you're on the latest)

To test actual updates:
1. Create a new release (version 1.0.1)
2. Run your local app (still version 1.0.0)
3. Check for updates - you'll see an update dialog!

## 🆘 Troubleshooting

### "Command not found: openssl"
```bash
brew install openssl
```

### "Permission denied" when running script
```bash
chmod +x scripts/generate-keys.sh
bash scripts/generate-keys.sh
```

### Build fails on GitHub Actions
- Check that you added the `TAURI_SIGNING_PRIVATE_KEY` secret
- Verify the public key in `tauri.conf.json` matches your private key

### Updates not working
- Ensure the release is published (not draft)
- Check that `latest.json` exists in the release assets
- Verify the endpoint URL in `tauri.conf.json` is correct

## 📚 More Information

- **Quick Reference**: [RELEASE.md](../RELEASE.md)
- **Detailed Setup**: [RELEASE_SETUP.md](RELEASE_SETUP.md)
- **Technical Docs**: [../.cursor/plans/release-workflow-setup.md](../.cursor/plans/release-workflow-setup.md)

## 🎯 Next Release

For subsequent releases, just:

```bash
pnpm release:draft    # Enter new version
git push --tags       # Push to trigger build
```

That's it! GitHub Actions handles everything else automatically.

---

**Questions?** Create an issue or discussion on GitHub!

