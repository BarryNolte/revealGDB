/**
 * Manages satellite host windows (Electron BrowserWindow instances).
 *
 * Responsibilities:
 * - Track all open windows (main + satellites) by hostId
 * - Create new satellite windows with unique identifiers
 * - Restore window bounds and state from persistence
 * - Handle window lifecycle (close, cleanup, state updates)
 * - Coordinate with WorkspaceService for state consistency
 *
 * @remarks
 * Pattern from DockManager reference app. Each satellite window is a BrowserWindow
 * that loads the same renderer with a ?dockHost=<hostId> query parameter.
 */

import { BrowserWindow, screen } from "electron";
import { GdbAny } from "../common/gdb-common";
import type { SatelliteWindowBounds } from "../common/satellite-window-types";

/**
 * Maps hostId (string) to BrowserWindow instances.
 * 'main' host is the primary application window.
 * Satellite hosts are user-opened docking windows (e.g., 'satellite-1', 'satellite-2').
 */
export type HostWindowMap = Map<string, BrowserWindow>;

/**
 * Configuration for creating a new host window.
 */
export interface CreateHostWindowOptions {
  hostId: string;
  label?: string;
  preloadPath?: string;
  baseUrl?: string;
  bounds?: SatelliteWindowBounds;
  icon?: string;
}

/**
 * Window state snapshot for persistence.
 */
export interface HostWindowSnapshot {
  hostId: string;
  label: string;
  bounds: SatelliteWindowBounds;
  isMaximized: boolean;
  isFullscreen: boolean;
  isVisible: boolean;
}

/**
 * HostWindowManager: Centralized coordination for multi-window lifecycle.
 *
 * @example
 * ```typescript
 * const hostManager = new HostWindowManager();
 *
 * // Create main window
 * await hostManager.createHostWindow({
 *   hostId: 'main',
 *   baseUrl: 'http://localhost:5173',
 *   preloadPath: '/path/to/preload.js'
 * });
 *
 * // Create satellite window
 * await hostManager.createHostWindow({
 *   hostId: 'satellite-1',
 *   label: 'Dock Window 1',
 *   bounds: { x: 800, y: 100, width: 600, height: 400 },
 *   baseUrl: 'http://localhost:5173'
 * });
 * ```
 */
export class HostWindowManager {
  private hostWindows: HostWindowMap = new Map();

  constructor() {}

  /**
   * Create a new host window (main or satellite).
   *
   * For main window: Usually called once at app startup.
   * For satellite windows: Called when user opens new docking window.
   */
  async createHostWindow(options: CreateHostWindowOptions): Promise<BrowserWindow> {
    const { hostId, preloadPath, baseUrl, bounds, icon } = options;

    // Use provided bounds, or smart default
    const windowBounds = bounds || this.getDefaultBounds(hostId);

    const windowConfig: BrowserWindow["webPreferences"] & {
      width: number;
      height: number;
      x: number;
      y: number;
      show: boolean;
      icon?: string;
    } = {
      width: windowBounds.width,
      height: windowBounds.height,
      x: windowBounds.x,
      y: windowBounds.y,
      show: false, // Show after content loads
      webPreferences: {
        preload: preloadPath || "",
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
      },
      icon,
    };

    const window = new BrowserWindow(windowConfig);

    // Attach hostId metadata to window
    (window as GdbAny).__hostId = hostId;

    // Load content with hostId query parameter
    const url = new URL(baseUrl || "http://localhost:5173");
    url.searchParams.set("dockHost", hostId);
    await window.loadURL(url.toString());

    // Setup event handlers
    this.setupWindowEvents(hostId, window);

    // Show window when ready
    window.show();

    // Store reference
    this.hostWindows.set(hostId, window);

    return window;
  }

  /**
   * Get a host window by ID.
   */
  getHostWindow(hostId: string): BrowserWindow | undefined {
    return this.hostWindows.get(hostId);
  }

  /**
   * Get the main window.
   */
  getMainWindow(): BrowserWindow | undefined {
    return this.hostWindows.get("main");
  }

  /**
   * Get all host windows.
   */
  getAllHostWindows(): HostWindowMap {
    return this.hostWindows;
  }

