# .cursor Directory Index

Welcome to the `.cursor` directory documentation hub. This index helps you find the information you need quickly.

## Quick Navigation

### 📚 Core Documentation
- [README.md](./README.md) - Overview of this directory and its purpose
- [INDEX.md](./INDEX.md) - This file - navigation hub
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Quick access to common patterns and commands

### 🏗️ Architecture & Analysis
- [analysis/PROJECT_ARCHITECTURE.md](./analysis/PROJECT_ARCHITECTURE.md) - Complete system architecture documentation

### 📋 Plans & Implementation
- [plans/](./plans/) - Implementation plans, migration guides, and summaries
  - [LANCEDB_0.22.2_UPGRADE.md](./plans/LANCEDB_0.22.2_UPGRADE.md)
  - [HYBRID_RAG_IMPLEMENTATION.md](./plans/HYBRID_RAG_IMPLEMENTATION.md)
  - [RAG_TECHNOLOGY_ANALYSIS.md](./plans/RAG_TECHNOLOGY_ANALYSIS.md)
  - [TESTING_GUIDE.md](./plans/TESTING_GUIDE.md)
  - And more...

### 📝 Notes
- [notes/](./notes/) - Development notes and observations

## Documentation Categories

### Getting Started
For new developers or AI assistants:
1. Start with [README.md](./README.md) to understand the directory structure
2. Review [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) for common patterns
3. Read [PROJECT_ARCHITECTURE.md](./analysis/PROJECT_ARCHITECTURE.md) for system overview
4. Check relevant plans in [plans/](./plans/) for implementation details

