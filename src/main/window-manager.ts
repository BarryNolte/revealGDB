/**
 * Implements window manager for revealGDB runtime behavior.
 *
 * @remarks
 * Exported symbols include `createMainWindow`, `createDebugWindow`, `loadMainWindow`, `restoreWindowBounds`, `wireWindowCloseHandlers`, `resolvePreloadPath`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { BrowserWindow, screen } from "electron";
import path, { join } from "path";
import { closeAllSatelliteWindows } from "./multi-window-manager";
import { debugLog } from "./utilities/logger";
import { normalizeWindowBounds } from "./utilities/window-bounds-recovery";

const WORKSPACE_SETTINGS_KEY = "gdb.gui.workspace";

type WorkspaceGeometryWindow = {
  id?: string;
  type?: "main" | "satellite" | "floating";
  hostId?: string;
  bounds?: { x: number; y: number; width: number; height: number };
  isMaximized?: boolean;
  isMinimized?: boolean;
};

type WorkspaceGeometryState = {
  windows?: WorkspaceGeometryWindow[];
  hosts?: Array<{ id: string; isVisible?: boolean; label?: string }>;
};

export type WindowSizeSettings = {
  getSync: (key: string) => unknown;
  setSync: (key: string, value: never) => void;
};

/**
 * Helper to write settings directly
 * electron-store handles atomic writes and file locking internally
 */
function writeSettings(appSettings: WindowSizeSettings, key: string, value: unknown): void {
  try {
    appSettings.setSync(key, value as never);
  } catch (error) {
    if (error instanceof Error) {
      debugLog(`[window-manager] Error saving settings (key: ${key}): ${error.message}`);
    }
  }
}

/**
 * Creates main window for downstream use.
 *
 * @param preloadPath - Filesystem or source path used to locate the target resource.
 * @returns The computed result produced by this operation.
 */
/**
 * Performs createMainWindow as part of this module's internal workflow.
 *
 * @param preloadPath - preloadPath parameter.
 * @returns The computed result produced by this operation.
 */
export function createMainWindow(preloadPath: string): BrowserWindow {
  return new BrowserWindow({
    webPreferences: {
      preload: preloadPath,
    },
    show: false,
  });
}

/**
 * Creates debug window for downstream use.
 *
 * @param mainWindow - Value for `mainWindow` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
/**
 * Performs createDebugWindow as part of this module's internal workflow.
 *
 * @param mainWindow - mainWindow parameter.
 * @returns The computed result produced by this operation.
 */
export function createDebugWindow(mainWindow: BrowserWindow): BrowserWindow {
  const debugWindow = new BrowserWindow({
    x: 0,
    y: 0,
    width: 1200,
    height: 1200,
    autoHideMenuBar: true,
  });
  mainWindow.webContents.setDevToolsWebContents(debugWindow.webContents);
  mainWindow.webContents.openDevTools({
    mode: "detach",
    title: "revealGDB - I'm Special, I know how to debug...",
  });

  return debugWindow;
}

/**
 * Performs load main window as part of this module's public API.
 *
 * @param mainWindow - Value for `mainWindow` consumed by this operation.
 */
export function loadMainWindow(mainWindow: BrowserWindow): void {
  let devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) {
    // console.log("Loading URL:", devUrl);
    mainWindow.loadURL(devUrl);
    return;
  }

  // console.log("Loading file:", join(__dirname, "..", "..", "out", "renderer", "index.html"));
  devUrl = join(__dirname, "..", "..", "out", "renderer", "index.html");
  mainWindow.loadFile(devUrl);
}

/**
 * Restores window bounds from settings.
 * @deprecated This function now delegates to restorePerHostWindowBounds("main")
 * @param mainWindow - The BrowserWindow instance
 * @param appSettings - The app settings instance
 */
export function restoreWindowBounds(
  mainWindow: BrowserWindow,
  appSettings: WindowSizeSettings,
): void {
  restorePerHostWindowBounds("main", mainWindow, appSettings);
}

/**
 * Performs wire window close handlers as part of this module's public API.
 *
 * @param mainWindow - Value for `mainWindow` consumed by this operation.
 * @param debugWindow - Value for `debugWindow` consumed by this operation.
 * @param onMainWindowClosed - Optional callback when main window closes (for closing satellites)
 */
/**
 * Performs wireWindowCloseHandlers as part of this module's internal workflow.
 *
 * @param mainWindow - mainWindow parameter.
 * @param debugWindow - debugWindow parameter.
 * @param onMainWindowClosed - onMainWindowClosed parameter.
 * @returns The computed result produced by this operation.
 */
export function wireWindowCloseHandlers(
  mainWindow: BrowserWindow,
  debugWindow: BrowserWindow | undefined,
  onMainWindowClosed?: () => void,
): void {
  let debugWindowClosed = false;

  mainWindow.on("closed", () => {
    if (debugWindow && !debugWindowClosed) {
      debugWindow.close();
    }
    // Call the callback if provided (for closing satellites)
    if (onMainWindowClosed) {
      onMainWindowClosed();
    }
  });

  if (debugWindow) {
    debugWindow.on("closed", () => {
      debugWindowClosed = true;
    });
  }
}

