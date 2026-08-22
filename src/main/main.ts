/**
 * Implements main for revealGDB runtime behavior.
 *
 * @remarks
 * Exported symbols include `isMac`, `isWin`, `isLinux`, `isDebug`, `AppSettings`, `mainWindow`, `gdbInterface`, `gdbAppInfo`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { app, BrowserWindow, ipcMain, nativeTheme } from "electron";
import { join } from "path";
import type { NormalizedConnection } from "../common/connection-types";
import type { WorkspaceState } from "../common/workspace-types";
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
  MultiHostWindowManager,
  resolvePreloadPath,
  restoreWindowBounds,
  wireWindowCloseHandlers,
  wireWindowSizeSaver,
} from "./window-manager";
import { WorkspacePersistence } from "./workspace-persistence";
import { WorkspaceService } from "./workspaceService";

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

// Workspace and multi-host window management
let workspacePersistence: WorkspacePersistence | undefined;
let windowManager: MultiHostWindowManager | undefined;
let currentWorkspaceState: WorkspaceState | undefined;

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

function resolveDockWindowUrl(): string {
  const rendererUrl = process.env.ELECTRON_RENDERER_URL;
  if (rendererUrl) {
    return rendererUrl;
  }

  return `file://${join(__dirname, "..", "..", "out", "renderer", "index.html")}`;
}

function hasUsablePersistedLayout(layout: Record<string, unknown> | undefined): boolean {
  if (!layout || typeof layout !== "object" || Array.isArray(layout)) {
    return false;
  }

  return Object.values(layout).some((value) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    if (value && typeof value === "object") {
      return hasUsablePersistedLayout(value as Record<string, unknown>);
    }

    return false;
  });
}

function restorePersistedSecondaryDockWindows(): void {
  const activeWindowManager = windowManager;
  if (!currentWorkspaceState || !activeWindowManager) {
    return;
  }

  currentWorkspaceState.hosts.forEach((host) => {
    if (host.id === "main" || activeWindowManager.getWindow(host.id)) {
      return;
    }

    const layout = currentWorkspaceState?.hostLayouts?.[host.id];
    const shouldShowOnRestore = host.visibleWindows.length > 0 || hasUsablePersistedLayout(layout);

    const dockWindow = activeWindowManager.createDockWindow(host);

    activeWindowManager.loadDockWindowUrl(dockWindow, host.id, resolveDockWindowUrl());
    dockWindow.once("ready-to-show", () => {
      if (shouldShowOnRestore) {
        dockWindow.show();
      }
    });
  });
}

function reconcileClosedDockHost(hostId: string): void {
  if (!workspacePersistence || !currentWorkspaceState) {
    return;
  }

  const nextState = WorkspaceService.deleteHost(currentWorkspaceState, hostId);
  if (nextState === currentWorkspaceState) {
    return;
  }

  currentWorkspaceState = nextState;
  workspacePersistence.save(currentWorkspaceState);
  debugLog(`[workspace] Recovered host ${hostId} back onto the main workspace host`);
}

app.on("ready", () => {
  logStartupMilestone("app.ready");

  configureAppSettings(AppSettings);
  applyDefaultSettings(AppSettings);
  logStartupDiagnostics(AppSettings);
  collectVersionInfo(gdbAppInfo);

  // Initialize workspace persistence and window manager before wiring IPC so the live
  // persisted workspace is available to the runtime handlers.
  workspacePersistence = new WorkspacePersistence();
  windowManager = new MultiHostWindowManager(resolvePreloadPath(), (hostId) => {
    reconcileClosedDockHost(hostId);
  });

  registerIpcHandlers({
    ipcMain,
    appSettings: AppSettings,
    fontList,
    gdbAppInfo,
    getMainWindow: () => mainWindow,
    getGdbInterface: () => gdbInterface,
    isSelectedConnection,
    workspacePersistence,
    windowManager,
    getWorkspaceState: () => currentWorkspaceState,
    setWorkspaceState: (state: WorkspaceState) => {
      currentWorkspaceState = state;
    },
  });

  // Load workspace state from the canonical workspace store.
  try {
    currentWorkspaceState = workspacePersistence.load();
    logStartupMilestone("workspace-state-loaded");
  } catch (error) {
    console.error("[startup] Failed to load workspace state, using default:", error);
    currentWorkspaceState = WorkspaceService.createEmptyWorkspace();
  }

  // Apply saved theme to Electron chrome before creating windows to avoid flash.
  const savedTheme = AppSettings.getSync("gdb.gui.applicationTheme") as string | undefined;
  setNativeThemeFromAppTheme(savedTheme ?? "Auto");

  mainWindow = createMainWindow(resolvePreloadPath());

  setIpcWindow(mainWindow);

  restorePersistedSecondaryDockWindows();

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

    // Wire window size saver to persist bounds on window events
    wireWindowSizeSaver(mainWindow, AppSettings);

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
registerAppEvents(
  app,
  nativeTheme,
  () => mainWindow,
  () => (windowManager ? windowManager.getAllWindows() : []),
);
