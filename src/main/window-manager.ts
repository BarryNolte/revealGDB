/**
 * Implements window manager for revealGDB runtime behavior.
 *
 * @remarks
 * Supports both single-window and multi-host docking architectures.
 * Manages BrowserWindow lifecycle, layout restoration, and URL routing
 * for main and dock windows with query parameter-based host identification.
 * Exported symbols include all window creation, loading, and lifecycle functions.
 */
import { BrowserWindow } from "electron";
import path, { join } from "path";
import type { WorkspaceHost } from "../common/workspace-types";

export type WindowSizeSettings = {
  getSync: (key: string) => unknown;
};

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
 * Performs restore window bounds as part of this module's public API.
 *
 * @param mainWindow - Value for `mainWindow` consumed by this operation.
 * @param appSettings - Value for `appSettings` consumed by this operation.
 */
/**
 * Performs restoreWindowBounds as part of this module's internal workflow.
 *
 * @param mainWindow - mainWindow parameter.
 * @param appSettings - appSettings parameter.
 * @returns The computed result produced by this operation.
 */
export function restoreWindowBounds(
  mainWindow: BrowserWindow,
  appSettings: WindowSizeSettings,
): void {
  const x = appSettings.getSync("gdb.gui.windowSize.x") as number;
  const y = appSettings.getSync("gdb.gui.windowSize.y") as number;
  const w = appSettings.getSync("gdb.gui.windowSize.width") as number;
  const h = appSettings.getSync("gdb.gui.windowSize.height") as number;

  if (x && y) {
    mainWindow.setPosition(x, y);
  }

  if (w && h) {
    mainWindow.setSize(w, h);
  }

  mainWindow.fullScreen = appSettings.getSync("gdb.gui.windowSize.fullscreen") as boolean;
}

/**
 * Performs wire window close handlers as part of this module's public API.
 *
 * @param mainWindow - Value for `mainWindow` consumed by this operation.
 * @param debugWindow - Value for `debugWindow` consumed by this operation.
 */
/**
 * Performs wireWindowCloseHandlers as part of this module's internal workflow.
 *
 * @param mainWindow - mainWindow parameter.
 * @param debugWindow - debugWindow parameter.
 * @returns The computed result produced by this operation.
 */
export function wireWindowCloseHandlers(
  mainWindow: BrowserWindow,
  debugWindow: BrowserWindow | undefined,
): void {
  let debugWindowClosed = false;

  mainWindow.on("closed", () => {
    if (debugWindow && !debugWindowClosed) {
      debugWindow.close();
    }
  });

  if (debugWindow) {
    debugWindow.on("closed", () => {
      debugWindowClosed = true;
    });
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

/**
 * Multi-host window manager for tracking and managing multiple renderer windows.
 *
 * @remarks
 * Maintains a registry of all open windows and their associated host IDs.
 * Supports creating new dock windows, finding windows by host ID, and cleanup.
 */
export class MultiHostWindowManager {
  private windows: Map<string, BrowserWindow> = new Map();
  private preloadPath: string;

  /**
   * Creates a new MultiHostWindowManager.
   *
   * @param preloadPath - Path to the preload script.
   */
  constructor(preloadPath: string) {
    this.preloadPath = preloadPath;
  }

  /**
   * Registers a window with its associated host ID.
   *
   * @param hostId - Unique host identifier.
   * @param window - BrowserWindow to register.
   */
  registerWindow(hostId: string, window: BrowserWindow): void {
    this.windows.set(hostId, window);

    // Auto-cleanup when window is closed
    window.on("closed", () => {
      this.windows.delete(hostId);
    });
  }

  /**
   * Gets a window by its host ID.
   *
   * @param hostId - Host identifier to look up.
   * @returns The BrowserWindow if found, undefined otherwise.
   */
  getWindow(hostId: string): BrowserWindow | undefined {
    return this.windows.get(hostId);
  }

  /**
   * Gets all registered windows.
   *
   * @returns Array of all managed BrowserWindow instances.
   */
  getAllWindows(): BrowserWindow[] {
    return Array.from(this.windows.values());
  }

  /**
   * Gets the host ID for a given window.
   *
   * @param window - The BrowserWindow to look up.
   * @returns The host ID if found, undefined otherwise.
   */
  getHostIdForWindow(window: BrowserWindow): string | undefined {
    for (const [hostId, win] of this.windows.entries()) {
      if (win === window) {
        return hostId;
      }
    }
    return undefined;
  }

  /**
   * Creates a new dock window for the given host.
   *
   * @remarks
   * The window URL includes a query parameter (?dockHost=<hostId>) to identify
   * which host this window belongs to when it loads.
   *
   * @param host - The WorkspaceHost to create a window for.
   * @returns The newly created BrowserWindow.
   */
  createDockWindow(host: WorkspaceHost): BrowserWindow {
    const window = new BrowserWindow({
      webPreferences: {
        preload: this.preloadPath,
      },
      show: false,
    });

    // Register before loading to ensure it's tracked
    this.registerWindow(host.id, window);

    return window;
  }

  /**
   * Loads a URL into a dock window with host identification.
   *
   * @remarks
   * Appends ?dockHost=<hostId> query parameter to route the renderer
   * to the correct host layout restoration path.
   *
   * @param window - The BrowserWindow to load the URL into.
   * @param hostId - The host ID to embed in the query parameter.
   * @param baseUrl - The base URL or file path to load.
   */
  loadDockWindowUrl(window: BrowserWindow, hostId: string, baseUrl: string): void {
    const separator = baseUrl.includes("?") ? "&" : "?";
    const urlWithHost = `${baseUrl}${separator}dockHost=${hostId}`;
    window.loadURL(urlWithHost);
  }

  /**
   * Shows or hides all windows based on visibility state.
   * Used during workspace restoration to update window visibility.
   *
   * @param visibleHostIds - Set of host IDs that should be visible.
   */
  setWindowsVisibility(visibleHostIds: Set<string>): void {
    this.windows.forEach((window, hostId) => {
      if (visibleHostIds.has(hostId)) {
        window.show();
      } else {
        window.hide();
      }
    });
  }

  /**
   * Closes all managed windows.
   * Used during app shutdown.
   */
  closeAllWindows(): void {
    this.windows.forEach((window) => {
      if (!window.isDestroyed()) {
        window.close();
      }
    });
  }

  /**
   * Gets the count of open windows.
   *
   * @returns Number of currently registered windows.
   */
  getWindowCount(): number {
    return this.windows.size;
  }
}