/**
 * Close all satellite windows when main window is closed
 * This ensures clean shutdown of the entire application
 */
export function closeAllSatellitesOnMainClose(mainWindow: BrowserWindow): void {
  mainWindow.on("closed", () => {
    closeAllSatelliteWindows();
  });
}

/**
 * Performs save window bounds for multi-window support
 *
 * @param hostId - The host ID ("main" or "satellite-xxxx")
 * @param mainWindow - The BrowserWindow instance
 * @param appSettings - The app settings instance
 */
export function saveWindowBounds(
  hostId: string,
  mainWindow: BrowserWindow,
  appSettings: WindowSizeSettings,
): void {
  // Check if window is destroyed before accessing its properties
  if (mainWindow.isDestroyed()) {
    debugLog(`[window-manager] Skipping save bounds for destroyed window: ${hostId}`);
    return;
  }

  const bounds = mainWindow.getBounds();
  const maximized = mainWindow.isMaximized();
  const fullScreen = mainWindow.isFullScreen();

  const workspace = ((appSettings.getSync(WORKSPACE_SETTINGS_KEY) as
    | WorkspaceGeometryState
    | undefined) ?? {
    windows: [],
    hosts: [],
  }) as WorkspaceGeometryState;

  const workspaceWindow =
    workspace.windows?.find(
      (candidate) =>
        (hostId === "main" && candidate.type === "main") ||
        candidate.hostId === hostId ||
        candidate.id === hostId,
    ) ??
    (workspace.windows ?? []).find(
      (candidate) => candidate.type === "satellite" && candidate.id === hostId,
    );

  if (!workspaceWindow) {
    const nextWindow: WorkspaceGeometryWindow = {
      id: hostId,
      type: hostId === "main" ? "main" : "satellite",
      hostId,
      bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
      isMaximized: maximized,
      isMinimized: false,
    };
    workspace.windows = [...(workspace.windows ?? []), nextWindow];
    writeSettings(appSettings, WORKSPACE_SETTINGS_KEY, workspace as never);
    return;
  }

  workspaceWindow.bounds = {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  };
  workspaceWindow.isMaximized = maximized;
  workspaceWindow.isMinimized = fullScreen;
  writeSettings(appSettings, WORKSPACE_SETTINGS_KEY, workspace as never);
}

/**
 * Performs restore window bounds for multi-window support
 *
 * @param hostId - The host ID ("main" or "satellite-xxxx")
 * @param mainWindow - The BrowserWindow instance
 * @param appSettings - The app settings instance
 */
export function restorePerHostWindowBounds(
  hostId: string,
  mainWindow: BrowserWindow,
  appSettings: WindowSizeSettings,
): void {
  const workspace = ((appSettings.getSync(WORKSPACE_SETTINGS_KEY) as
    | WorkspaceGeometryState
    | undefined) ?? undefined) as WorkspaceGeometryState | undefined;

  const workspaceWindow = workspace?.windows?.find(
    (candidate) =>
      (hostId === "main" && candidate.type === "main") ||
      candidate.hostId === hostId ||
      candidate.id === hostId,
  );

  if (!workspaceWindow?.bounds) {
    return;
  }

  const recoveredBounds = normalizeWindowBounds(
    workspaceWindow.bounds,
    screen.getAllDisplays(),
    screen.getPrimaryDisplay().bounds,
  );
  mainWindow.setBounds(recoveredBounds);

  if (workspaceWindow.isMaximized) {
    mainWindow.maximize();
  }

  if (workspaceWindow.isMinimized) {
    mainWindow.setFullScreen(true);
  }
}

/**
 * Remove window bounds and state for a host
 * Called when a window is manually closed to clean up saved state
 *
 * @param hostId - The host ID to remove
 * @param appSettings - The app settings instance
 */
export function removeWindowBounds(hostId: string, appSettings: WindowSizeSettings): void {
  debugLog(`[window-manager] Clearing geometry for host: ${hostId}`);

  const workspace = ((appSettings.getSync(WORKSPACE_SETTINGS_KEY) as
    | WorkspaceGeometryState
    | undefined) ?? {
    windows: [],
    hosts: [],
  }) as WorkspaceGeometryState;

  const workspaceWindow = workspace.windows?.find(
    (candidate) =>
      (hostId === "main" && candidate.type === "main") ||
      candidate.hostId === hostId ||
      candidate.id === hostId,
  );

  if (workspaceWindow) {
    workspaceWindow.bounds = undefined;
    workspaceWindow.isMaximized = false;
    workspaceWindow.isMinimized = false;
    writeSettings(appSettings, WORKSPACE_SETTINGS_KEY, workspace as never);
  }
}

/**
 * Performs resolve preload path as part of this module's public API.
 *
 * @returns The resulting string value produced by this operation.
 */
export function resolvePreloadPath(): string {
  return path.join(__dirname, "..", "preload", "preload.js");
}
