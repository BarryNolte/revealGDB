/**
 * Implements add_docs for revealGDB.
 *
 * @remarks
 * Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const exts = ['.ts', '.tsx', '.js', '.jsx'];
const skipDirs = ['node_modules', 'out', 'dist', '.git', 'docs/api/assets'];
/**
 * Performs walk as part of this module's internal workflow.
 *
 * @param dir - dir parameter.
 * @returns The computed result produced by this operation.
 */

function walk(dir) {
  const res = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = path.relative(repoRoot, full);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (skipDirs.some((d) => rel.startsWith(d))) continue;
      res.push(...walk(full));
    } else if (stat.isFile()) {
      if (exts.includes(path.extname(name))) res.push(full);
    }
  }
  return res;
}
/**
 * Performs hasFileHeader as part of this module's internal workflow.
 *
 * @param content - content parameter.
 * @returns The computed result produced by this operation.
 */

function hasFileHeader(content) {
  const m = content.match(/^\s*\/\*\*/m);
  return !!m && m.index < 200; // header near top
}
/**
 * Performs insertFileHeader as part of this module's internal workflow.
 *
 * @param content - content parameter.
 * @param filePath - filePath parameter.
 * @returns The computed result produced by this operation.
 */

function insertFileHeader(content, filePath) {
  const base = path.basename(filePath);
  const name = base.replace(/\.(ts|tsx|js|jsx)$/i, '');
  const header = `/**\n * Implements ${name} for revealGDB.\n *\n * @remarks\n * Keep this module focused on one cohesive concern to reduce cross-layer coupling.\n */\n`;
  return header + content;
}

function hasJSDocBeforeIndex(content, idx) {
  // Check up to 6 lines before idx for a /**
  const before = content.slice(Math.max(0, idx - 300), idx);
  return /\/\*\*[\s\S]*?\*\//.test(before.split('\n').slice(-6).join('\n'));
}
/**
 * Performs makeJSDocForFunction as part of this module's internal workflow.
 *
 * @param name - name parameter.
 * @param params - params parameter.
 * @param hasReturn - hasReturn parameter.
 * @returns The computed result produced by this operation.
 */

function makeJSDocForFunction(name, params, hasReturn) {
  const lines = [];
  lines.push('/**');
  lines.push(` * Performs ${name} as part of this module's internal workflow.`);
  lines.push(' *');
  if (params && params.length) {
    params.forEach((p) => {
      const pn = p.split(':')[0].split('=')[0].trim();
      if (pn) lines.push(` * @param ${pn} - ${pn} parameter.`);
    });
  }
  if (hasReturn) {
    lines.push(' * @returns The computed result produced by this operation.');
  }
  lines.push(' */');
  return lines.join('\n');
}
/**
 * Performs processFile as part of this module's internal workflow.
 *
 * @param file - file parameter.
 * @returns The computed result produced by this operation.
 */

function processFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;
  if (!hasFileHeader(content)) {
    content = insertFileHeader(content, file);
    modified = true;
  }

  const patterns = [
    /(^|\n)(\s*)(export\s+function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*(:\s*[^\n{]+)?)/g,
    /(^|\n)(\s*)function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)/g,
    /(^|\n)(\s*)(export\s+)?const\s+([A-Za-z0-9_]+)\s*=\s*function\s*\(([^)]*)\)/g,
    /(^|\n)(\s*)(export\s+)?const\s+([A-Za-z0-9_]+)\s*=\s*\(([^)]*)\)\s*=>/g,
  ];

  for (const pat of patterns) {
    let m;
    while ((m = pat.exec(content)) !== null) {
      const fullMatch = m[0];
      const idx = m.index + (m[1] ? m[1].length : 0);
      // Extract name and params depending on groups
      // heuristics:
      let name = null;
      let paramsRaw = '';
      let returnTypePresent = false;
      if (pat === patterns[0]) {
        name = m[4];
        paramsRaw = m[5];
        returnTypePresent = !!m[6] && /:\s*void/.test(m[6]) === false;
      } else if (pat === patterns[1]) {
        name = m[3];
        paramsRaw = m[4];
      } else if (pat === patterns[2]) {
        name = m[4];
        paramsRaw = m[5];
      } else if (pat === patterns[3]) {
        name = m[4];
        paramsRaw = m[5];
      }
      const params = paramsRaw
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
        .map((p) => p.replace(/\/\/.*$/, ''));

      // Check if JSDoc exists within previous 6 lines
      const hasJSDoc = hasJSDocBeforeIndex(content, idx);
      if (!hasJSDoc && name) {
        const jsdoc = makeJSDocForFunction(name, params, true);
        // Insert jsdoc before the match
        const insertAt = idx;
        content = content.slice(0, insertAt) + jsdoc + '\n' + content.slice(insertAt);
        modified = true;
        // Advance regex lastIndex to avoid infinite loop
        pat.lastIndex = insertAt + jsdoc.length + 1 + fullMatch.length;
      }
    }
  }

  if (modified) {
    fs.writeFileSync(file, content, 'utf8');
    return file;
  }
  return null;
}
/**
 * Performs main as part of this module's internal workflow.
 *
 * @returns The computed result produced by this operation.
 */

function main() {
  const files = walk(repoRoot);
  const changed = [];
  for (const f of files) {
    try {
      const res = processFile(f);
      if (res) changed.push(path.relative(repoRoot, res));
    } catch (e) {
      console.error('Failed processing', f, e.message);
    }
  }
  console.log('Files modified:', changed.length);
  changed.forEach((c) => console.log('  ', c));
}

main();
