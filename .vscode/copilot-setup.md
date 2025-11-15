# VS Code Copilot Configuration for Redink

This document describes the VS Code configuration files created to provide equivalent functionality to the Cursor IDE setup for the Redink project.

## Configuration Files Created

### 1. `.vscode/settings.json`
Main workspace settings including:
- GitHub Copilot enablement and configuration
- Language-specific settings for Rust and TypeScript
- File associations and exclusions
- Formatting and code action settings
- Tailwind CSS configuration
- Rust Analyzer settings

### 2. `.vscode/copilot-instructions.md`
Comprehensive instructions for GitHub Copilot containing:
- Project overview and tech stack
- **Critical file organization rules** (`.cursor/` directory usage)
- Code style and conventions
- Common patterns and examples
- Best practices and architecture principles
- Key technology notes
- Development guidelines

### 3. `.vscode/extensions.json`
Recommended extensions for the project:
- Tauri and Rust development
- React and TypeScript support
- AI assistance (GitHub Copilot)
- Code quality and formatting
- General development tools

### 4. `.vscode/launch.json`
Debug configurations for:
- Tauri application debugging
- Frontend development
- Rust backend debugging

### 5. `.vscode/tasks.json`
Build and development tasks:
- Tauri development and build tasks
- Frontend development and build
- Rust testing and linting
- Dependency installation

## Key Differences from Cursor

### File Organization
The most critical rule from `.cursorrules` has been preserved:
- **ALL temporary files MUST go in `.cursor/` directory**
- No markdown files in project root except permanent docs
- Organized structure: `.cursor/plans/`, `.cursor/notes/`, `.cursor/analysis/`

### GitHub Copilot Instructions
The `copilot-instructions.md` file serves the same purpose as `.cursorrules` but is formatted for GitHub Copilot to understand the project context, patterns, and constraints.

### IDE Integration
- VS Code tasks replace Cursor's integrated build system
- Launch configurations provide debugging support
- Extension recommendations ensure consistent development environment

## Usage

### Setting Up
1. Install recommended extensions when prompted
2. GitHub Copilot will automatically read the instructions file
3. Use the defined tasks for development workflow

### Development Workflow
1. Use **Ctrl/Cmd + Shift + P** → "Tasks: Run Task" for build operations
2. Use **F5** to start debugging
3. GitHub Copilot Chat will use the project context from instructions

### Important Notes
- The instructions emphasize the `.cursor/` directory rule for file organization
- All patterns and conventions from the original Cursor setup are preserved
- The configuration supports both frontend and backend development
- Debugging is configured for both Rust and TypeScript

## Verification

To verify the setup is working correctly:
1. Open GitHub Copilot Chat
2. Ask about project structure or patterns
3. Copilot should reference the instruction file content
4. Create any temporary documentation - it should go in `.cursor/`
5. Run tasks using VS Code task runner

The setup maintains the same development experience and code quality standards as the original Cursor configuration while leveraging VS Code's native capabilities and GitHub Copilot integration.