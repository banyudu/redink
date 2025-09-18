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
# Start development server
pnpm dev
```

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
├── pages/         # Page components
├── store/         # State management
├── lib/           # Utility functions
└── styles/        # Global styles
```

## Contributing
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License
MIT
