/**
 * Main process entry point: window lifecycle, IPC, and GDB wiring.
 */
import { app, BrowserWindow, ipcMain, nativeTheme } from "electron";
import settings from "electron-settings";
import path from "path";
import { GdbAny, SelectedConnection } from "../common/gdb-common";
import { registerAppEvents } from "./app-events";
import {
  collectVersionInfo,
  configureAppSettings,
  logStartupDiagnostics,
  maybeInstallDevTools,
  warmSystemFonts,
} from "./bootstrap";
import { createGdbInterface } from "./gdb-lifecycle";
import { registerIpcHandlers } from "./ipc";
import { GdbMenu } from "./menu";
import { miInterface } from "./mi-interface/mi-interface";
import {
  createDebugWindow,
  createMainWindow,
  loadMainWindow,
  resolvePreloadPath,
  restoreWindowBounds,
  wireWindowCloseHandlers,
} from "./window-manager";

console.log(`PRELOAD: ${path.resolve("./out/preload/preload.js")}`);

export const isMac = process.platform === "darwin";
export const isWin = process.platform === "win32";
export const isLinux = !isMac && !isWin;

// eslint-disable-next-line no-undef
export const isDebug = __REVEALGDB_DEBUG__;

globalThis.revealGdbBuild = {
  // eslint-disable-next-line no-undef
  debug: __REVEALGDB_DEBUG__,
  // eslint-disable-next-line no-undef
  mode: __REVEALGDB_BUILD__,
};
console.log(`Build Info: ${JSON.stringify(globalThis.revealGdbBuild, null, 2)}`);

export const AppSettings = settings;
const fontList: Map<string, string> = new Map<string, string>();
const startupEpochMs = Date.now();

function logStartupMilestone(label: string): void {
  const elapsedMs = Date.now() - startupEpochMs;
  console.log(`[startup] ${label}: ${elapsedMs}ms`);
}

export let mainWindow: BrowserWindow;
let debugWindow: BrowserWindow | undefined;

export let gdbInterface: miInterface;

export const gdbAppInfo: Map<string, GdbAny> = new Map<string, GdbAny>();

function isSelectedConnection(value: unknown): value is SelectedConnection {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SelectedConnection>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.shell === "string" &&
    Array.isArray(candidate.commands) &&
    candidate.commands.every((cmd) => typeof cmd === "string")
  );
}

app.on("ready", () => {
  logStartupMilestone("app.ready");

  configureAppSettings(AppSettings);
  logStartupDiagnostics(AppSettings);
  collectVersionInfo(gdbAppInfo);
  //console.log("Version Info\n------------");
  //console.log(gdbAppInfo);

  mainWindow = createMainWindow(resolvePreloadPath());

  if (isDebug) {
    debugWindow = createDebugWindow(mainWindow);
  }

  logStartupMilestone("main-window-created");
  loadMainWindow(mainWindow);
  logStartupMilestone("main-window-load-started");

  // Restore persisted window bounds on first show.
  mainWindow.once("ready-to-show", () => {
    logStartupMilestone("main-window-ready-to-show");
    restoreWindowBounds(mainWindow, AppSettings);

    mainWindow.show();
    logStartupMilestone("main-window-shown");

    // Keep non-critical font metadata warming off the startup critical path.
    setImmediate(() => {
      warmSystemFonts(fontList);

      if (isDebug) {
        maybeInstallDevTools(true);
      }
    });
  });

  GdbMenu.installMenu();

  /**
   * UI is now up and running, now we can interact with GDB
   */
  gdbInterface = createGdbInterface(mainWindow, AppSettings);
  logStartupMilestone("gdb-interface-created");
  wireWindowCloseHandlers(mainWindow, isDebug ? debugWindow : undefined);
});
registerAppEvents(app, nativeTheme, () => mainWindow);

registerIpcHandlers({
  ipcMain,
  appSettings: AppSettings,
  fontList,
  gdbAppInfo,
  getMainWindow: () => mainWindow,
  getGdbInterface: () => gdbInterface,
  isSelectedConnection,
});
