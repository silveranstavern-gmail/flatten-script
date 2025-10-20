// flatten.js
// A self-contained Node.js script to flatten a project structure into a single text file
// for easy inclusion in AI prompts. No external dependencies required!

const fs = require('fs');
const path = require('path');

// --- Configuration ---
const DEFAULT_INPUT_FILE = 'paths.txt';
const OUTPUT_FILE = 'scope.txt';

// --- Size Limits (generous for AI context) ---
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per file (very generous for AI)
const MAX_TOTAL_SIZE = 500 * 1024 * 1024; // 500MB total output
const WARN_FILE_SIZE = 10 * 1024 * 1024; // Warn at 10MB per file

// --- Binary File Detection ---
const BINARY_EXTENSIONS = new Set([
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.svg', '.webp',
    '.mp3', '.wav', '.ogg', '.mp4', '.avi', '.mov', '.wmv', '.flv',
    '.zip', '.tar', '.gz', '.rar', '.7z',
    '.exe', '.dll', '.so', '.dylib',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.ttf', '.otf', '.woff', '.woff2', '.eot',
    '.sqlite', '.db',
    '.jar', '.class',
    '.pyc', '.pyo',
    '.o', '.a',
    '.node',
]);

// --- Language Mappings for Code Blocks ---
const LANGUAGE_MAP = {
    '.ts': 'typescript',
    '.js': 'javascript',
    '.tsx': 'tsx',
    '.jsx': 'jsx',
    '.json': 'json',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.less': 'less',
    '.md': 'markdown',
    '.mdx': 'mdx',
    '.astro': 'astro',
    '.java': 'java',
    '.py': 'python',
    '.rb': 'ruby',
    '.php': 'php',
    '.go': 'go',
    '.rs': 'rust',
    '.c': 'c',
    '.cpp': 'cpp',
    '.cs': 'csharp',
    '.sh': 'shell',
    '.yml': 'yaml',
    '.yaml': 'yaml',
    '.xml': 'xml',
    '.sql': 'sql',
    '.graphql': 'graphql',
    '.svelte': 'svelte',
    '.vue': 'vue',
    '.env': 'shell',
    '.gitignore': 'text',
    '.dockerignore': 'text',
};

/**
 * Check if a file is likely binary based on its extension
 */
function isBinaryFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return BINARY_EXTENSIONS.has(ext);
}

/**
 * Convert paths to the appropriate format for the current platform
 */
