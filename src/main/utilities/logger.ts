/**
 * Implements logger helpers for build-variant-aware diagnostics.
 *
 * @remarks
 * Exported symbols include `debugLog` and `debugLogLines`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */

const noLogging = !__REVEALGDB_DEBUG__;
// const noLogging = true;

/**
 * Emits a console log message only in debug builds.
 *
 * @param args - Values to forward to the console in debug mode.
 */
export function debugLog(...args: unknown[]): void {
  if (noLogging) {
    return;
  }

  console.log(...args);
}

/**
 * Emits a sequence of console log messages only in debug builds.
 *
 * @param lines - Values to log in order in debug mode.
 */
export function debugLogLines(lines: readonly unknown[]): void {
  if (noLogging) {
    return;
  }

  lines.forEach((line) => {
    console.log(line);
  });
}
