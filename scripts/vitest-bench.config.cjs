// Minimal Vitest config for running only benchmark tests and avoiding project plugins
module.exports = {
  // Run benches without worker threads to avoid worker startup/fork reliability issues
  threads: false,
  // Only include benchmark files
  benchmark: {
    include: ['tests/bench/**/*.bench.ts'],
  },
  test: {
    include: [],
    environment: 'node',
    // Increase timeouts for WSL environment where DOM operations are significantly slower
    testTimeout: 300000, // 5 minutes per test
    hookTimeout: 60000,  // 1 minute for setup/teardown hooks
  },
  // Provide compile-time defines expected by source files
  // Mirror the behavior in vitest.config.ts so modules that reference
  // __REVEALGDB_BUILD__ and __REVEALGDB_DEBUG__ don't throw at runtime.
  define: (() => {
    const buildVariant = process.env.REVEALGDB_BUILD === 'debug' ? 'debug' : 'release';
    const isDebugBuild =
      process.env.REVEALGDB_DEBUG === 'true' ||
      (process.env.REVEALGDB_BUILD === undefined && process.env.NODE_ENV === 'development');
    return {
      __REVEALGDB_BUILD__: JSON.stringify(buildVariant),
      __REVEALGDB_DEBUG__: JSON.stringify(isDebugBuild),
    };
  })(),
};
