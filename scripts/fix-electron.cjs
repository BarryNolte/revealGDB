#!/usr/bin/env node
'use strict';

/**
 * fix-electron.cjs
 *
 * Repairs the electron binary installation on Windows after `npm install`.
 * The electron install.js postinstall script silently fails to extract the
 * binary on this machine. This script detects the missing binary and
 * re-extracts from the local cache using PowerShell's Expand-Archive.
 *
 * Called via the "postinstall" npm script.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

if (process.platform !== 'win32') process.exit(0);

const electronDir = path.join(__dirname, '..', 'node_modules', 'electron');
const distDir = path.join(electronDir, 'dist');
const pathFile = path.join(electronDir, 'path.txt');
const electronExe = path.join(distDir, 'electron.exe');

// Check if already correctly installed
if (
  fs.existsSync(pathFile) &&
  fs.readFileSync(pathFile, 'utf-8') === 'electron.exe' &&
  fs.existsSync(electronExe)
) {
  process.exit(0);
}

console.log('[fix-electron] Binary missing — repairing electron installation...');

const { downloadArtifact } = require('@electron/get');
const { version } = require(path.join(electronDir, 'package.json'));
const checksums = require(path.join(electronDir, 'checksums.json'));

downloadArtifact({
  version,
  artifactName: 'electron',
  checksums,
  platform: 'win32',
  arch: process.arch,
})
  .then((zipPath) => {
    console.log('[fix-electron] Extracting from cache:', zipPath);
    execSync(
      `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${distDir}' -Force"`,
      { stdio: 'inherit' }
    );
    fs.writeFileSync(pathFile, 'electron.exe');
    console.log('[fix-electron] Done.');
  })
  .catch((err) => {
    console.error('[fix-electron] Failed to repair electron:', err.message);
    process.exit(1);
  });
