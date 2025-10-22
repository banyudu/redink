# Redink {{VERSION}}

## 📥 Installation

### macOS Users - Important!

⚠️ **You will see a "damaged" error when first opening Redink.** This is normal for unsigned apps.

#### Quick Fix (Recommended)

After downloading, run this in Terminal:

```bash
# Download and run the helper script
curl -L https://github.com/banyudu/redink/releases/download/{{TAG}}/install-helper.sh | bash
```

Or manually:

```bash
xattr -cr ~/Downloads/Redink*.dmg
# Install the app, then:
xattr -cr /Applications/Redink.app
```

#### Alternative: System Settings Method

1. Try to open Redink (it will show an error)
2. Open **System Settings** → **Privacy & Security**
3. Scroll down and click **"Open Anyway"**
4. Click **Open** in the confirmation

#### Why This Happens

Redink is not notarized with Apple (requires $99/year Apple Developer account). The app is completely safe to use - this is just a macOS security warning for apps distributed outside the App Store.

---

## 📦 Downloads

Download the appropriate file for your system:

- **macOS Apple Silicon (M1/M2/M3)**: `Redink_{{VERSION}}_aarch64.dmg`
- **macOS Intel**: `Redink_{{VERSION}}_x86_64.dmg`
- **Helper Script**: `install-helper.sh` (makes installation easier)

---

## ✨ What's New

{{CHANGELOG}}

---

## 🐛 Issues?

If you encounter any problems:

1. Check the [troubleshooting guide](https://github.com/banyudu/redink#troubleshooting)
2. [Open an issue](https://github.com/banyudu/redink/issues/new)

---

## 🙏 Support

If you find Redink useful, please consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs
- 💡 Suggesting features
- 🔧 Contributing code

---

**Full Changelog**: https://github.com/banyudu/redink/compare/{{PREVIOUS_TAG}}...{{TAG}}