  /**
   * Check if a host window is currently open.
   */
  isHostWindowOpen(hostId: string): boolean {
    return this.hostWindows.has(hostId) && !this.hostWindows.get(hostId)!.isDestroyed();
  }

  /**
   * Get count of open windows (main + satellites).
   */
  getHostWindowCount(): number {
    return this.hostWindows.size;
  }

  /**
   * Get count of open satellite windows (excluding main).
   */
  getSatelliteWindowCount(): number {
    return Math.max(0, this.hostWindows.size - 1);
  }

  /**
   * Save window bounds to a snapshot.
   */
  snapshotHostWindow(hostId: string): HostWindowSnapshot | null {
    const window = this.hostWindows.get(hostId);
    if (!window || window.isDestroyed()) {
      return null;
    }

    const bounds = window.getBounds();
    return {
      hostId,
      label: `${hostId === "main" ? "Main" : "Dock Window"}`,
      bounds: {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      },
      isMaximized: window.isMaximized(),
      isFullscreen: window.isFullScreen(),
      isVisible: window.isVisible(),
    };
  }

  /**
   * Restore window bounds from snapshot.
   */
  restoreHostWindowBounds(hostId: string, bounds: SatelliteWindowBounds): void {
    const window = this.hostWindows.get(hostId);
    if (!window || window.isDestroyed()) {
      return;
    }

    // Clamp bounds to available screen area
    const clampedBounds = this.clampBoundsToScreen(bounds);
    window.setBounds(clampedBounds);
  }

  /**
   * Restore window maximized state.
   */
  restoreHostWindowMaximized(hostId: string, isMaximized: boolean): void {
    const window = this.hostWindows.get(hostId);
    if (!window || window.isDestroyed()) {
      return;
    }

    if (isMaximized) {
      window.maximize();
    } else {
      window.unmaximize();
    }
  }

  /**
   * Restore window fullscreen state.
   */
  restoreHostWindowFullscreen(hostId: string, isFullscreen: boolean): void {
    const window = this.hostWindows.get(hostId);
    if (!window || window.isDestroyed()) {
      return;
    }

    window.setFullScreen(isFullscreen);
  }

  /**
   * Show a host window (or all if hostId is undefined).
   */
  showHostWindow(hostId?: string): void {
    if (hostId) {
      const window = this.hostWindows.get(hostId);
      if (window && !window.isDestroyed()) {
        window.show();
      }
    } else {
      // Show all windows
      this.hostWindows.forEach((window) => {
        if (!window.isDestroyed()) {
          window.show();
        }
      });
    }
  }

  /**
   * Hide a host window (or all if hostId is undefined).
   */
  hideHostWindow(hostId?: string): void {
    if (hostId) {
      const window = this.hostWindows.get(hostId);
      if (window && !window.isDestroyed()) {
        window.hide();
      }
    } else {
      // Hide all windows (except main)
      this.hostWindows.forEach((window, id) => {
        if (id !== "main" && !window.isDestroyed()) {
          window.hide();
        }
      });
    }
  }

  /**
   * Focus a host window.
   */
  focusHostWindow(hostId: string): void {
    const window = this.hostWindows.get(hostId);
    if (window && !window.isDestroyed()) {
      window.focus();
    }
  }

  /**
   * Close a host window (satellite only; main window close is app-wide).
   */
  closeHostWindow(hostId: string): void {
    if (hostId === "main") {
      console.warn("[revealGDB] Cannot close main host window via closeHostWindow()");
      return;
    }

    const window = this.hostWindows.get(hostId);
    if (window && !window.isDestroyed()) {
      window.close();
    }
  }

  /**
   * Close all satellite windows (preserves main).
   */
  closeAllSatelliteWindows(): void {
    this.hostWindows.forEach((window, hostId) => {
      if (hostId !== "main" && !window.isDestroyed()) {
        window.close();
      }
    });
  }

  /**
   * Cleanup: called when app is quitting.
   * Saves all window snapshots for restoration on next launch.
   */
  closeAllWindows(): void {
    this.hostWindows.forEach((window) => {
      if (!window.isDestroyed()) {
        window.close();
      }
    });
    this.hostWindows.clear();
  }

