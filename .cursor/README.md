# .cursor Directory

This directory contains all temporary files, plans, summaries, and analysis documents generated during development with AI assistants.

## Directory Structure

```
.cursor/
├── README.md           # This file
├── plans/              # Implementation plans, migration guides, summaries
├── notes/              # Development notes, research findings
└── analysis/           # Code analysis, architecture documents
```

## Purpose

The `.cursor/` directory serves as a centralized location for all AI-generated temporary documentation and planning materials. This keeps the project root clean while maintaining valuable development context.

## File Types

### Plans (`plans/`)
- Implementation plans and roadmaps
- Migration guides (e.g., LanceDB upgrades, UI refactoring)
- Feature implementation summaries
- Testing guides
- Change logs for major updates

### Notes (`notes/`)
- Development notes and observations
- Research findings and technical investigations
- Quick reference materials
- Problem-solving documentation

### Analysis (`analysis/`)
- Code architecture analysis
- Technology comparisons and evaluations
- Performance analysis
- Dependency audits

## Guidelines

### What Belongs Here
✅ All markdown files generated during AI-assisted development
✅ Planning documents and implementation strategies
✅ Technical analysis and research notes
✅ Temporary documentation and summaries
✅ Migration guides and upgrade notes
✅ Development logs and progress tracking

### What Doesn't Belong Here
❌ Project README.md (stays in root)
❌ LICENSE file (stays in root)
❌ Package documentation (package.json, Cargo.toml)
❌ User-facing documentation (should be in docs/ if needed)
❌ Configuration files
❌ Source code or tests

## Maintenance

### Periodic Cleanup
- Review files quarterly
- Archive obsolete plans
- Consolidate related documents
- Remove redundant information

### File Naming
- Use descriptive, uppercase names with underscores
- Include context in filename: `FEATURE_IMPLEMENTATION.md`
- Use prefixes for related files: `LANCEDB_*`, `UI_*`, etc.
- Date significant updates: `MIGRATION_2024_01.md`

## Current Contents

### Plans Directory
- `BUG_FIX_SUMMARY.md` - Bug fixes and resolutions
- `CHANGELOG_HYBRID_RAG.md` - Hybrid RAG implementation changes
- `HYBRID_RAG_IMPLEMENTATION.md` - Hybrid RAG feature implementation
- `IMPLEMENTATION_SUMMARY.md` - General implementation summaries
- `LANCEDB_0.22.2_UPGRADE.md` - LanceDB upgrade to version 0.22.2
- `LANCEDB_MIGRATION_COMPLETE.md` - LanceDB migration completion notes
- `MIGRATION_SUMMARY.md` - Migration summaries
- `RAG_TECHNOLOGY_ANALYSIS.md` - RAG technology research and analysis
- `RUST_LANCEDB_IMPLEMENTATION.md` - Rust LanceDB implementation details
- `RUST_LANCEDB_SUCCESS.md` - Rust LanceDB implementation success notes
- `TESTING_GUIDE.md` - Testing guidelines and procedures
- `UPGRADE_SUMMARY.md` - Upgrade summaries
- `VITE_FIX.md` - Vite configuration fixes

## Integration with Cursor Rules

This directory structure is enforced by the `.cursorrules` file at the project root. All AI assistants working on this project are configured to:

1. Place all temporary files in `.cursor/` and subdirectories
2. Never create markdown files in the project root (except permanent docs)
3. Organize files by type (plans, notes, analysis)
4. Use consistent naming conventions
5. Keep project structure clean and maintainable

## Benefits

1. **Clean Project Root**: No clutter from temporary planning documents
2. **Centralized Context**: All development notes in one place
3. **Easy Discovery**: Clear organization makes finding information easier
4. **Version Control**: Can be committed to track development history
5. **Collaboration**: Team members can review AI-assisted development process
6. **Knowledge Base**: Builds a searchable knowledge base over time

## Usage Tips

### For Developers
- Check this directory before starting new features
- Review related plans and summaries
- Add notes about complex decisions
- Update existing documents rather than creating duplicates

### For AI Assistants
- Always output temporary files to `.cursor/`
- Use appropriate subdirectories (plans, notes, analysis)
- Create clear, descriptive filenames
- Reference related files in documents
- Update this README when creating new subdirectories

## Git Considerations

This directory can be:
- **Committed**: Track development history and context
- **Ignored**: Keep only in local environment (add to .gitignore)

Current Status: **Committed** (visible in git status)

## Contact

For questions about this directory structure or cursor rules, refer to:
- `.cursorrules` file in project root
- Project README.md for general information

