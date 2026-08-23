/**
 * Satellite window manager for revealGDB.
 *
 * @remarks
 * Handles creation and lifecycle management of satellite (browser) windows
 * that can host docked panels. Provides callbacks to DockManager for preparing
 * elements before moving them to new windows and handling window lifecycle events.
 *
 * Exported symbols include `SatelliteWindowManager`.
 */

import type { NewWindowParams } from "dock-spawn-ts";
import { DockManager, PanelContainer } from "dock-spawn-ts";

/**
 * Manages satellite windows for multi-window docking support.
 * Tracks open windows, manages lifecycle events, and persists window state.
 */
export class SatelliteWindowManager {
  /** Map of window IDs to opened windows */
  private satelliteWindows: Map<string, Window> = new Map();

  /** Counter for generating unique window IDs */
  private windowCounter: number = 0;

  /** Reference to the main DockManager */
  private dockManager: DockManager;

  /**
   * Creates a new satellite window manager.
   *
   * @param dockManager - The main DockManager instance
   */
  constructor(dockManager: DockManager) {
    this.dockManager = dockManager;
    this.setupDockManagerCallbacks();
  }

  /**
   * Sets up callbacks on the DockManager for handling satellite windows.
   * These callbacks are invoked by dock-spawn-ts when panels are undocked.
   */
  private setupDockManagerCallbacks(): void {
    // Callback when element is being prepared for a new window
    this.dockManager.prepareElementForNewWindow = (
      element: HTMLElement,
      params: NewWindowParams,
      win: Window,
    ) => {
      const windowId = this.generateWindowId();

      // Store reference to this window
      this.satelliteWindows.set(windowId, win);

      // Track window closure
      const originalOnUnload = win.onunload;
      win.onunload = () => {
        this.satelliteWindows.delete(windowId);
        if (originalOnUnload) {
          originalOnUnload.call(win);
        }
      };

      // Return the element (optionally wrapped)
      return element;
    };

    // Callback when a new window has been created
    this.dockManager.notifyOnNewWindow = (panelContainer: PanelContainer, win: Window) => {
      const windowId = this.generateWindowId();

      console.log(`[SatelliteWindowManager] New window created for panel: ${panelContainer.title}`);

      // Store and track the window
      this.satelliteWindows.set(windowId, win);

      // Handle window focus/blur for active panel tracking
      win.addEventListener("focus", () => {
        console.log(
          `[SatelliteWindowManager] Window focused: ${panelContainer.title} (${windowId})`,
        );
      });

      win.addEventListener("blur", () => {
        console.log(
          `[SatelliteWindowManager] Window blurred: ${panelContainer.title} (${windowId})`,
        );
      });

      // Persist window state on close
      const originalOnBeforeUnload = win.onbeforeunload;
      win.onbeforeunload = (e) => {
        this.onSatelliteWindowClosing(windowId, panelContainer);
        if (originalOnBeforeUnload) {
          return originalOnBeforeUnload.call(win, e);
        }
      };
    };
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
   * Called when a satellite window is closing.
   * Handles cleanup and state persistence.
   *
   * @param windowId - The ID of the closing window
   * @param panelContainer - The panel container in the window
   */
  private onSatelliteWindowClosing(windowId: string, _panelContainer: PanelContainer): void {
    console.log(`[SatelliteWindowManager] Window closing: ${windowId}`);

    // Remove from tracking
    this.satelliteWindows.delete(windowId);

    // Notify about layout change for persistence
    window.dispatchEvent(new Event("save-dock-layout"));
  }

  /**
   * Returns the number of currently open satellite windows.
   *
   * @returns Count of open satellite windows
   */
  public getSatelliteWindowCount(): number {
    return this.satelliteWindows.size;
  }

  /**
   * Returns all currently open satellite windows.
   *
   * @returns Array of open windows
   */
  public getSatelliteWindows(): Window[] {
    return Array.from(this.satelliteWindows.values());
  }

  /**
   * Closes all satellite windows.
   */
  public closeAllSatelliteWindows(): void {
    for (const win of this.satelliteWindows.values()) {
      if (win && !win.closed) {
        win.close();
      }
    }
    this.satelliteWindows.clear();
  }

  /**
   * Gets information about all open satellite windows.
   *
   * @returns Array of window information objects
   */
  public getWindowInfo(): Array<{
    id: string;
    title: string;
    closed: boolean;
  }> {
    return Array.from(this.satelliteWindows.entries()).map(([id, win]) => ({
      id,
      title: win?.document?.title || "Untitled",
      closed: win?.closed ?? true,
    }));
  }
}
