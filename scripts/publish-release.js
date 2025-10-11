#!/usr/bin/env node

import { execSync } from 'child_process';

console.log('📦 Publishing draft release...');
console.log('');
console.log('To publish a draft release, you need to:');
console.log('  1. Go to: https://github.com/banyudu/redink/releases');
console.log('  2. Find the draft release');
console.log('  3. Edit the release notes if needed');
console.log('  4. Click "Publish release"');
console.log('');
console.log('Or use GitHub CLI:');
console.log('  gh release list');
console.log('  gh release edit <tag> --draft=false');
console.log('');

// Try to use gh CLI if available
try {
  execSync('which gh', { stdio: 'ignore' });
  console.log('GitHub CLI detected. Here are your draft releases:');
  console.log('');
  execSync('gh release list --exclude-pre-releases', { stdio: 'inherit' });
  console.log('');
  console.log('To publish a draft release:');
  console.log('  gh release edit <tag> --draft=false');
} catch (error) {
  console.log('GitHub CLI not found. Install it from: https://cli.github.com/');
}

