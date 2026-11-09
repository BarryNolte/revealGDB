/**
 * Implements main for revealGDB runtime behavior.
 *
 * @remarks
 * Exported symbols include `isMac`, `isWin`, `isLinux`, `isDebug`, `AppSettings`, `mainWindow`, `gdbInterface`, `gdbAppInfo`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { app, BrowserWindow, ipcMain, nativeTheme } from "electron";
// import path from "path";
import type { NormalizedConnection } from "../common/connection-types";
import { WindowDockManager } from "../renderer/utilities/window-dock-manager";
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
import {
  DEVTOOLS_WINDOW_UNIQUE_ID,
  MAIN_WINDOW_UNIQUE_ID,
  MultiWindowHub,
} from "./multi-window-hub";
import { isDebug, isLinux, isMac, isWin } from "./platform-info";
import { setNativeThemeFromAppTheme } from "./theme-support";
import { debugLog } from "./utilities/logger";
import {
  createDebugWindow,
  createMainWindow,
  createSecondaryWindow,
  loadMainWindow,
  loadSecondaryWindow,
  resolvePreloadPath,
  restoreWindowBounds,
  wireWindowCloseHandlers,
} from "./window-manager";

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

function configureSavedAppTheme(): void {
  // Apply saved theme to Electron chrome before creating windows to avoid flash.
  const savedTheme = AppSettings.getSync("gdb.gui.applicationTheme") as string | undefined;
  setNativeThemeFromAppTheme(savedTheme ?? "Auto");
}

function createAndConfigureMainWindow(): void {
  mainWindow = createMainWindow(resolvePreloadPath());
  multiWindowHub.add(mainWindow, MAIN_WINDOW_UNIQUE_ID);
  multiWindowHub.withPersistencePaused(() => {
    restoreWindowBounds(mainWindow, AppSettings);
  });
  if (typeof mainWindow.on === "function") {
    mainWindow.on("move", () => {
      multiWindowHub.saveWindowInfo(null);
    });
    mainWindow.on("closed", () => {
      multiWindowHub.closeAllSecondaryWindows();
    });
  }

  setIpcWindow(mainWindow);
}

function restoreSavedSecondaryWindows(): void {
  const restoredSecondaryWindows = multiWindowHub.withPersistencePaused(() =>
    multiWindowHub.restoreSavedSecondaryWindows((title, uniqueId, onReadyToShow) => {
      const window = createSecondaryWindow(
        resolvePreloadPath(),
        () => multiWindowHub.saveWindowInfo(null),
        title,
      );
      onReadyToShow(window);
      setImmediate(() => {
        loadSecondaryWindow(window, uniqueId);
      });
      return window;
    }),
  );

  if (restoredSecondaryWindows.length > 0) {
    logStartupMilestone(`secondary-windows-restored:${restoredSecondaryWindows.length}`);
  }
}

function registerMainWindowReadyHandlers(): void {
  // Register before load so the event is not missed if the page becomes ready immediately.
  mainWindow.once("ready-to-show", () => {
    logStartupMilestone("main-window-ready-to-show");
    multiWindowHub.withPersistencePaused(() => {
      restoreWindowBounds(mainWindow, AppSettings);
    });
    mainWindow.show();
    logStartupMilestone("main-window-shown");

    setImmediate(() => {
      warmSystemFonts(fontList);

      if (isDebug) {
        maybeInstallDevTools(true);
      }
    });
  });
}

app.on("ready", () => {
  logStartupMilestone("app.ready");

  AppSettings.initialize();
  applyDefaultSettings(AppSettings);
  configureAppSettings(AppSettings);
  logStartupDiagnostics(AppSettings);
  collectVersionInfo(gdbAppInfo);
  configureSavedAppTheme();
  createAndConfigureMainWindow();

  if (isDebug) {
    const createdDebugWindow = createDebugWindow(mainWindow);
    debugWindow = createdDebugWindow;
    multiWindowHub.add(
      createdDebugWindow,
      DEVTOOLS_WINDOW_UNIQUE_ID,
      createdDebugWindow.title || "Developer Tools",
    );
    multiWindowHub.withPersistencePaused(() => {
      restoreWindowBounds(createdDebugWindow, AppSettings, "gdb.gui.layouts.devtools.windowSize");
    });
    if (typeof createdDebugWindow.on === "function") {
      createdDebugWindow.on("move", () => {
        multiWindowHub.saveWindowInfo(null);
      });
    }
  }

  restoreSavedSecondaryWindows();
  logStartupMilestone("main-window-created");
  registerMainWindowReadyHandlers();
  loadMainWindow(mainWindow);
  logStartupMilestone("main-window-load-started");

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
