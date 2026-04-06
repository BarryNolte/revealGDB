#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const ROOT = process.cwd();
const SRC_ROOT = path.join(ROOT, 'src');
const REPORT_DIR = path.join(ROOT, 'reports', 'maintainability');

const TARGET_BUCKETS = [
  { name: 'main', dir: path.join(SRC_ROOT, 'main') },
  { name: 'renderer', dir: path.join(SRC_ROOT, 'renderer') },
  { name: 'preload', dir: path.join(SRC_ROOT, 'preload') },
];

const EXCLUDED_DIR_SEGMENTS = new Set([
  'tests',
  'test',
  '__tests__',
  'test-helpers',
  'performance',
]);

function isTsSourceFile(filePath) {
  return /\.(ts|tsx)$/i.test(filePath) && !/\.d\.ts$/i.test(filePath);
}

function isTestLikeFile(relPath) {
  const normalized = relPath.replace(/\\/g, '/').toLowerCase();
  if (/\.(test|spec)\.(ts|tsx)$/i.test(normalized)) return true;
  if (/-test\.(ts|tsx|html)$/i.test(normalized)) return true;
  if (/(^|\/)tests?\//.test(normalized)) return true;
  if (normalized.includes('/test-helpers/')) return true;
  if (/playwright|vitest/.test(normalized)) return true;
  return false;
}

function walkFiles(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDED_DIR_SEGMENTS.has(entry.name.toLowerCase())) continue;
      walkFiles(fullPath, out);
      continue;
    }
    if (entry.isFile() && isTsSourceFile(fullPath)) {
      out.push(fullPath);
    }
  }
  return out;
}

function countLines(code) {
  const lines = code.split(/\r?\n/);
  const total = lines.length;
  const blank = lines.filter((l) => l.trim().length === 0).length;
  const comment = lines.filter((l) => /^\s*(\/\/|\/\*|\*)/.test(l)).length;
  const sloc = Math.max(1, total - blank - comment);
  return { total, sloc };
}

