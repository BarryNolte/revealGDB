/**
 * Multi-window (satellite) management for revealGDB
 *
 * Handles creation, tracking, and lifecycle of satellite BrowserWindow instances.
 * Each window has a unique hostId and can contain multiple dockable panes that can be
 * moved between windows.
 *
 * @remarks
 * Architecture:
 * - Main window: hostId = "main", always exists
 * - Satellite windows: hostId = "satellite-{uuid}", created on demand
 * - Renderer URL includes ?dockHost={hostId} query parameter for identification
 * - Window bounds, maximized state, and dock layouts persisted per-host
 *
 * @module src/main/multi-window-manager
 */

import { BrowserWindow, screen } from "electron";
import type { Rectangle } from "../common/settings-types";
import type { WorkspaceHost } from "../common/workspace-types";
import { debugLog } from "./utilities/logger";
import { normalizeWindowBounds } from "./utilities/window-bounds-recovery";

/**
 * Main host identifier (always present)
 */
export const MAIN_HOST_ID = "main";

/**
 * Prefix for satellite host IDs
 */
const SATELLITE_HOST_PREFIX = "satellite-";

/**
 * Default window dimensions for new satellite windows
 */
const DEFAULT_SATELLITE_WIDTH = 1200;
const DEFAULT_SATELLITE_HEIGHT = 800;

/**
 * Satellite window tracking
 * Key: hostId, Value: BrowserWindow
 */
const satelliteWindows = new Map<string, BrowserWindow>();

/**
 * Floating window tracking (standalone windows for individual panes)
 * Key: windowId (from WorkspaceWindow), Value: BrowserWindow
 */
const floatingWindows = new Map<string, BrowserWindow>();

/**
 * Main window reference (separate from satellite map)
 */
let mainWindowRef: BrowserWindow | null = null;

/**
 * Callback to notify when a satellite window is closed
 * Allows main.ts to update workspace and settings
 */
let onSatelliteWindowClosedCallback: ((hostId: string) => void) | null = null;

/**
 * Callback to register move/resize handlers for a satellite window
 * Allows main.ts to wire up bounds auto-saving
 */
let onSatelliteWindowCreatedCallback: ((hostId: string, window: BrowserWindow) => void) | null =
  null;

/**
 * Register callback for satellite window close events
 */
export function registerSatelliteWindowClosedCallback(callback: (hostId: string) => void): void {
  onSatelliteWindowClosedCallback = callback;
}

/**
 * Register callback for satellite window creation
 * Allows main.ts to wire up event handlers (move, resize, etc.)
 */
export function registerSatelliteWindowCreatedCallback(
  callback: (hostId: string, window: BrowserWindow) => void,
): void {
  onSatelliteWindowCreatedCallback = callback;
}

/**
 * Configuration for window sizing
 */
type WindowSizeMode = "outer" | "content";
let windowSizeMode: WindowSizeMode = "content";

/**
 * Set the window size mode (outer vs content)
 */
export function setWindowSizeMode(mode: WindowSizeMode): void {
  windowSizeMode = mode;
}

/**
 * Register the main window
 */
export function registerMainWindow(window: BrowserWindow): void {
  mainWindowRef = window;
  debugLog(`[multi-window] Registered main window`);
}

/**
 * Get the main window
 */
export function getMainWindow(): BrowserWindow | null {
  return mainWindowRef;
}

/**
 * Get all satellite windows
 */
export function getSatelliteWindows(): Map<string, BrowserWindow> {
  return new Map(satelliteWindows);
}

/**
 * Get all active windows (including main)
 */
export function getAllWindows(): BrowserWindow[] {
  const all: BrowserWindow[] = [];
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    all.push(mainWindowRef);
  }
  for (const window of satelliteWindows.values()) {
    if (!window.isDestroyed()) {
      all.push(window);
    }
  }
  return all;
}

/**
 * Generate a new satellite host ID
 */
export function generateSatelliteHostId(): string {
  const randomPart = Math.random().toString(36).substring(2, 9);
  return SATELLITE_HOST_PREFIX + randomPart;
}

/**
 * Check if a hostId is for a satellite window
 */
export function isSatelliteHost(hostId: string): boolean {
  return hostId.startsWith(SATELLITE_HOST_PREFIX);
}

/**
 * Get the window for a given host ID
 */
export function getWindowForHost(hostId: string): BrowserWindow | null {
  if (hostId === MAIN_HOST_ID) {
    return mainWindowRef;
  }
  return satelliteWindows.get(hostId) ?? null;
}

/**
 * Create a new satellite window
 *
 * @param hostId - Optional host ID; if not provided, generates one
 * @param bounds - Optional window bounds; if not provided, uses defaults
 * @param rendererUrl - Base renderer URL (will add ?dockHost={hostId} query param)
 * @param preloadPath - Path to preload script
 * @returns The created BrowserWindow
 */
