/**
 * Implements main for revealGDB runtime behavior.
 *
 * @remarks
 * Exported symbols include `isMac`, `isWin`, `isLinux`, `isDebug`, `AppSettings`, `mainWindow`, `gdbInterface`, `gdbAppInfo`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { app, BrowserWindow, ipcMain, nativeTheme, Rectangle } from "electron";
// import path from "path";
import type { NormalizedConnection } from "../common/connection-types";
import type { Workspace } from "../common/workspace-types";
import { registerAppEvents } from "./app-events";
import { AppSettings } from "./app-settings";
import {
  applyDefaultSettings,
  collectVersionInfo,
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
  closeAllFloatingWindows,
  closeAllSatelliteWindows,
  createFloatingWindow,
  getAllSatelliteWindows,
  MAIN_HOST_ID,
  registerMainWindow,
  registerSatelliteWindowClosedCallback,
  registerSatelliteWindowCreatedCallback,
  restoreSatelliteWindows,
} from "./multi-window-manager";
import { isDebug, isLinux, isMac, isWin } from "./platform-info";
import { setNativeThemeFromAppTheme } from "./theme-support";
import { debugLog } from "./utilities/logger";
import {
  createDebugWindow,
  createMainWindow,
  loadMainWindow,
  removeWindowBounds,
  resolvePreloadPath,
  restorePerHostWindowBounds,
  saveWindowBounds,
  wireWindowCloseHandlers,
} from "./window-manager";
import { WorkspaceService } from "./workspace-service";
import {
  cleanupLegacyWorkspaceSettings,
  ElectronStateStore,
  recoverWorkspaceFromSnapshots,
} from "./workspace-state-store";

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

export let mainWindow: BrowserWindow;
let debugWindow: BrowserWindow | undefined;

export let gdbInterface: miInterface;

export const gdbAppInfo: Map<string, unknown> = new Map<string, unknown>();

let workspaceService: WorkspaceService;
let workspaceStateStore: ElectronStateStore;
let isAppShuttingDown = false;

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

function initializeWorkspaceService(appSettings: typeof AppSettings): void {
  workspaceStateStore = new ElectronStateStore(AppSettings as never);
  cleanupLegacyWorkspaceSettings(AppSettings as never);

  let recoveredWorkspace: Workspace;
  try {
    const savedWorkspace = appSettings.getSync("gdb.gui.workspace");
    recoveredWorkspace = recoverWorkspaceFromSnapshots(savedWorkspace);
  } catch (error) {
    console.error("Failed to load workspace from settings:", error);
    recoveredWorkspace = recoverWorkspaceFromSnapshots(undefined);
  }

  if (workspaceStateStore.validateWorkspace(recoveredWorkspace)) {
    workspaceService = new WorkspaceService(recoveredWorkspace);
  } else {
    workspaceService = new WorkspaceService();
  }
}

function initializeMainWindow(appSettings: typeof AppSettings, preloadPath: string): void {
  const savedTheme = appSettings.getSync("gdb.gui.applicationTheme") as string | undefined;
  setNativeThemeFromAppTheme(savedTheme ?? "Auto");

  mainWindow = createMainWindow(preloadPath);
  registerMainWindow(mainWindow);
  setIpcWindow(mainWindow);

  if (isDebug) {
    debugWindow = createDebugWindow(mainWindow);
  }

  logStartupMilestone("main-window-created");
  loadMainWindow(mainWindow);
  logStartupMilestone("main-window-load-started");
}

function initializeWindowBoundsSaving(): void {
  mainWindow.once("ready-to-show", () => {
    logStartupMilestone("main-window-ready-to-show");
    restorePerHostWindowBounds(MAIN_HOST_ID, mainWindow, AppSettings);
    mainWindow.show();
    logStartupMilestone("main-window-shown");

    setImmediate(() => {
      warmSystemFonts(fontList);
      if (isDebug) {
        maybeInstallDevTools(true);
      }
    });
  });

  let boundsDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  const saveBounds = () => {
    if (boundsDebounceTimer) clearTimeout(boundsDebounceTimer);
    boundsDebounceTimer = setTimeout(() => {
      saveWindowBounds(MAIN_HOST_ID, mainWindow, AppSettings);
    }, 1000);
  };
  mainWindow.on("move", saveBounds);
  mainWindow.on("resized", saveBounds);
}

function restoreSatelliteWindowsIfNeeded(_appSettings: typeof AppSettings): void {
  const workspace = workspaceService.getWorkspace();
  const hostsToRestore = (workspace.hosts ?? []).filter(
    (host) => host.id !== MAIN_HOST_ID && host.isVisible,
  );

  if (hostsToRestore.length > 0) {
    const boundsMap: Record<string, Rectangle> = {};
    for (const host of hostsToRestore) {
      const workspaceWindow = workspace.windows.find(
        (window) => window.type === "satellite" && window.hostId === host.id,
      );
      if (workspaceWindow?.bounds) {
        boundsMap[host.id] = workspaceWindow.bounds;
      }
    }

    const rendererUrl = process.env.ELECTRON_RENDERER_URL || "";
    const preloadPath = resolvePreloadPath();

    debugLog(`[main] Restoring ${hostsToRestore.length} satellite windows from workspace state`);
    restoreSatelliteWindows(hostsToRestore, rendererUrl, preloadPath, boundsMap);
    logStartupMilestone(`restored-${hostsToRestore.length}-satellite-windows`);
  }

  const floatingWindowsToRestore = workspace.windows.filter((window) => window.type === "floating");
  if (floatingWindowsToRestore.length > 0) {
    const rendererUrl = process.env.ELECTRON_RENDERER_URL || "";
    const preloadPath = resolvePreloadPath();
    for (const floatingWindow of floatingWindowsToRestore) {
      const restoredWindow = createFloatingWindow(
        floatingWindow.id,
        floatingWindow.bounds,
        rendererUrl,
        preloadPath,
      );
      restoredWindow.show();
    }
    logStartupMilestone(`restored-${floatingWindowsToRestore.length}-floating-windows`);
  }
}

/**
 * Handle satellite window close event
 * Marks the host as invisible in workspace and removes saved window state
 * If app is shutting down, preserves the window config for restoration on next startup
 */
