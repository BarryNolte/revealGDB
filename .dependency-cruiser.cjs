/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'renderer-no-main',
      severity: 'error',
      comment: 'Renderer must not import from main (only via src/common)',
      from: { path: '^src/renderer' },
      to: { path: '^src/main' },
    },
    {
      name: 'main-no-renderer',
      severity: 'error',
      comment: 'Main must not import from renderer',
      from: { path: '^src/main' },
      to: { path: '^src/renderer' },
    },
    {
      name: 'preload-no-main',
      severity: 'error',
      comment: 'Preload must not import from main',
      from: { path: '^src/preload' },
      to: { path: '^src/main' },
    },
    {
      name: 'preload-no-renderer',
      severity: 'error',
      comment: 'Preload must not import from renderer',
      from: { path: '^src/preload' },
      to: { path: '^src/renderer' },
    },
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'No circular dependencies allowed',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      comment: 'Orphan modules have no dependents and no dependencies — likely dead code',
      from: {
        orphan: true,
        pathNot: [
          '\\.d\\.ts$',
          'src/renderer/index\\.tsx?$',
          'src/main/main\\.ts$',
          'src/preload/preload\\.ts$',
          'src/renderer/main\\.tsx?$',
        ],
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/[^/]+',
      },
    },
  },
};