export function createSatelliteWindow(
  hostId: string = generateSatelliteHostId(),
  bounds?: Rectangle,
  rendererUrl?: string,
  preloadPath?: string,
): BrowserWindow {
  debugLog(`[multi-window] Creating satellite window: ${hostId}`);

  // Determine window bounds
  let windowBounds: Rectangle;
  if (bounds) {
    windowBounds = bounds;
  } else {
    // Default: center-offset from primary display
    const primaryDisplay = screen.getPrimaryDisplay();
    windowBounds = {
      x: primaryDisplay.bounds.x + 100,
      y: primaryDisplay.bounds.y + 100,
      width: DEFAULT_SATELLITE_WIDTH,
      height: DEFAULT_SATELLITE_HEIGHT,
    };
  }

  windowBounds = normalizeWindowBounds(
    windowBounds,
    screen.getAllDisplays(),
    screen.getPrimaryDisplay().bounds,
  );

  // Create window
  const window = new BrowserWindow({
    x: windowSizeMode === "content" ? undefined : windowBounds.x,
    y: windowSizeMode === "content" ? undefined : windowBounds.y,
    width: windowBounds.width,
    height: windowBounds.height,
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  window.setMenuBarVisibility(false);

  // Track window
  satelliteWindows.set(hostId, window);

  // Handle close event
  window.on("closed", () => {
    satelliteWindows.delete(hostId);
    debugLog(`[multi-window] Satellite window closed: ${hostId}`);
    // Notify main.ts so workspace can be updated
    if (onSatelliteWindowClosedCallback) {
      onSatelliteWindowClosedCallback(hostId);
    }
  });

  // Notify main.ts so it can wire up event handlers
  if (onSatelliteWindowCreatedCallback) {
    onSatelliteWindowCreatedCallback(hostId, window);
  }

  // Load renderer with host query param
  if (rendererUrl) {
    const urlWithHost = new URL(rendererUrl);
    urlWithHost.searchParams.set("dockHost", hostId);
    window.loadURL(urlWithHost.toString());
  }

  debugLog(`[multi-window] Satellite window created: ${hostId}`);
  return window;
}

/**
 * Show or focus a host window (creating it if needed)
 *
 * @param hostId - The host to show
 * @param createIfNeeded - If true, create window if it doesn't exist
 */
export function showHostWindow(hostId: string, createIfNeeded = false): Promise<void> {
  const window = getWindowForHost(hostId);

  if (window && !window.isDestroyed()) {
    window.show();
    window.focus();
    debugLog(`[multi-window] Showed host window: ${hostId}`);
    return Promise.resolve();
  }

  if (!createIfNeeded) {
    debugLog(`[multi-window] Host window not found: ${hostId}`);
    return Promise.resolve();
  }

  // This would be called from main.ts which has access to rendererUrl and preloadPath
  debugLog(
    `[multi-window] Host window not found, but createIfNeeded=false, cannot create: ${hostId}`,
  );
  return Promise.resolve();
}

/**
 * Close a satellite window
 *
 * @param hostId - The satellite host to close (cannot close "main")
 */
export function closeSatelliteWindow(hostId: string): void {
  if (hostId === MAIN_HOST_ID) {
    debugLog(`[multi-window] Cannot close main window`);
    return;
  }

  const window = satelliteWindows.get(hostId);
  if (window && !window.isDestroyed()) {
    window.close();
    debugLog(`[multi-window] Closed satellite window: ${hostId}`);
  }
}

/**
 * Save window bounds for a host
 *
 * @param hostId - The host ID
 * @param bounds - The window bounds to save
 */
export function saveHostWindowBounds(hostId: string, bounds: Rectangle): void {
  debugLog(`[multi-window] Saving bounds for ${hostId}: ${JSON.stringify(bounds)}`);
  // Actual persistence happens in main.ts via the unified gdb.gui.windowConfigs path.
  // This function is a placeholder for the lifecycle event
}

/**
 * Save window state (maximized, fullscreen) for a host
 *
 * @param hostId - The host ID
 * @param maximized - Whether window is maximized
 * @param fullScreen - Whether window is in fullscreen
 */
export function saveHostWindowState(hostId: string, maximized: boolean, fullScreen: boolean): void {
  debugLog(
    `[multi-window] Saving state for ${hostId}: maximized=${maximized}, fullscreen=${fullScreen}`,
  );
}

/**
 * Create WorkspaceHost metadata for all currently visible windows
 */
export function getVisibleHosts(): WorkspaceHost[] {
  const hosts: WorkspaceHost[] = [];

  // Main window
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    hosts.push({
      id: MAIN_HOST_ID,
      label: "Main Window",
      isVisible: true,
    });
  }

  // Satellite windows
  for (const [hostId, window] of satelliteWindows) {
    if (!window.isDestroyed()) {
      hosts.push({
        id: hostId,
        label: `Window ${hostId.substring(SATELLITE_HOST_PREFIX.length, SATELLITE_HOST_PREFIX.length + 4).toUpperCase()}`,
        isVisible: true,
      });
    }
  }

  return hosts;
}

/**
 * Restore satellite windows from hosts configuration
 *
 * @param hosts - List of WorkspaceHost to restore
 * @param rendererUrl - Base renderer URL
 * @param preloadPath - Preload script path
 * @param boundsMap - Optional per-host window bounds
 */
export function restoreSatelliteWindows(
  hosts: WorkspaceHost[],
  rendererUrl: string,
  preloadPath: string,
  boundsMap?: Record<string, Rectangle>,
): void {
  for (const host of hosts) {
    if (host.id === MAIN_HOST_ID) {
      continue; // Main window already exists
    }

    const bounds = boundsMap?.[host.id];
    createSatelliteWindow(host.id, bounds, rendererUrl, preloadPath);
    debugLog(`[multi-window] Restored satellite window: ${host.id}`);
  }
}

/**
 * Get all currently open satellite windows
 * @returns Array of [hostId, window] tuples
 */
export function getAllSatelliteWindows(): Array<[string, BrowserWindow]> {
  const result: Array<[string, BrowserWindow]> = [];
  for (const [hostId, window] of satelliteWindows) {
    if (!window.isDestroyed()) {
      result.push([hostId, window]);
    }
  }
  return result;
}

/**
 * Clean up all satellite windows (e.g., on app quit)
 */
export function closeAllSatelliteWindows(): void {
  for (const [, window] of satelliteWindows) {
    if (!window.isDestroyed()) {
      window.close();
    }
  }
  satelliteWindows.clear();
  debugLog(`[multi-window] Closed all satellite windows`);
}

/**
 * Generate a floating window ID
 */
export function generateFloatingWindowId(): string {
  const randomPart = Math.random().toString(36).substring(2, 9);
  return `float-${randomPart}`;
}

/**
 * Create a floating window for a detached pane
 *
 * @param hostId - Floating host/window ID (from WorkspaceWindow.id)
 * @param bounds - Optional window bounds; defaults to small floating size
 * @param rendererUrl - Base renderer URL
 * @param preloadPath - Path to preload script
 * @returns The created BrowserWindow
 */
export function createFloatingWindow(
  hostId: string,
  bounds?: Rectangle,
  rendererUrl?: string,
  preloadPath?: string,
): BrowserWindow {
  debugLog(`[multi-window] Creating floating window: ${hostId}`);

  // Determine window bounds
  let windowBounds: Rectangle;
  if (bounds) {
    windowBounds = bounds;
  } else {
    // Default: small floating window in center of primary display
    const primaryDisplay = screen.getPrimaryDisplay();
    windowBounds = {
      x: primaryDisplay.bounds.x + 200,
      y: primaryDisplay.bounds.y + 200,
      width: 600,
      height: 400,
    };
  }

  windowBounds = normalizeWindowBounds(
    windowBounds,
    screen.getAllDisplays(),
    screen.getPrimaryDisplay().bounds,
  );

  // Create window
  const window = new BrowserWindow({
    x: windowBounds.x,
    y: windowBounds.y,
    width: windowBounds.width,
    height: windowBounds.height,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  // Track window
  floatingWindows.set(hostId, window);

  // Handle close event
  window.on("closed", () => {
    floatingWindows.delete(hostId);
    debugLog(`[multi-window] Floating window closed: ${hostId}`);
  });

  // Load renderer with dock host query param so floating windows use the same host layout model.
  if (rendererUrl) {
    const urlWithHost = new URL(rendererUrl);
    urlWithHost.searchParams.set("dockHost", hostId);
    window.loadURL(urlWithHost.toString());
  }

  debugLog(`[multi-window] Floating window created: ${hostId}`);
  return window;
}

/**
 * Get the window for a floating window ID
 */
export function getFloatingWindow(windowId: string): BrowserWindow | null {
  return floatingWindows.get(windowId) ?? null;
}

/**
 * Close a floating window
 */
export function closeFloatingWindow(windowId: string): void {
  const window = floatingWindows.get(windowId);
  if (window && !window.isDestroyed()) {
    window.close();
    debugLog(`[multi-window] Closed floating window: ${windowId}`);
  }
}

/**
 * Get all active floating windows
 */
export function getFloatingWindows(): Map<string, BrowserWindow> {
  return new Map(floatingWindows);
}

/**
 * Clean up all floating windows
 */
export function closeAllFloatingWindows(): void {
  for (const [, window] of floatingWindows) {
    if (!window.isDestroyed()) {
      window.close();
    }
  }
  floatingWindows.clear();
  debugLog(`[multi-window] Closed all floating windows`);
}
