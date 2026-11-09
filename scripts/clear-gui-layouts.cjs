#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

function resolveUserDataPathFromElectron() {
  const electronBinary = require('electron');
  const tempAppPath = path.join(os.tmpdir(), `revealgdb-print-userdata-${process.pid}.js`);
  const packageJson = require(path.join(__dirname, '..', 'package.json'));
  const appName = packageJson.name || packageJson.productName || 'revealGDB';
  const script = [
    'const { app } = require("electron");',
    `app.setName(${JSON.stringify(appName)});`,
    'app.on("window-all-closed", (event) => event.preventDefault());',
    'app.whenReady().then(() => {',
    '  process.stdout.write(`${app.getPath("userData")}\\n`);',
    '  app.quit();',
    '});',
  ].join('\n');

  fs.writeFileSync(tempAppPath, script, 'utf8');

  let output = '';
  try {
    output = execFileSync(electronBinary, [tempAppPath], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    });
  } finally {
    if (fs.existsSync(tempAppPath)) {
      fs.unlinkSync(tempAppPath);
    }
  }

  const userDataPath = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .at(-1);

  if (!userDataPath) {
    throw new Error('Unable to resolve userData path from Electron.');
  }

  return userDataPath;
}

function resolveSettingsPath() {
  if (process.env.REVEALGDB_SETTINGS_PATH) {
    return path.resolve(process.env.REVEALGDB_SETTINGS_PATH);
  }

  const userDataPath = resolveUserDataPathFromElectron();
  return path.join(userDataPath, 'settings.json');
}

let settingsPath;
try {
  settingsPath = resolveSettingsPath();
} catch (error) {
  console.error(`[clear-gui-layouts] Failed to resolve settings path: ${error.message}`);
  process.exit(1);
}

if (!fs.existsSync(settingsPath)) {
  console.error(`[clear-gui-layouts] settings.json not found: ${settingsPath}`);
  process.exit(1);
}

let settings;
try {
  settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
} catch (error) {
  console.error(`[clear-gui-layouts] Failed to parse settings.json: ${error.message}`);
  process.exit(1);
}

const hasLayouts =
  settings &&
  typeof settings === 'object' &&
  settings.gdb &&
  typeof settings.gdb === 'object' &&
  settings.gdb.gui &&
  typeof settings.gdb.gui === 'object' &&
  Object.prototype.hasOwnProperty.call(settings.gdb.gui, 'layouts');

if (!hasLayouts) {
  console.log('[clear-gui-layouts] gdb.gui.layouts is already absent.');
  process.exit(0);
}

delete settings.gdb.gui.layouts;
fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
console.log('[clear-gui-layouts] Removed gdb.gui.layouts from settings.json');
