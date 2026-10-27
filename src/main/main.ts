/**
 * Implements main for revealGDB runtime behavior.
 *
 * @remarks
 * Exported symbols include `isMac`, `isWin`, `isLinux`, `isDebug`, `AppSettings`, `mainWindow`, `gdbInterface`, `gdbAppInfo`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { app, BrowserWindow, ipcMain, nativeTheme } from "electron";
// import path from "path";
import type { NormalizedConnection } from "../common/connection-types";
import { registerAppEvents } from "./app-events";
import { AppSettings } from "./app-settings";
import {
  applyDefaultSettings,
  collectVersionInfo,
  configureAppSettings,
  logStartupDiagnostics,
  maybeInstallDevTools,
  warmSystemFonts,
} from "./bootstrap";
import { createGdbInterface } from "./gdb-lifecycle";
import { registerIpcHandlers } from "./ipc";
import { setIpcWindow } from "./ipc-sender";
import { GdbMenu } from "./menu";
import { miInterface } from "./mi-interface/mi-interface";
import { isDebug, isLinux, isMac, isWin } from "./platform-info";
import { setNativeThemeFromAppTheme } from "./theme-support";
import { debugLog } from "./utilities/logger";
import {
  createDebugWindow,
  createMainWindow,
  loadMainWindow,
  resolvePreloadPath,
  restoreWindowBounds,
  wireWindowCloseHandlers,
} from "./window-manager";
import { WindowDockManager } from "../renderer/utilities/window-dock-manager";
import { MultiWindowHub } from "./multi-window-hub";

// Re-export for backward compatibility
export { AppSettings, isDebug, isLinux, isMac, isWin };

globalThis.revealGdbBuild = {
  debug: __REVEALGDB_DEBUG__,
  mode: __REVEALGDB_BUILD__,
};
const fontList: Map<string, string> = new Map<string, string>();
const startupEpochMs = Date.now();

/**
 * Performs log startup milestone as part of this module's internal workflow.
 *
 * @param label - Value for `label` consumed by this operation.
 */
function logStartupMilestone(label: string): void {
  const elapsedMs = Date.now() - startupEpochMs;
  debugLog(`[startup] ${label}: ${elapsedMs}ms`);
}

/**
 * Performs initialization of the multi-window hub as part of this module's internal workflow.
 * This is where all multi-window related state and behavior is managed.
 */
export const multiWindowHub = new MultiWindowHub(AppSettings);

/**
 * Performs initialization of the dock window manager as part of this module's internal workflow.
 * This is where all dock window related state and behavior is managed.
 */
export const dockWindowManager: WindowDockManager = new WindowDockManager();

export let mainWindow: BrowserWindow;
let debugWindow: BrowserWindow | undefined;

export let gdbInterface: miInterface;

export const gdbAppInfo: Map<string, unknown> = new Map<string, unknown>();

/**
 * Performs is selected connection as part of this module's internal workflow.
 *
 * @param value - Value to validate, normalize, or transform before further processing.
 * @returns The computed result produced by this operation.
 */
/**
 * Performs isSelectedConnection as part of this module's internal workflow.
 *
 * @param value - value parameter.
 * @returns The computed result produced by this operation.
 */
function isSelectedConnection(value: unknown): value is NormalizedConnection {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<NormalizedConnection>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.shell === "string" &&
    Array.isArray(candidate.commands) &&
    candidate.commands.every((cmd) => typeof cmd === "string") &&
    (candidate.wslDistribution === undefined || typeof candidate.wslDistribution === "string")
  );
}

app.on("ready", () => {
  logStartupMilestone("app.ready");

  AppSettings.initialize();
  applyDefaultSettings(AppSettings);
  configureAppSettings(AppSettings);
  logStartupDiagnostics(AppSettings);
  collectVersionInfo(gdbAppInfo);

  // Apply saved theme to Electron chrome before creating windows to avoid flash.
  const savedTheme = AppSettings.getSync("gdb.gui.applicationTheme") as string | undefined;
  setNativeThemeFromAppTheme(savedTheme ?? "Auto");

  mainWindow = createMainWindow(resolvePreloadPath());
  if (typeof mainWindow.on === "function") {
    mainWindow.on("move", () => {
      multiWindowHub.saveWindowInfo(null);
    });
  }

  if (typeof mainWindow.on === "function") {
    mainWindow.on("closed", () => {
      multiWindowHub.closeAllSecondaryWindows();
    });
  }

  setIpcWindow(mainWindow);

  if (isDebug) {
    debugWindow = createDebugWindow(mainWindow);
    if (debugWindow && typeof debugWindow.on === "function") {
      debugWindow.on("move", () => {
        multiWindowHub.saveWindowInfo(null);
      });
    }
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

  /**
   * UI is now up and running, now we can interact with GDB
   */
  gdbInterface = createGdbInterface(mainWindow, AppSettings);
  logStartupMilestone("gdb-interface-created");
  GdbMenu.installMenu(gdbInterface);
  wireWindowCloseHandlers(mainWindow, isDebug ? debugWindow : undefined);
});
registerAppEvents(app, nativeTheme, () => mainWindow);

registerIpcHandlers({
  ipcMain,
  appSettings: AppSettings,
  fontList,
  gdbAppInfo,
  multiWindowHub,
  getMainWindow: () => mainWindow,
  getGdbInterface: () => gdbInterface,
  isSelectedConnection,
});