function onSatelliteWindowClosed(hostId: string): void {
  debugLog(
    `[main] Handling satellite window close for: ${hostId} (shutting down: ${isAppShuttingDown})`,
  );

  // Update workspace to mark host as invisible
  const workspace = workspaceService.getWorkspace();
  if (workspace.hosts) {
    const host = workspace.hosts.find((h) => h.id === hostId);
    if (host) {
      host.isVisible = false;
    }
  }

  // Remove persisted host geometry from the workspace snapshot when the app is not shutting down.
  if (!isAppShuttingDown) {
    debugLog(`[main] App not shutting down, clearing persisted geometry for ${hostId}`);
    removeWindowBounds(hostId, AppSettings);
  } else {
    debugLog(`[main] App is shutting down, preserving workspace geometry for ${hostId}`);
  }

  // Save updated workspace to settings
  saveWorkspaceState();
}

/**
 * Save current workspace state to settings
 */
function saveWorkspaceState(): void {
  const workspace = workspaceService.getWorkspace();
  AppSettings.setSync("gdb.gui.workspace", workspace as never);
  debugLog("[main] Workspace state saved to settings");
}

/**
 * Set up bounds auto-saving for a satellite window
 * Wires up move/resize handlers similar to main window
 */
function setupSatelliteWindowBoundsSaving(hostId: string, window: BrowserWindow): void {
  let boundsDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  const saveBounds = () => {
    if (boundsDebounceTimer) clearTimeout(boundsDebounceTimer);
    boundsDebounceTimer = setTimeout(() => {
      saveWindowBounds(hostId, window, AppSettings);
    }, 1000);
  };
  window.on("move", saveBounds);
  window.on("resized", saveBounds);

  // Also save bounds when maximized/minimized state changes
  window.on("maximize", () => {
    saveWindowBounds(hostId, window, AppSettings);
  });
  window.on("unmaximize", () => {
    saveWindowBounds(hostId, window, AppSettings);
  });
  window.on("enter-full-screen", () => {
    saveWindowBounds(hostId, window, AppSettings);
  });
  window.on("leave-full-screen", () => {
    saveWindowBounds(hostId, window, AppSettings);
  });

  // Clean up timers and event listeners when window is destroyed
  window.on("closed", () => {
    if (boundsDebounceTimer) {
      clearTimeout(boundsDebounceTimer);
      boundsDebounceTimer = null;
    }
    // Event listeners are automatically removed when window is destroyed
  });

  debugLog(`[main] Set up bounds auto-saving for satellite window: ${hostId}`);
}

