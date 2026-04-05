/**
 * Dock-spawn-ts integration layer for RevealGDB.
 *
 * This class bridges the dock-spawn-ts docking library with the application's
 * window management system. It manages:
 * - Panel registration and creation
 * - Window visibility toggling
 * - Integration with the toolbar window list
 * - Dialog-based hiding of panels
 */

import { Dialog } from "dock-spawn-ts";
import { DockManager } from "../../../node_modules/dock-spawn-ts/lib/js/DockManager.js";
import { PanelContainer } from "../../../node_modules/dock-spawn-ts/lib/js/PanelContainer.js";

/**
 * Metadata for a dockable panel/window.
 */
type DockPanelInfo = {
  /** HTML element ID */
  id: string;
  /** Name shown in UI (toolbar, menu) */
  displayName: string;
  /** Longer description for tooltips */
  description: string;
  /** CSS class for panel icon */
  iconCss: string;
  /** Whether panel is currently visible */
  visible: boolean;
  /** Reference to the dock panel container */
  panel?: PanelContainer;
  /** Reference to dialog when panel is hidden */
  dialog?: Dialog;
};

export class DockMenuConnector {
  private dockManager: DockManager;
  private panelMap: Map<string, DockPanelInfo> = new Map<string, DockPanelInfo>();

  /**
   * Creates a new dock menu connector.
   *
   * @param dm - The DockManager instance to connect to
   */
  constructor(dm: DockManager) {
    this.dockManager = dm;

    // Listen for window visibility toggle requests from toolbar
    window.addEventListener("toggle-window", (data: Event) => {
      const ev = data as CustomEvent;
      const di = this.getDockPanelInfoByDisplayName(ev.detail);
      if (di) {
        di.visible = !di.visible;
        if (!di.visible) {
          // Hide panel by converting to dialog and moving off-screen
          if (!di.panel?.isDialog) {
            di.dialog = di.panel?.performUndockToDialog(undefined, { x: 0, y: 0 });
            di.dialog?.setPosition(-100000, 0);
            di.dialog?.hide();
          } else {
            di.panel?.floatingDialog?.setPosition(-100000, 0);
            di.panel?.floatingDialog?.hide();
          }
        } else {
          // Show panel by docking dialog back into layout
          if (di.panel) {
            if (di.dialog) {
              this.dockManager.dockDialogUp(this.dockManager.context.model.rootNode, di.dialog);
              di.dialog = undefined;
            }
          }
        }
      }
      // Update UI and save layout
      window.dispatchEvent(new Event("update-window-list"));
      window.dispatchEvent(new Event("save-dock-layout"));
    });
  }

  /**
   * Creates panel containers for all registered panels.
   * Should be called after all panels are registered.
   */
  public createAllWindows(): void {
    this.panelMap.forEach((di) => {
      const el = document.getElementById(di.id);
      if (el) {
        const panel = new PanelContainer(el, this.dockManager, di.displayName);
        panel.hideCloseButton(true); // Disable close button (use visibility toggle instead)
        di.panel = panel;
      }
    });
  }

  /**
   * Synchronizes panel references after layout changes.
   * Updates the panel map with current panel instances from the dock manager.
   */
  public reconsilePanels(): void {
    this.dockManager.getPanels().forEach((p) => {
      const pi = this.panelMap.get(p.title);
      if (pi) {
        pi.panel = p;
      }
    });
  }

  /**
   * Gets a list of all registered panels.
   *
   * @returns Array of DockPanelInfo objects
   */
  public getPanelList(): DockPanelInfo[] {
    return Array.from(this.panelMap.values());
  }

  /**
   * Registers a new panel with the dock system.
   *
   * @param id - HTML element ID of the panel
   * @param displayName - Name shown in toolbar and menus
   * @param description - Longer description for tooltips
   * @param iconCss - Optional CSS class for panel icon
   */
  public registerPanel(
    id: string,
    displayName: string,
    description: string,
    iconCss?: string,
  ): void {
    const dockPanelInfo: DockPanelInfo = {
      id,
      displayName,
      description,
      iconCss: iconCss ?? "",
      visible: true,
      dialog: undefined,
    };
    this.panelMap.set(displayName, dockPanelInfo);
  }

  /**
   * Retrieves panel info by display name.
   *
   * @param dn - The display name of the panel
   * @returns DockPanelInfo or undefined if not found
   */
  public getDockPanelInfoByDisplayName(dn: string): DockPanelInfo | undefined {
    return this.panelMap.get(dn);
  }

  /**
   * Retrieves panel container by display name.
   *
   * @param dn - The display name of the panel
   * @returns PanelContainer instance
   */
  public getPanelByDisplayName(dn: string): PanelContainer {
    const panel = this.panelMap.get(dn)?.panel;
    if (!panel) {
      throw new Error(`Panel '${dn}' is not registered or not initialized`);
    }
    return panel;
  }

  /**
   * Checks if a panel is currently visible.
   *
   * @param displayName - The display name of the panel
   * @returns true if visible, false if hidden as dialog
   */
  public isVisible(displayName: string): boolean {
    const di = this.panelMap.get(displayName);
    if (di?.dialog) {
      return false;
    }
    return true;
  }
}
