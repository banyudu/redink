# Redink

A modern desktop application for managing and chatting with ArXiv papers using local LLM models.

## Download & Installation

### For End Users

Download the latest release from the [Releases page](https://github.com/banyudu/redink/releases/latest).

#### macOS Installation

⚠️ **Important**: You will see a **"Redink is damaged"** error on first launch. This is normal for unsigned apps.

**Quick Fix (Recommended)**:
```bash
# After downloading, run in Terminal:
xattr -cr ~/Downloads/Redink*.dmg
# After installing to Applications:
xattr -cr /Applications/Redink.app
```

**Alternative - System Settings**:
1. Try to open Redink (it will fail with an error)
2. Go to **System Settings** → **Privacy & Security**
3. Scroll down and click **"Open Anyway"** next to the Redink warning
4. Click **Open** in the confirmation dialog

**Why this happens**: Redink is not notarized with Apple (requires $99/year developer account). The app is safe to use - this is just macOS Gatekeeper protecting against unsigned apps.

#### Helper Script

Download `install-helper.sh` from the releases page and run:
```bash
bash install-helper.sh
```

This interactive script will automatically fix the Gatekeeper issue for you.

---

## For Developers

### Project Setup

### Prerequisites
- Node.js (v18 or later)
- pnpm (v8 or later)

### Installation
```bash
# Install dependencies
pnpm install
```

### Development
```bash
# Start development server (frontend only)
pnpm dev

# Start Tauri app in development mode
pnpm tauri dev
```

### Debug Features (Development Only)

⚠️ **Security Note**: Debug features are automatically disabled in production builds for security reasons.

#### DevTools Access Backdoor
In development mode, you can access DevTools using a secret combination:
1. Hold `Cmd` (macOS) or `Ctrl` (Windows/Linux)
2. Click the **Redink logo** in the top-left corner **5 times** within **2 seconds**
3. DevTools will open (when implementation is complete)

**Visual Feedback**:
- A red pulsing dot appears next to the logo when the modifier key is held
- The title tooltip shows current click progress

**Security**: This backdoor is completely disabled in production builds to prevent unauthorized access.

#### Enhanced Error Handling
- **Detailed error messages** for ArXiv API failures
- **Toast notifications** for better error visibility
- **Automatic retry buttons** for failed operations
- **Console logging** with detailed error context

### Building
```bash
# Build the frontend
pnpm build

# Build Tauri app for production (no debug features)
pnpm tauri build

# Build Tauri app with debug features (for testing)
pnpm tauri:build:debug
```

### Release Management
```bash
# Draft a new release (updates version and creates git tag)
pnpm release:draft

# Publish a draft release
pnpm release:publish
```

For detailed release setup instructions, see:
- [Quick Release Guide](RELEASE.md)
- [Detailed Release Setup](.github/RELEASE_SETUP.md)

## Recent Changes

### UI Refactoring
1. Removed Material-UI (MUI) dependencies
2. Integrated Tailwind CSS v4.1.8
3. Added shadcn/ui components
4. Updated styling to use standard Tailwind classes

### Configuration Updates
- Removed `tailwind.config.js` (using default configuration)
- Updated `postcss.config.cjs` for Tailwind CSS v4
- Simplified `src/index.css` by removing custom CSS variables and `@apply` directives

## Next Steps

### 1. Component Development
- [ ] Complete remaining shadcn/ui component implementations
- [ ] Add dark mode support
- [ ] Implement responsive design improvements

### 2. Feature Implementation
- [ ] Paper search and management
- [ ] Chat interface with local LLM integration
- [ ] Settings page functionality
- [ ] Local storage management

### 3. Testing & Documentation
- [ ] Add unit tests
- [ ] Add integration tests
- [ ] Improve documentation
- [ ] Add API documentation

### 4. Performance Optimization
- [ ] Implement code splitting
- [ ] Optimize bundle size
- [ ] Add performance monitoring

## Project Structure
```
src/
├── components/     # Reusable UI components
│   └── ui/        # shadcn/ui primitive components
├── pages/         # Page components
├── store/         # State management (Zustand)
├── lib/           # Business logic and utilities
└── i18n/          # Internationalization

src-tauri/
├── src/           # Rust source code
├── icons/         # App icons
└── capabilities/  # Tauri security capabilities

.github/
└── workflows/     # GitHub Actions (release automation)

scripts/
├── draft-release.js   # Version bump and tagging
├── publish-release.js # Release publishing helper
└── generate-keys.sh   # Generate signing keys for updates
```

## Features

- 📄 **PDF Viewer**: Built-in PDF viewer with search and navigation
- 💬 **AI Chat**: Chat with papers using local LLM models (Ollama)
- 🔍 **Vector Search**: RAG (Retrieval Augmented Generation) with LanceDB
- 🌐 **arXiv Integration**: Import papers directly from arXiv
- 🔄 **Auto Updates**: Seamless app updates via Tauri updater
- 🎨 **Modern UI**: Beautiful interface with Tailwind CSS and shadcn/ui
- 🌙 **Dark Mode**: Full dark mode support
- 🌍 **i18n**: Multi-language support (English, Chinese)
- 💾 **Offline First**: All data stored locally

## Troubleshooting

### macOS: "Redink is damaged and can't be opened"

This is a false positive from macOS Gatekeeper. See the [Installation section](#macos-installation) above for fixes.

**To check detailed logs**:
```bash
# Launch from terminal to see errors
/Applications/Redink.app/Contents/MacOS/Redink

# Or watch system logs
log stream --predicate 'process == "Redink"' --level debug
```

### macOS: App won't open after fixing quarantine

Try:
1. Right-click on Redink.app → **Open** (not just double-click)
2. Check Console.app for error messages
3. Verify quarantine is removed: `xattr /Applications/Redink.app`

### Other Issues

1. Check the [Issues page](https://github.com/banyudu/redink/issues) for existing problems
2. [Open a new issue](https://github.com/banyudu/redink/issues/new) with:
   - Your OS version
   - Redink version
   - Steps to reproduce
   - Any error messages or logs

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines (if available).

## License

MIT - see [LICENSE](LICENSE) for details.