function complexityFromSource(sourceFile) {
  let complexity = 1;

  function visit(node) {
    switch (node.kind) {
      case ts.SyntaxKind.IfStatement:
      case ts.SyntaxKind.ForStatement:
      case ts.SyntaxKind.ForInStatement:
      case ts.SyntaxKind.ForOfStatement:
      case ts.SyntaxKind.WhileStatement:
      case ts.SyntaxKind.DoStatement:
      case ts.SyntaxKind.CaseClause:
      case ts.SyntaxKind.CatchClause:
      case ts.SyntaxKind.ConditionalExpression:
        complexity += 1;
        break;
      case ts.SyntaxKind.BinaryExpression: {
        const op = node.operatorToken && node.operatorToken.kind;
        if (op === ts.SyntaxKind.AmpersandAmpersandToken || op === ts.SyntaxKind.BarBarToken || op === ts.SyntaxKind.QuestionQuestionToken) {
          complexity += 1;
        }
        break;
      }
      default:
        break;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return complexity;
}

function halsteadFromSource(sourceFile) {
  const operators = new Map();
  const operands = new Map();

  function add(map, key) {
    map.set(key, (map.get(key) || 0) + 1);
  }

  function visit(node) {
    if (ts.isBinaryExpression(node)) {
      add(operators, ts.tokenToString(node.operatorToken.kind) || String(node.operatorToken.kind));
    } else if (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) {
      add(operators, ts.tokenToString(node.operator) || String(node.operator));
    } else if (ts.isConditionalExpression(node)) {
      add(operators, '?:');
    } else if (ts.isCallExpression(node)) {
      add(operators, 'call');
    } else if (ts.isPropertyAccessExpression(node)) {
      add(operators, '.');
    }

    if (ts.isIdentifier(node)) {
      add(operands, node.text);
    } else if (ts.isStringLiteral(node) || ts.isNumericLiteral(node) || ts.isBigIntLiteral(node)) {
      add(operands, node.getText(sourceFile));
    } else if (node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword || node.kind === ts.SyntaxKind.NullKeyword) {
      add(operands, ts.tokenToString(node.kind) || String(node.kind));
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  const n1 = operators.size;
  const n2 = operands.size;
  const N1 = Array.from(operators.values()).reduce((a, b) => a + b, 0);
  const N2 = Array.from(operands.values()).reduce((a, b) => a + b, 0);

  const vocabulary = Math.max(1, n1 + n2);
  const length = Math.max(1, N1 + N2);
  const volume = length * Math.log2(vocabulary);

  return {
    distinctOperators: n1,
    distinctOperands: n2,
    totalOperators: N1,
    totalOperands: N2,
    vocabulary,
    length,
    volume,
  };
}

function maintainabilityIndex(volume, complexity, sloc) {
  const safeVolume = Math.max(1, volume);
  const safeSloc = Math.max(1, sloc);
  const miRaw = 171 - 5.2 * Math.log(safeVolume) - 0.23 * complexity - 16.2 * Math.log(safeSloc);
  const mi = Math.max(0, (miRaw * 100) / 171);
  return Number(mi.toFixed(2));
}

function miRating(mi) {
  if (mi >= 80) return 'Good';
  if (mi >= 50) return 'Moderate';
  return 'Poor';
}

function analyzeFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true);
  const lineStats = countLines(code);
  const cyclomatic = complexityFromSource(sourceFile);
  const halstead = halsteadFromSource(sourceFile);
  const mi = maintainabilityIndex(halstead.volume, cyclomatic, lineStats.sloc);

  return {
    file: path.relative(ROOT, filePath).replace(/\\/g, '/'),
    sloc: lineStats.sloc,
    totalLines: lineStats.total,
    cyclomatic,
    halsteadVolume: Number(halstead.volume.toFixed(2)),
    mi,
    rating: miRating(mi),
  };
}

function avg(values) {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function writeReports(report) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });

  const jsonPath = path.join(REPORT_DIR, 'mi-report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2) + '\n', 'utf8');

  const mdLines = [];
  mdLines.push('# Maintainability Metrics Report');
  mdLines.push('');
  mdLines.push(`Generated: ${new Date().toISOString()}`);
  mdLines.push('');
  mdLines.push('Test files are excluded by filename and test-only directories.');
  mdLines.push('');

  for (const bucket of report.buckets) {
    mdLines.push(`## ${bucket.name}`);
    mdLines.push('');
    mdLines.push(`- Files analyzed: ${bucket.fileCount}`);
    mdLines.push(`- Average MI: ${bucket.averageMI.toFixed(2)}`);
    mdLines.push(`- Median MI: ${bucket.medianMI.toFixed(2)}`);
    mdLines.push(`- Poor/Moderate/Good: ${bucket.countPoor}/${bucket.countModerate}/${bucket.countGood}`);
    mdLines.push('');
    mdLines.push('| File | MI | Rating | Cyclomatic | SLOC | Halstead Volume |');
    mdLines.push('| --- | ---: | --- | ---: | ---: | ---: |');
    for (const f of bucket.files.slice(0, 20)) {
      mdLines.push(`| ${f.file} | ${f.mi.toFixed(2)} | ${f.rating} | ${f.cyclomatic} | ${f.sloc} | ${f.halsteadVolume.toFixed(2)} |`);
    }
    mdLines.push('');
  }

  mdLines.push('## Least Maintainable Files (Overall)');
  mdLines.push('');
  mdLines.push('| File | Bucket | MI | Rating | Cyclomatic | SLOC | Halstead Volume |');
  mdLines.push('| --- | --- | ---: | --- | ---: | ---: | ---: |');
  for (const item of report.leastMaintainable) {
    mdLines.push(`| ${item.file} | ${item.bucket} | ${item.mi.toFixed(2)} | ${item.rating} | ${item.cyclomatic} | ${item.sloc} | ${item.halsteadVolume.toFixed(2)} |`);
  }
  mdLines.push('');

  const mdPath = path.join(REPORT_DIR, 'mi-report.md');
  fs.writeFileSync(mdPath, mdLines.join('\n') + '\n', 'utf8');

  const planLines = [];
  planLines.push('# Maintainability Remediation Plan (MI)');
  planLines.push('');
  planLines.push(`Generated: ${new Date().toISOString()}`);
  planLines.push('');
  planLines.push('Target set: lowest maintainability files based on current MI analysis.');
  planLines.push('');

  report.leastMaintainable.forEach((f, index) => {
    planLines.push(`## ${index + 1}. ${f.file}`);
    planLines.push('');
    planLines.push(`- Bucket: ${f.bucket}`);
    planLines.push(`- Current MI: ${f.mi.toFixed(2)} (${f.rating})`);
    planLines.push(`- Cyclomatic: ${f.cyclomatic}`);
    planLines.push(`- SLOC: ${f.sloc}`);
    planLines.push(`- Halstead Volume: ${f.halsteadVolume.toFixed(2)}`);
    planLines.push('- Primary drivers: high branch density, function length, and expression volume.');
    planLines.push('- Remediation actions:');
    planLines.push('  1. Extract decision-heavy blocks into small pure helpers (target <= 20 SLOC/helper).');
    planLines.push('  2. Replace nested conditionals with guard clauses and early returns.');
    planLines.push('  3. Split IO/orchestration code from transformation/parsing logic.');
    planLines.push('  4. Introduce typed data mappers to reduce ad-hoc object mutation.');
    planLines.push('  5. Add focused tests around extracted helpers before and after refactor.');
    planLines.push(`- MI target after remediation: >= ${Math.max(60, Math.ceil(f.mi / 10) * 10)}`);
    planLines.push('');
  });

  planLines.push('## Execution Order');
  planLines.push('');
  planLines.push('1. Refactor the top 3 lowest-MI files first.');
  planLines.push('2. Re-run MI report and verify each improved by at least 10 points.');
  planLines.push('3. Continue with next files until all poor files are in moderate or good range.');
  planLines.push('');

  const planPath = path.join(REPORT_DIR, 'mi-remediation-plan.md');
  fs.writeFileSync(planPath, planLines.join('\n') + '\n', 'utf8');

  return { jsonPath, mdPath, planPath };
}

function buildBucket(name, dir) {
  if (!fs.existsSync(dir)) {
    return {
      name,
      fileCount: 0,
      averageMI: 0,
      medianMI: 0,
      countPoor: 0,
      countModerate: 0,
      countGood: 0,
      files: [],
    };
  }

  const files = walkFiles(dir)
    .map((f) => path.relative(ROOT, f))
    .filter((rel) => !isTestLikeFile(rel))
    .map((rel) => path.join(ROOT, rel));

  const analyzed = files.map(analyzeFile).sort((a, b) => a.mi - b.mi);
  const miValues = analyzed.map((f) => f.mi).sort((a, b) => a - b);
  const median =
    miValues.length === 0
      ? 0
      : miValues.length % 2 === 0
        ? (miValues[miValues.length / 2 - 1] + miValues[miValues.length / 2]) / 2
        : miValues[Math.floor(miValues.length / 2)];

  return {
    name,
    fileCount: analyzed.length,
    averageMI: avg(analyzed.map((f) => f.mi)),
    medianMI: median,
    countPoor: analyzed.filter((f) => f.rating === 'Poor').length,
    countModerate: analyzed.filter((f) => f.rating === 'Moderate').length,
    countGood: analyzed.filter((f) => f.rating === 'Good').length,
    files: analyzed,
  };
}

function main() {
  const buckets = TARGET_BUCKETS.map((b) => buildBucket(b.name, b.dir));
  const allFiles = buckets.flatMap((b) => b.files.map((f) => ({ ...f, bucket: b.name })));
  const leastMaintainable = allFiles.sort((a, b) => a.mi - b.mi).slice(0, 10);

  const report = {
    generatedAt: new Date().toISOString(),
    root: ROOT,
    excludedRules: [
      '*.test.ts|*.test.tsx',
      '*.spec.ts|*.spec.tsx',
      '*-test.ts|*-test.tsx|*-test.html',
      'tests/**',
      'test/**',
      '__tests__/**',
      'test-helpers/**',
      'performance/**',
    ],
    buckets,
    leastMaintainable,
  };

  const out = writeReports(report);
  console.log('Maintainability reports generated:');
  console.log(`- ${path.relative(ROOT, out.jsonPath).replace(/\\/g, '/')}`);
  console.log(`- ${path.relative(ROOT, out.mdPath).replace(/\\/g, '/')}`);
  console.log(`- ${path.relative(ROOT, out.planPath).replace(/\\/g, '/')}`);

  for (const bucket of buckets) {
    console.log(
      `${bucket.name}: files=${bucket.fileCount}, avgMI=${bucket.averageMI.toFixed(2)}, poor/moderate/good=${bucket.countPoor}/${bucket.countModerate}/${bucket.countGood}`
    );
  }
}

main();


/**
 * @file maintainability-metrics.cjs
 * @description Source module for maintainability-metrics.
 */


/**
 * maintainability-metrics module.
 *
 * @remarks
 * Source module for maintainability-metrics.
 */
