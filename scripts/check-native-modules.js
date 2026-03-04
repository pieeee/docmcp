#!/usr/bin/env node

/**
 * Post-install script to check native module availability
 * and provide helpful error messages if compilation failed.
 */

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

function log(color, symbol, message) {
  console.log(`${color}${symbol}${RESET} ${message}`);
}

// Check better-sqlite3
try {
  require('better-sqlite3');
  log(GREEN, '✓', 'better-sqlite3: OK');
} catch (error) {
  log(RED, '✗', 'better-sqlite3: Failed to load');
  console.log('');
  console.log('  better-sqlite3 requires native compilation.');
  console.log('  This usually means you need build tools installed:');
  console.log('');

  if (process.platform === 'win32') {
    console.log('  Windows:');
    console.log('    1. Install Visual Studio Build Tools');
    console.log('       https://visualstudio.microsoft.com/visual-cpp-build-tools/');
    console.log('    2. Or run: npm install --global windows-build-tools');
    console.log('    3. Then retry: npm install -g docmcp');
  } else if (process.platform === 'darwin') {
    console.log('  macOS:');
    console.log('    1. Install Xcode Command Line Tools:');
    console.log('       xcode-select --install');
    console.log('    2. Then retry: npm install -g docmcp');
  } else {
    console.log('  Linux:');
    console.log('    1. Install build essentials:');
    console.log('       Ubuntu/Debian: sudo apt-get install build-essential python3');
    console.log('       Fedora: sudo dnf install gcc-c++ make python3');
    console.log('    2. Then retry: npm install -g docmcp');
  }
  console.log('');
  console.log('  For more help: https://github.com/WiseLibs/better-sqlite3/blob/master/docs/troubleshooting.md');
  console.log('');
  process.exit(1);
}

// Check sqlite-vec (optional - graceful degradation)
try {
  require('sqlite-vec');
  log(GREEN, '✓', 'sqlite-vec: OK (vector search enabled)');
} catch (error) {
  log(YELLOW, '⚠', 'sqlite-vec: Not available');
  console.log('');
  console.log('  Vector search will be disabled.');
  console.log('  BM25 keyword search will still work.');
  console.log('');
  console.log('  This is fine for most use cases. Vector search provides');
  console.log('  semantic matching but requires the sqlite-vec extension.');
  console.log('');
}

console.log('');
log(GREEN, '✓', 'DocMCP is ready to use!');
console.log('');
console.log('  Get started:');
console.log('    docmcp init');
console.log('    docmcp add https://your-docs-site.com/docs');
console.log('');