  /**
   * Get snapshot of all open windows for persistence.
   */
  getAllWindowSnapshots(): HostWindowSnapshot[] {
    const snapshots: HostWindowSnapshot[] = [];
    this.hostWindows.forEach((window, hostId) => {
      const snapshot = this.snapshotHostWindow(hostId);
      if (snapshot) {
        snapshots.push(snapshot);
      }
    });
    return snapshots;
  }

  // ==================== Private Helpers ====================

  /**
   * Setup event handlers for a host window.
   */
  private setupWindowEvents(hostId: string, window: BrowserWindow): void {
    // Cleanup on close
    window.on("closed", () => {
      this.hostWindows.delete(hostId);
      console.log(`[revealGDB] Host window closed: ${hostId}`);
    });

    // Log focus/blur for debugging
    window.on("focus", () => {
      console.log(`[revealGDB] Host window focused: ${hostId}`);
    });

    window.on("blur", () => {
      console.log(`[revealGDB] Host window blurred: ${hostId}`);
    });

    // Log state changes
    window.on("maximize", () => {
      console.log(`[revealGDB] Host window maximized: ${hostId}`);
    });

    window.on("unmaximize", () => {
      console.log(`[revealGDB] Host window unmaximized: ${hostId}`);
    });

    window.on("enter-full-screen", () => {
      console.log(`[revealGDB] Host window entered fullscreen: ${hostId}`);
    });

    window.on("leave-full-screen", () => {
      console.log(`[revealGDB] Host window left fullscreen: ${hostId}`);
    });
  }

  /**
   * Get default bounds based on host type and current screen setup.
   */
  private getDefaultBounds(hostId: string): SatelliteWindowBounds {
    if (hostId === "main") {
      // Main window: 80% of primary screen
      const primary = screen.getPrimaryDisplay();
      const workArea = primary.workArea;
      const width = Math.round(workArea.width * 0.8);
      const height = Math.round(workArea.height * 0.8);
      const x = Math.round(workArea.x + (workArea.width - width) / 2);
      const y = Math.round(workArea.y + (workArea.height - height) / 2);
      return { x, y, width, height };
    }

    // Satellite: smaller, offset from main
    const main = this.hostWindows.get("main");
    if (main && !main.isDestroyed()) {
      const mainBounds = main.getBounds();
      return {
        x: mainBounds.x + 50 * (this.getSatelliteWindowCount() + 1),
        y: mainBounds.y + 50 * (this.getSatelliteWindowCount() + 1),
        width: 600,
        height: 400,
      };
    }

    // Fallback to primary screen
    const primary = screen.getPrimaryDisplay();
    const workArea = primary.workArea;
    return {
      x: workArea.x + 100,
      y: workArea.y + 100,
      width: 600,
      height: 400,
    };
  }

  /**
   * Clamp window bounds to available screen area.
   * Prevents windows from being positioned off-screen.
   */
  private clampBoundsToScreen(bounds: SatelliteWindowBounds): SatelliteWindowBounds {
    const displays = screen.getAllDisplays();
    let totalBounds: SatelliteWindowBounds = { x: 0, y: 0, width: 0, height: 0 };

    // Calculate total screen area
    displays.forEach((display) => {
      const workArea = display.workArea;
      totalBounds.x = Math.min(totalBounds.x, workArea.x);
      totalBounds.y = Math.min(totalBounds.y, workArea.y);
      totalBounds.width = Math.max(totalBounds.width, workArea.x + workArea.width);
      totalBounds.height = Math.max(totalBounds.height, workArea.y + workArea.height);
    });

    // Clamp bounds
    let x = Math.max(totalBounds.x, bounds.x);
    let y = Math.max(totalBounds.y, bounds.y);

    // Ensure window is not too far right or bottom
    x = Math.min(x, totalBounds.x + totalBounds.width - 200);
    y = Math.min(y, totalBounds.y + totalBounds.height - 100);

    return {
      x,
      y,
      width: Math.max(300, bounds.width),
      height: Math.max(200, bounds.height),
    };
  }
}
