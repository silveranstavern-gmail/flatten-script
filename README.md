# Project Flattener

A self-contained Node.js utility that flattens your project structure into a single text file, making it easy to provide comprehensive context to AI assistants like Claude.

## Why This Exists

When working with AI assistants on coding projects, you often need to provide context about your codebase. Copying and pasting individual files is tedious, and explaining your project structure takes time. This tool solves that problem by automatically aggregating your project files into a single, well-formatted document that's perfect for AI prompts.

## Features

- **Zero Dependencies** - Pure Node.js, no npm packages required
- **Smart File Detection** - Automatically excludes binary files and shows their sizes
- **Flexible Patterns** - Supports glob patterns (`*`, `**`, `?`) and gitignore-style exclusions
- **Size Management** - Built-in size limits with warnings for large files
- **Visual Project Tree** - Generates a tree structure with file sizes
- **Format Preservation** - Wraps code in proper markdown code blocks with syntax highlighting
- **Cross-Platform** - Works on Windows, Linux, and WSL
- **Safety Features** - Escapes triple backticks to prevent markdown parsing issues

## Installation

1. Clone this repository:
```bash
git clone <your-repo-url>
cd project-flattener
```

2. No additional installation needed! The script uses only Node.js built-ins.

## Quick Start

1. Create a `paths.txt` file with your include/exclude patterns (see Configuration below)
2. Run the script:
```bash
node flatten.js
```
3. Your flattened project will be saved to `scope.txt`

### Using a Different Config File

```bash
node flatten.js my-config.txt
```

## Configuration

Create a `paths.txt` file (or any name you prefer) with the following syntax:

### Include Patterns
Use `++` to include files or directories:
```
++ /path/to/file.js
++ /path/to/directory
++ ../relative/path/**/*.ts
```

### Exclude Patterns
Use `--` to exclude files or directories:
```
-- **/node_modules/*
-- **/dist/*
-- **/*.test.js
```

### Ignore Files
Import patterns from gitignore-style files:
```
--ignorefile:.gitignore
--ignorefile:.dockerignore
```

### Ignore Extensions
Exclude all files with specific extensions:
```
--ignoreextension:.md
--ignoreextension:.jpg
--ignoreextension:.png
```

### Comments
Lines starting with `#` are ignored:
```
# This is a comment
++ src/**/*.js
```

## Configuration Examples

### Example 1: Simple Blog Project
```
# Include specific pages and posts
++ ../astro/my-blog/src/pages/index.astro
++ ../astro/my-blog/src/pages/blog/**/*.astro
++ ../astro/my-blog/src/content/blog/*.md

# Exclude build artifacts
-- **/node_modules/*
-- **/dist/*
-- **/.astro/*
```

### Example 2: Full Project with Exclusions
```
# Include entire project
++ "C:\Users\username\projects\my-app"

# Exclude common directories
-- "C:\Users\username\projects\my-app\.git\*"
-- "C:\Users\username\projects\my-app\node_modules\*"
-- "C:\Users\username\projects\my-app\dist\*"

# Use gitignore
--ignorefile:.gitignore

# Ignore images and media
--ignoreextension:.jpg
--ignoreextension:.png
--ignoreextension:.mp4
```

### Example 3: Multiple Projects
```
# Backend API
++ /projects/api/src/**/*.js
++ /projects/api/package.json

# Frontend
++ /projects/web/src/**/*.tsx
++ /projects/web/src/**/*.css

# Shared config
++ /projects/shared/config.json

# Exclude tests everywhere
-- **/*.test.js
-- **/*.spec.ts
```

## Pattern Matching

### Glob Patterns
- `*` - Matches any characters except `/`
- `**` - Matches any characters including `/`
- `?` - Matches exactly one character

### Pattern Examples
- `**/*.js` - All JavaScript files in any directory
- `src/**/*.ts` - All TypeScript files under src/
- `*.json` - JSON files in the root only
- `**/test/*.js` - JavaScript files in any test directory
- `**/.env` - All .env files anywhere

## Size Limits

The script has built-in safety limits:
- **Per File**: 50MB maximum (warning at 10MB)
- **Total Output**: 500MB maximum
- Files exceeding limits are automatically skipped with warnings

## Output Format

The generated `scope.txt` file contains:

1. **Project Structure** - A tree view with file sizes:
```
my-project - 2.5 MB
├── src - 1.8 MB
│   ├── index.js - 156 KB
│   └── utils.js - 89 KB
└── package.json - 2.1 KB
```

2. **File Contents** - Each file wrapped in markdown code blocks:
```
--- FILE: src/index.js ---
```javascript
// Your code here
```
--- END FILE: src/index.js ---
```

## Tips & Best Practices

### For AI Context
- Include your main source files and key configuration
- Exclude test files unless you're debugging tests
- Include README and documentation files
- Keep total size under 100MB for best AI performance

### Performance
- Exclude `node_modules`, `dist`, `.git` directories
- Use `--ignoreextension` for media files
- Import your existing `.gitignore` with `--ignorefile`

### Debugging
- Run with a small config first to verify patterns
- Check console output for warnings about skipped files
- Use absolute paths if relative paths aren't working

## Common Issues

### Files Not Included
- Check that your patterns match the actual file paths
- Use absolute paths for clarity
- Remember `**` matches across directories, `*` doesn't

### Path Errors on Windows/WSL
- The script auto-converts between Windows and WSL paths
- Use Windows-style paths (`C:\...`) or WSL paths (`/mnt/c/...`)
- Mixing styles in the same config file is fine

### Output Too Large
- Exclude more directories (node_modules, dist, build)
- Use `--ignoreextension` for images and media
- Split your project into multiple flattened files

## Use Cases

- **AI Pair Programming** - Share your entire codebase with Claude
- **Code Reviews** - Package code for remote review
- **Documentation** - Generate comprehensive project snapshots
- **Debugging** - Share full context when asking for help
- **Archiving** - Create readable backups of project state

## Contributing

Contributions are welcome! This is a simple, dependency-free tool that should stay that way. If you have ideas for improvements:

1. Keep it dependency-free
2. Maintain cross-platform compatibility
3. Add tests for new pattern matching features
4. Update this README with new features

## License

Public Domain

## Author

Silver

## Support

If you find this tool helpful, please star the repository! For issues or questions, please open a GitHub issue.

---

**Happy flattening!** 🚀