function convertToNativePath(filePath) {
    // If we're on Windows, handle both Windows and WSL paths
    if (process.platform === 'win32') {
        // Convert WSL paths back to Windows paths if needed
        if (filePath.startsWith('/mnt/')) {
            const match = filePath.match(/^\/mnt\/([a-z])\/(.*)/);
            if (match) {
                const drive = match[1].toUpperCase();
                const restOfPath = match[2].replace(/\//g, '\\');
                return `${drive}:\\${restOfPath}`;
            }
        }
        return filePath; // Already a Windows path
    }

    // If we're on Linux/WSL, convert Windows paths to WSL format
    if (process.platform === 'linux' && /^[A-Za-z]:\\/.test(filePath)) {
        const drive = filePath.charAt(0).toLowerCase();
        const restOfPath = filePath.substring(3).replace(/\\/g, '/');
        return `/mnt/${drive}/${restOfPath}`;
    }

    return filePath; // Already in the correct format
}

/**
 * Check file size and return stats
 */
function checkFileSize(filePath) {
    try {
        const convertedPath = convertToNativePath(filePath);
        const stats = fs.statSync(convertedPath);
        return {
            exists: true,
            size: stats.size,
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory(),
            convertedPath: convertedPath
        };
    } catch (error) {
        return { exists: false };
    }
}

/**
 * Escape triple backticks in content to prevent breaking markdown code blocks
 */
function escapeCodeBlockDelimiters(content) {
    // Replace triple backticks with a zero-width space inserted between them
    // This maintains visual appearance but prevents markdown parsing issues
    return content.replace(/```/g, '``\u200B`');
}

/**
 * Simple glob-like pattern matching (supports *, **, and ?)
 */
function matchesPattern(filePath, pattern) {
    // Normalize paths to use forward slashes for consistent matching
    const normalizedFilePath = filePath.replace(/\\/g, '/');
    const normalizedPattern = pattern.replace(/\\/g, '/');

    // Handle global patterns that start with **
    if (normalizedPattern.startsWith('**/')) {
        // For **/ patterns, match anywhere in the path
        const subPattern = normalizedPattern.substring(3); // Remove the **/

        // For **/public/*, match any path that contains /public/
        if (subPattern === 'public/*') {
            return normalizedFilePath.includes('/public/');
        }

        const regexStr = subPattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&')
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*')
            .replace(/\?/g, '.');
        const regex = new RegExp(regexStr + '$');
        return regex.test(normalizedFilePath);
    }

    // Handle patterns that start with ** but not **/
    if (normalizedPattern.startsWith('**')) {
        const subPattern = normalizedPattern.substring(2); // Remove the **

        // Simple approach: for **\public\*, match any path containing /public/
        if (subPattern.includes('public')) {
            // Check if the path contains /public/ anywhere
            if (normalizedFilePath.includes('/public/')) {
                return true;
            }
        }

        // For other ** patterns, convert to regex and match anywhere in the path
        const regexStr = subPattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&')
            .replace(/\*/g, '.*');

        const regex = new RegExp(regexStr);
        return regex.test(normalizedFilePath);
    }

    // Convert regular glob pattern to regex
    const regexStr = normalizedPattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special regex characters
        .replace(/\*\*/g, '@@STARSTAR@@')   // Placeholder for ** to avoid conflict with *
        .replace(/\*/g, '[^/]*')             // * matches any character sequence except a slash
        .replace(/@@STARSTAR@@/g, '.*')      // ** matches any character sequence including slashes
        .replace(/\?/g, '.');                // ? matches any single character

    // For absolute paths, do exact matching
    const regex = new RegExp('^' + regexStr + '$');

    // Check if pattern matches the full path or just the end part
    if (regex.test(normalizedFilePath)) {
        return true;
    }

    // For patterns ending with *, also check prefix matching
    if (normalizedPattern.endsWith('*')) {
        const prefixPattern = normalizedPattern.slice(0, -1);
        return normalizedFilePath.startsWith(prefixPattern);
    }

    return false;
}

/**
 * Recursively find all files in a directory
 */
function walkDirectory(dir, baseDir = dir) {
    const results = [];
    
    try {
        const list = fs.readdirSync(dir);
        
        for (const file of list) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            
            if (stat && stat.isDirectory()) {
                // Skip common directories that should almost always be ignored
                if (file === 'node_modules' || file === '.git') {
                    continue;
                }
                results.push(...walkDirectory(filePath, baseDir));
            } else {
                results.push(filePath);
            }
        }
    } catch (error) {
        console.warn(`Warning: Could not read directory ${dir}: ${error.message}`);
    }
    
    return results;
}

/**
 * Parse .gitignore-style file
 */
function parseIgnoreFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return [];
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    const patterns = [];
    
    for (const line of lines) {
        const trimmed = line.trim();
        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }
        patterns.push(trimmed);
    }
    
    return patterns;
}

/**
 * Check if a file matches any ignore pattern
 */
function matchesIgnorePattern(filePath, patterns, basePath) {
    const relativePath = path.relative(basePath, filePath).replace(/\\/g, '/');
    
    for (const pattern of patterns) {
        let testPattern = pattern;
        let isNegation = false;
        
        // Handle negation patterns (starting with !)
        if (pattern.startsWith('!')) {
            isNegation = true;
            testPattern = pattern.substring(1);
        }
        
        // Patterns starting with / are relative to base
        if (testPattern.startsWith('/')) {
            testPattern = testPattern.substring(1);
        }
        
        // Check if the pattern matches
        const matches = matchesPattern(relativePath, testPattern) || 
                       relativePath.split('/').some(part => matchesPattern(part, testPattern));
        
        if (matches && !isNegation) {
            return true;
        }
        if (matches && isNegation) {
            return false;
        }
    }
    
    return false;
}

