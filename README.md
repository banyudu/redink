# Redink

A modern web application for managing and chatting with Arxiv papers using local LLM models.

## Project Setup

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

### Building
```bash
# Build the frontend
pnpm build

# Build Tauri app for production
pnpm tauri build
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

## Contributing
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License
MIT
