/**
 * Handles satellite window lifecycle and state management in the main process.
 *
 * @remarks
 * Manages creation, closure, and persistence of satellite windows.
 * Coordinates with the renderer process via IPC for state synchronization.
 *
 * Exported symbols include `SatelliteWindowHandler`.
 */

import type { BrowserWindow } from "electron";
import type {
  SatelliteWindowsState,
  SatelliteWindowState,
  SatelliteWindowBounds,
} from "../common/satellite-window-types";

/**
 * Handles satellite window management on the main process.
 * Tracks window lifecycle, manages bounds, and coordinates persistence.
 */
export class SatelliteWindowHandler {
  /** Map of window IDs to satellite window metadata */
  private satelliteWindows: Map<string, { windowId: string; lastModified: number }> = new Map();

  /** Counter for generating unique window IDs */
  private windowCounter: number = 0;

  /**
   * Creates a new satellite window handler.
   */
  constructor() {
    console.log("[SatelliteWindowHandler] Initialized");
  }

  /**
   * Registers a newly created satellite window.
   *
   * @param windowId - The ID of the satellite window
   * @param window - The BrowserWindow instance
   * @returns The generated window metadata
   */
  public registerWindow(windowId: string, window: BrowserWindow): SatelliteWindowState {
    const bounds = window.getBounds();
    const state: SatelliteWindowState = {
      windowId,
      title: window.getTitle(),
      layout: {}, // Will be populated when window closes
      bounds: {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      },
      autoRestore: true,
      lastModified: Date.now(),
    };

    this.satelliteWindows.set(windowId, {
      windowId,
      lastModified: Date.now(),
    });

    console.log(`[SatelliteWindowHandler] Registered window: ${windowId}`);
    return state;
  }

  /**
   * Unregisters a closed satellite window.
   *
   * @param windowId - The ID of the window being closed
   */
  public unregisterWindow(windowId: string): void {
    this.satelliteWindows.delete(windowId);
    console.log(`[SatelliteWindowHandler] Unregistered window: ${windowId}`);
  }

  /**
   * Updates window bounds when resized/moved.
   *
   * @param windowId - The ID of the window
   * @param bounds - The new bounds
   */
  public updateWindowBounds(windowId: string, bounds: SatelliteWindowBounds): void {
    const metadata = this.satelliteWindows.get(windowId);
    if (metadata) {
      metadata.lastModified = Date.now();
      console.log(
        `[SatelliteWindowHandler] Updated bounds for ${windowId}: x=${bounds.x} y=${bounds.y} w=${bounds.width} h=${bounds.height}`,
      );
    }
  }

  /**
   * Generates a unique window ID.
   *
   * @returns A unique window identifier
   */
  private generateWindowId(): string {
    return `satellite-window-${++this.windowCounter}`;
  }

  /**
   * Returns all registered satellite windows.
   *
   * @returns Array of window IDs
   */
  public getWindowIds(): string[] {
    return Array.from(this.satelliteWindows.keys());
  }

  /**
   * Gets metadata for a specific window.
   *
   * @param windowId - The window ID
   * @returns Window metadata or undefined
   */
  public getWindowMetadata(
    windowId: string,
  ): { windowId: string; lastModified: number } | undefined {
    return this.satelliteWindows.get(windowId);
  }

  /**
   * Closes all satellite windows.
   *
   * @param windows - Map of window IDs to BrowserWindow instances
   */
  public closeAllSatelliteWindows(windows: Map<string, BrowserWindow>): void {
    for (const windowId of this.satelliteWindows.keys()) {
      const win = windows.get(windowId);
      if (win && !win.isDestroyed()) {
        win.close();
      }
    }
  }

  /**
   * Creates state snapshot for persistence.
   *
   * @param stateByWindowId - Map of window IDs to their layout states
   * @returns SatelliteWindowsState ready for persistence
   */
  public createStateSnapshot(stateByWindowId: Map<string, unknown>): SatelliteWindowsState {
    const windows: Record<string, SatelliteWindowState> = {};

    for (const [windowId, metadata] of this.satelliteWindows.entries()) {
      const layout = stateByWindowId.get(windowId) || {};
      windows[windowId] = {
        windowId,
        title: `Window ${windowId}`,
        layout,
        bounds: { x: 0, y: 0, width: 800, height: 600 },
        autoRestore: true,
        lastModified: metadata.lastModified,
      };
    }

    return {
      windows,
      windowCounter: this.windowCounter,
    };
  }

  /**
   * Restores satellite windows from persisted state.
   *
   * @param state - The saved SatelliteWindowsState
   * @returns List of window IDs to restore
   */
  public restoreFromSnapshot(state: SatelliteWindowsState): string[] {
    this.windowCounter = state.windowCounter;
    const windowIds: string[] = [];

    for (const [id, windowState] of Object.entries(state.windows)) {
      if (windowState.autoRestore) {
        this.satelliteWindows.set(id, {
          windowId: id,
          lastModified: windowState.lastModified,
        });
        windowIds.push(id);
      }
    }

    console.log(`[SatelliteWindowHandler] Restored ${windowIds.length} satellite windows`);
    return windowIds;
  }
}
