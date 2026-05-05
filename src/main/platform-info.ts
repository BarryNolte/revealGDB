/**
 * Platform and build mode constants for the main process.
 *
 * @remarks
 * Extracted here to break circular dependencies from menu.ts and other modules into main.ts.
 */

export const isMac = process.platform === "darwin";
export const isWin = process.platform === "win32";
export const isLinux = !isMac && !isWin;

export const isDebug = __REVEALGDB_DEBUG__;
