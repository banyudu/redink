#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read current version from package.json
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;

console.log(`Current version: ${currentVersion}`);

// Prompt for new version
const readline = await import('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question(`Enter new version (current: ${currentVersion}): `, (newVersion) => {
  if (!newVersion || newVersion === currentVersion) {
    console.log('No version change, exiting...');
    rl.close();
    process.exit(0);
  }

  // Validate semantic versioning format
  if (!/^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/.test(newVersion)) {
    console.error('Invalid version format. Please use semantic versioning (e.g., 1.2.3 or 1.2.3-beta.1)');
    rl.close();
    process.exit(1);
  }

  console.log(`Updating version to ${newVersion}...`);

  // Update package.json
  packageJson.version = newVersion;
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log('✓ Updated package.json');

  // Update Cargo.toml
  const cargoTomlPath = join(__dirname, '..', 'src-tauri', 'Cargo.toml');
  let cargoToml = readFileSync(cargoTomlPath, 'utf8');
  cargoToml = cargoToml.replace(/^version = ".*"$/m, `version = "${newVersion}"`);
  writeFileSync(cargoTomlPath, cargoToml);
  console.log('✓ Updated Cargo.toml');

  // Update tauri.conf.json
  const tauriConfPath = join(__dirname, '..', 'src-tauri', 'tauri.conf.json');
  const tauriConf = JSON.parse(readFileSync(tauriConfPath, 'utf8'));
  tauriConf.version = newVersion;
  writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
  console.log('✓ Updated tauri.conf.json');

  // Git operations
  try {
    console.log('\nCommitting changes...');
    execSync('git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json', { stdio: 'inherit' });
    execSync(`git commit -m "chore: bump version to ${newVersion}"`, { stdio: 'inherit' });
    console.log('✓ Committed version changes');

    console.log('\nCreating git tag...');
    execSync(`git tag -a v${newVersion} -m "Release v${newVersion}"`, { stdio: 'inherit' });
    console.log(`✓ Created tag v${newVersion}`);

    console.log('\n✅ Version updated successfully!');
    console.log('\nNext steps:');
    console.log(`  1. Review the changes: git show v${newVersion}`);
    console.log('  2. Push the changes: git push && git push --tags');
    console.log('  3. GitHub Actions will automatically create a draft release');
    console.log('  4. Review and publish the release on GitHub');
  } catch (error) {
    console.error('\n❌ Error during git operations:', error.message);
    console.log('\nYou can manually run:');
    console.log('  git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json');
    console.log(`  git commit -m "chore: bump version to ${newVersion}"`);
    console.log(`  git tag -a v${newVersion} -m "Release v${newVersion}"`);
    console.log('  git push && git push --tags');
  }

  rl.close();
});