### Daily Development
For ongoing work:
- **Quick Lookup**: [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
- **Code Patterns**: See "Code Patterns" section in QUICK_REFERENCE
- **Troubleshooting**: See "Troubleshooting" section in QUICK_REFERENCE
- **Architecture**: [PROJECT_ARCHITECTURE.md](./analysis/PROJECT_ARCHITECTURE.md)

### Planning & Analysis
For feature development:
- **Existing Plans**: Browse [plans/](./plans/)
- **Architecture**: [PROJECT_ARCHITECTURE.md](./analysis/PROJECT_ARCHITECTURE.md)
- **Technology Research**: Check [RAG_TECHNOLOGY_ANALYSIS.md](./plans/RAG_TECHNOLOGY_ANALYSIS.md)

## File Organization

```
.cursor/
├── INDEX.md                    # This file - navigation hub
├── README.md                   # Directory overview and guidelines
├── QUICK_REFERENCE.md          # Quick patterns and commands
│
├── analysis/                   # System analysis and architecture
│   ├── PROJECT_ARCHITECTURE.md # Complete architecture documentation
│   └── .gitkeep
│
├── notes/                      # Development notes
│   └── .gitkeep
│
└── plans/                      # Implementation plans and guides
    ├── BUG_FIX_SUMMARY.md
    ├── CHANGELOG_HYBRID_RAG.md
    ├── HYBRID_RAG_IMPLEMENTATION.md
    ├── IMPLEMENTATION_SUMMARY.md
    ├── LANCEDB_0.22.2_UPGRADE.md
    ├── LANCEDB_MIGRATION_COMPLETE.md
    ├── MIGRATION_SUMMARY.md
    ├── RAG_TECHNOLOGY_ANALYSIS.md
    ├── RUST_LANCEDB_IMPLEMENTATION.md
    ├── RUST_LANCEDB_SUCCESS.md
    ├── TESTING_GUIDE.md
    ├── UPGRADE_SUMMARY.md
    └── VITE_FIX.md
```

## Document Templates

### Creating New Plans
When creating implementation plans, include:
1. **Objective**: What are we trying to achieve?
2. **Current State**: What's the starting point?
3. **Proposed Solution**: How will we achieve it?
4. **Implementation Steps**: Detailed steps
5. **Testing Strategy**: How to verify success
6. **Rollback Plan**: What if it goes wrong?
7. **Timeline**: Estimated duration

### Creating Notes
When creating development notes:
1. **Context**: What problem or feature?
2. **Findings**: What did you discover?
3. **Decisions**: What choices were made and why?
4. **References**: Links, docs, related files
5. **Follow-up**: Next steps or questions

### Creating Analysis
When analyzing the codebase:
1. **Scope**: What are we analyzing?
2. **Current State**: What exists now?
3. **Issues**: What problems exist?
4. **Recommendations**: What should be done?
5. **Impact**: What's the effect of changes?

## Search Tips

### Finding Information

**By Topic:**
- RAG: Check `RAG_TECHNOLOGY_ANALYSIS.md`, `HYBRID_RAG_IMPLEMENTATION.md`
- LanceDB: Check `LANCEDB_*.md` files
- Testing: Check `TESTING_GUIDE.md`
- Bugs: Check `BUG_FIX_SUMMARY.md`

**By Type:**
- Architecture: `analysis/PROJECT_ARCHITECTURE.md`
- Quick Reference: `QUICK_REFERENCE.md`
- Migration Guides: Files with "MIGRATION" or "UPGRADE"
- Implementation: Files with "IMPLEMENTATION"

**By Date:**
- Check file modification dates
- Look for "Last Updated" in documents

## Common Questions

### Q: Where do I add temporary documentation?
**A:** In `.cursor/` directory, organized by type:
- Plans → `plans/`
- Notes → `notes/`
- Analysis → `analysis/`

### Q: Where do I find code examples?
**A:** See [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) "Code Patterns" section

### Q: How do I understand the system architecture?
**A:** Read [PROJECT_ARCHITECTURE.md](./analysis/PROJECT_ARCHITECTURE.md)

### Q: Where are the project rules?
**A:** In `.cursorrules` file at project root

### Q: How do I troubleshoot issues?
**A:** See [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) "Troubleshooting" section

### Q: Where do I find migration guides?
**A:** In `plans/` directory, look for files with "MIGRATION" or "UPGRADE"

### Q: How do I add a new feature?
**A:** 
1. Review similar implementations in `plans/`
2. Check patterns in `QUICK_REFERENCE.md`
3. Follow conventions in `.cursorrules`
4. Document your plan in `plans/`

## Maintenance

### Regular Tasks
- **Weekly**: Review and update outdated plans
- **Monthly**: Archive completed plans (move to subdirectory)
- **Quarterly**: Update PROJECT_ARCHITECTURE.md
- **As Needed**: Update QUICK_REFERENCE.md with new patterns

### Archive Strategy
When plans are completed:
1. Add "✅ COMPLETED" to the top of file
2. Update final status and outcomes
3. Consider moving to `plans/archive/` subdirectory
4. Keep recent and reference plans in main directory

### Document Lifecycle
1. **Draft**: Work in progress, may have TODOs
2. **Active**: Currently relevant, kept up to date
3. **Reference**: Completed but useful for reference
4. **Archive**: Historical, moved to archive subdirectory

## Contributing to Documentation

### Adding New Documents
1. Choose appropriate directory (plans, notes, analysis)
2. Use descriptive, uppercase filename with underscores
3. Include "Last Updated" date at top
4. Update this INDEX.md with new file
5. Follow template for document type

### Updating Existing Documents
1. Update "Last Updated" date
2. Note significant changes at top or in changelog section
3. Maintain consistent formatting
4. Preserve historical context

### Document Naming Conventions
- **Plans**: `FEATURE_IMPLEMENTATION.md`, `TECHNOLOGY_MIGRATION.md`
- **Notes**: `FEATURE_NOTES.md`, `DEBUG_SESSION_YYYY_MM_DD.md`
- **Analysis**: `COMPONENT_ANALYSIS.md`, `PERFORMANCE_AUDIT.md`
- Use prefixes for related files: `LANCEDB_*`, `UI_*`, etc.

## Version History

### October 10, 2025
- Created index structure
- Added PROJECT_ARCHITECTURE.md
- Added QUICK_REFERENCE.md
- Organized existing plans

## Related Resources

### Project Root Files
- `.cursorrules` - Comprehensive project guidelines
- `README.md` - Project overview and setup
- `package.json` - Frontend dependencies
- `src-tauri/Cargo.toml` - Backend dependencies

### External Documentation
- [Tauri Documentation](https://tauri.app/v2/)
- [React Documentation](https://react.dev/)
- [LanceDB Documentation](https://lancedb.github.io/lancedb/)
- [Tailwind CSS](https://tailwindcss.com/)

---

**Note**: This index should be updated whenever new documents are added to the `.cursor` directory.

For questions or suggestions about documentation organization, refer to `.cursorrules` or update this index.