app.on("ready", () => {
  logStartupMilestone("app.ready");

  applyDefaultSettings(AppSettings);
  logStartupDiagnostics(AppSettings);
  collectVersionInfo(gdbAppInfo);

  initializeWorkspaceService(AppSettings);
  const preloadPath = resolvePreloadPath();
  initializeMainWindow(AppSettings, preloadPath);
  initializeWindowBoundsSaving();

  /**
   * UI is now up and running, now we can interact with GDB
   */
  gdbInterface = createGdbInterface(mainWindow, AppSettings);
  logStartupMilestone("gdb-interface-created");
  GdbMenu.installMenu(gdbInterface);

  // Wire up close handlers for main and debug windows
  // When main window closes, close satellites with proper flag handling
  wireWindowCloseHandlers(mainWindow, isDebug ? debugWindow : undefined, () => {
    debugLog("[main] Main window closed, handling satellite shutdown");
    // Set shutdown flag BEFORE closing satellites so bounds are preserved
    isAppShuttingDown = true;
    debugLog("[main] isAppShuttingDown flag set to true (from main window close)");

    // Save all satellite window bounds before closing
    const openSatellites = getAllSatelliteWindows();
    debugLog(`[main] Flushing ${openSatellites.length} satellite window bounds before closing`);
    for (const [hostId, window] of openSatellites) {
      saveWindowBounds(hostId, window, AppSettings);
      debugLog(`[main] Saved bounds for satellite ${hostId}`);
    }

    // Mark satellites as invisible
    const workspace = workspaceService.getWorkspace();
    if (workspace.hosts) {
      for (const host of workspace.hosts) {
        if (host.id !== MAIN_HOST_ID) {
          host.isVisible = false;
        }
      }
    }

    // Close all satellites (with flag already set to preserve bounds)
    closeAllSatelliteWindows();
    closeAllFloatingWindows();

    // Save workspace state
    saveWorkspaceState();
  });

  restoreSatelliteWindowsIfNeeded(AppSettings);

  // Register callbacks for satellite window lifecycle
  registerSatelliteWindowClosedCallback(onSatelliteWindowClosed);
  registerSatelliteWindowCreatedCallback(setupSatelliteWindowBoundsSaving);

  // Register IPC handlers after all services are initialized
  registerIpcHandlers({
    ipcMain,
    appSettings: AppSettings,
    fontList,
    gdbAppInfo,
    getMainWindow: () => mainWindow,
    getGdbInterface: () => gdbInterface,
    isSelectedConnection,
    workspaceService,
    workspaceStateStore,
  });
});
registerAppEvents(app, nativeTheme, () => mainWindow);

// Clean up all satellite and floating windows on app quit
// Note: Satellites may already be closed from the main window close handler,
// but we close them here as a safety measure in case app.quit() was called directly
app.on("before-quit", () => {
  debugLog("[main] App quitting, saving state and closing windows");

  // Only set flag if not already set (might be set by main window close handler)
  if (!isAppShuttingDown) {
    isAppShuttingDown = true;
    debugLog("[main] isAppShuttingDown flag set to true (from before-quit)");
  }

  // Log all hosts before shutdown
  const workspace = workspaceService.getWorkspace();
  const hostIds = workspace.hosts?.map((h) => `${h.id}(visible:${h.isVisible})`) || [];
  debugLog(`[main] Hosts before shutdown: ${hostIds.join(", ")}`);

  // CRITICAL: Explicitly save all open satellite window bounds before closing them
  // This is necessary because the bounds saving uses a 1000ms debounce timer
  // If the app quits before the debounce fires, bounds would be lost
  // We flush all pending bounds saves here to ensure they're persisted
  const openSatellites = getAllSatelliteWindows();
  debugLog(`[main] Flushing ${openSatellites.length} satellite window bounds to disk before close`);
  for (const [hostId, window] of openSatellites) {
    saveWindowBounds(hostId, window, AppSettings);
    debugLog(`[main] Saved bounds for satellite ${hostId}`);
  }

  // Save main window bounds before closing (only if not destroyed)
  if (!mainWindow.isDestroyed()) {
    saveWindowBounds(MAIN_HOST_ID, mainWindow, AppSettings);
  }

  // Mark all open satellite windows as invisible and save workspace
  if (workspace.hosts) {
    for (const host of workspace.hosts) {
      if (host.id !== MAIN_HOST_ID) {
        host.isVisible = false;
      }
    }
  }

  // Save workspace state
  saveWorkspaceState();

  // Close all satellites and floating windows (safety measure in case they're still open)
  debugLog("[main] About to close all satellite and floating windows");
  closeAllSatelliteWindows();
  closeAllFloatingWindows();

  debugLog("[main] All windows closed, app cleanup complete");
});