/**
 * Parse the paths.txt configuration file
 */
function parsePathsFile(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error(`Error: Input file not found at '${filePath}'`);
        process.exit(1);
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/).filter(line => line.trim() && !line.trim().startsWith('#'));
    
    const config = {
        include: [],
        exclude: [],
        ignoreFiles: [],
        ignoreExtensions: [],
    };
    
    for (const line of lines) {
        let cleanLine = line.trim();
        
        if (cleanLine.startsWith('--ignorefile:')) {
            const ignorePath = cleanLine.substring('--ignorefile:'.length).trim();
            config.ignoreFiles.push(ignorePath);
        } else if (cleanLine.startsWith('--ignoreextension:')) {
            const ext = cleanLine.substring('--ignoreextension:'.length).trim();
            config.ignoreExtensions.push(ext.toLowerCase());
        } else if (cleanLine.startsWith('++')) {
            const pattern = cleanLine.substring(2).trim().replace(/['"]/g, '');
            config.include.push(pattern);
        } else if (cleanLine.startsWith('--')) {
            const pattern = cleanLine.substring(2).trim().replace(/['"]/g, '');
            config.exclude.push(pattern);
        }
    }
    
    return config;
}

/**
 * Find all files based on configuration
 */
function findFiles(config) {
    const allFiles = new Set();
    
    // Process include patterns
    for (const pattern of config.include) {
        // Handle Windows absolute paths and Unix absolute paths
        let absolutePattern;
        if (path.isAbsolute(pattern) || /^[A-Za-z]:\\/.test(pattern)) {
            // Pattern is already absolute (Unix) or Windows-style absolute
            absolutePattern = pattern;
        } else {
            // Pattern is relative, resolve it
            absolutePattern = path.resolve(pattern);
        }

        // Check if it's a file or directory
        const stats = checkFileSize(absolutePattern);

        if (stats.exists) {
            if (stats.isFile) {
                allFiles.add(stats.convertedPath);
            } else if (stats.isDirectory) {
                const files = walkDirectory(stats.convertedPath);
                files.forEach(f => allFiles.add(f));
            }
        } else {
            // Try to find files matching the pattern
            const convertedDir = convertToNativePath(path.dirname(absolutePattern));
            const baseName = path.basename(pattern);

            if (baseName.includes('*') || baseName.includes('?')) {
                // It's a glob pattern
                if (fs.existsSync(convertedDir)) {
                    const files = walkDirectory(convertedDir);
                    files.forEach(f => {
                        if (matchesPattern(f, absolutePattern)) {
                            allFiles.add(f);
                        }
                    });
                }
            }
        }
    }
    
    // Filter files based on exclusion patterns
    let finalFiles = Array.from(allFiles);

    if (config.exclude.length > 0) {
        finalFiles = finalFiles.filter(file => {
            // A file is kept if it does NOT match any exclusion pattern
            return !config.exclude.some(pattern => {
                let patternToTest = pattern;

                // Handle different types of patterns
                if (pattern.startsWith('**')) {
                    // Global patterns like **\package-lock.json or **\public\*
                    patternToTest = pattern;
                } else if (path.isAbsolute(pattern) || /^[A-Za-z]:\\/.test(pattern)) {
                    // Already absolute patterns from paths.txt - convert to native format
                    patternToTest = convertToNativePath(pattern);
                } else {
                    // Relative patterns - resolve to absolute
                    patternToTest = path.resolve(pattern);
                }

                return matchesPattern(file, patternToTest);
            });
        });
    }

    // Apply ignore file patterns
    if (config.ignoreFiles.length > 0) {
        const ignorePatterns = [];
        for (const ignoreFile of config.ignoreFiles) {
            ignorePatterns.push(...parseIgnoreFile(ignoreFile));
        }

        if (ignorePatterns.length > 0) {
            finalFiles = finalFiles.filter(file => {
                return !matchesIgnorePattern(file, ignorePatterns, process.cwd());
            });
        }
    }
    
    // Filter by ignored extensions
    if (config.ignoreExtensions.length > 0) {
        finalFiles = finalFiles.filter(file => {
            const fileExt = path.extname(file).toLowerCase();
            return !config.ignoreExtensions.includes(fileExt);
        });
    }
    
    return finalFiles.sort();
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    const size = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
    return `${size} ${sizes[i]}`;
}

/**
 * Generate project tree structure with file sizes
 */
function generateProjectTree(files) {
    if (files.length === 0) return 'No files to include.';

    // Find common base path
    const normalizedFiles = files.map(f => f.replace(/\\/g, '/'));
    const [first, ...rest] = normalizedFiles;
    let commonPrefix = first.split('/');

    rest.forEach(file => {
        const parts = file.split('/');
        let i = 0;
        while (i < commonPrefix.length && i < parts.length && commonPrefix[i] === parts[i]) {
            i++;
        }
        commonPrefix = commonPrefix.slice(0, i);
    });

    const basePath = commonPrefix.join('/') + '/';
    const rootDir = path.basename(commonPrefix[commonPrefix.length - 1] || process.cwd());

    // Build tree structure with file size info
    const tree = {};
    const fileMap = new Map(); // Map to store original file paths

    for (const file of normalizedFiles) {
        const relativePath = file.substring(basePath.length);
        const parts = relativePath.split('/');
        let currentLevel = tree;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (!currentLevel[part]) {
                currentLevel[part] = {};
            }

            // If this is the last part (the file), store the original file path
            if (i === parts.length - 1) {
                fileMap.set(relativePath, file);
            }

            currentLevel = currentLevel[part];
        }
    }

    // Calculate folder sizes recursively
    function calculateFolderSize(node, currentPath = '') {
        let totalSize = 0;

        for (const [key, value] of Object.entries(node)) {
            const entryPath = currentPath ? `${currentPath}/${key}` : key;

            if (Object.keys(value).length === 0) {
                // This is a file
                const originalFilePath = fileMap.get(entryPath);
                if (originalFilePath) {
                    try {
                        const stats = fs.statSync(originalFilePath);
                        totalSize += stats.size;
                    } catch (error) {
                        // Skip files we can't read
                    }
                }
            } else {
                // This is a folder, recursively calculate its size
                totalSize += calculateFolderSize(value, entryPath);
            }
        }

        return totalSize;
    }

    function buildTreeString(node, prefix = '', currentPath = '') {
        let result = '';
        const entries = Object.keys(node).sort();

        entries.forEach((entry, index) => {
            const isLast = index === entries.length - 1;
            const connector = isLast ? '└── ' : '├── ';
            const newPrefix = prefix + (isLast ? '    ' : '│   ');
            const entryPath = currentPath ? `${currentPath}/${entry}` : entry;

            let displayName = entry;

            // Check if this is a file (no children) and add size info
            if (Object.keys(node[entry]).length === 0) {
                const originalFilePath = fileMap.get(entryPath);
                if (originalFilePath) {
                    try {
                        const stats = fs.statSync(originalFilePath);
                        const sizeStr = formatFileSize(stats.size);
                        displayName = `${entry} - ${sizeStr}`;
                    } catch (error) {
                        // If we can't get size, just show the filename
                        displayName = entry;
                    }
                }
            } else {
                // This is a folder, add folder size
                const folderSize = calculateFolderSize(node[entry], entryPath);
                const sizeStr = formatFileSize(folderSize);
                displayName = `${entry} - ${sizeStr}`;
            }

            result += prefix + connector + displayName + '\n';
            if (Object.keys(node[entry]).length > 0) {
                result += buildTreeString(node[entry], newPrefix, entryPath);
            }
        });
        return result;
    }

    // Calculate total project size
    const totalSize = calculateFolderSize(tree);
    const totalSizeStr = formatFileSize(totalSize);

    return `${rootDir} - ${totalSizeStr}\n${buildTreeString(tree)}`;
}

/**
 * Aggregate file contents with proper handling
 */
function aggregateFileContents(files) {
    let combinedContent = '';
    let totalSize = 0;
    let skippedFiles = [];
    let processedCount = 0;
    
    for (const file of files) {
        try {
            const stats = checkFileSize(file);
            
            // Skip non-existent files
            if (!stats.exists || !stats.isFile) {
                console.warn(`Warning: Skipping non-file: ${file}`);
                continue;
            }
            
            // Check total size limit
            if (totalSize + stats.size > MAX_TOTAL_SIZE) {
                console.warn(`Warning: Reached total size limit. Stopping processing.`);
                skippedFiles.push(`${file} (total size limit reached)`);
                break;
            }
            
            // Check individual file size
            if (stats.size > MAX_FILE_SIZE) {
                console.warn(`Warning: File too large (${(stats.size / 1024 / 1024).toFixed(2)}MB): ${file}`);
                skippedFiles.push(`${file} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
                continue;
            }
            
            // Warn about large files
            if (stats.size > WARN_FILE_SIZE) {
                console.log(`Note: Including large file (${(stats.size / 1024 / 1024).toFixed(2)}MB): ${file}`);
            }
            
            const relativePath = path.relative(process.cwd(), file).replace(/\\/g, '/');
            
            // Handle binary files
            if (isBinaryFile(file)) {
                combinedContent += `--- FILE: ${relativePath} ---\n`;
                combinedContent += `[Binary file excluded - ${(stats.size / 1024).toFixed(2)}KB]\n`;
                combinedContent += `--- END FILE: ${relativePath} ---\n\n`;
                processedCount++;
                continue;
            }
            
            // Read and process text files
            const content = fs.readFileSync(file, 'utf8');
            const ext = path.extname(file).toLowerCase();
            const language = LANGUAGE_MAP[ext] || '';
            
            // Escape triple backticks to prevent markdown issues
            const escapedContent = escapeCodeBlockDelimiters(content);
            
            combinedContent += `--- FILE: ${relativePath} ---\n`;
            combinedContent += `\`\`\`${language}\n`;
            combinedContent += escapedContent;
            combinedContent += `\n\`\`\`\n`;
            combinedContent += `--- END FILE: ${relativePath} ---\n\n`;
            
            totalSize += stats.size;
            processedCount++;
            
        } catch (error) {
            console.warn(`Warning: Could not read file ${file}. Error: ${error.message}`);
            skippedFiles.push(`${file} (read error)`);
        }
    }
    
    // Report summary
    console.log(`\nProcessed ${processedCount} of ${files.length} files`);
    console.log(`Total output size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
    
    if (skippedFiles.length > 0) {
        console.log(`\nSkipped ${skippedFiles.length} files:`);
        skippedFiles.forEach(f => console.log(`  - ${f}`));
    }
    
    return combinedContent;
}

/**
 * Main function
 */
function main() {
    console.log("Starting self-contained project flattener...");
    console.log("No external dependencies required!\n");
    
    const inputFile = process.argv[2] || DEFAULT_INPUT_FILE;
    console.log(`Using input configuration: '${inputFile}'`);
    
    // Parse configuration
    const config = parsePathsFile(inputFile);
    console.log(`Found ${config.include.length} include patterns and ${config.exclude.length} exclude patterns.`);
    
    // Find files
    const filesToInclude = findFiles(config);
    if (filesToInclude.length === 0) {
        console.log("No files matched the criteria. Exiting.");
        return;
    }
    console.log(`Found ${filesToInclude.length} files to process...\n`);
    
    // Generate output
    const projectTree = generateProjectTree(filesToInclude);
    const fileContents = aggregateFileContents(filesToInclude);
    
    const finalOutput = `--- PROJECT STRUCTURE ---\n\n${projectTree}\n--- FILE CONTENTS ---\n\n${fileContents}`;
    
    // Write output
    try {
        fs.writeFileSync(OUTPUT_FILE, finalOutput, 'utf8');
        const outputStats = fs.statSync(OUTPUT_FILE);
        console.log(`\n✅ Success! Project flattened into '${OUTPUT_FILE}'`);
        console.log(`   Output file size: ${(outputStats.size / 1024 / 1024).toFixed(2)}MB`);
    } catch (error) {
        console.error(`Error writing output file: ${error.message}`);
        process.exit(1);
    }
}

// --- Execute Script ---
try {
    main();
} catch (error) {
    console.error(`Fatal error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
}