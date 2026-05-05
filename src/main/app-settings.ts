/**
 * Application settings singleton for the main process.
 *
 * @remarks
 * Re-exported here to break the circular dependency between mi-interface and main.ts.
 */
import settings from "electron-settings";

export const AppSettings = settings;
