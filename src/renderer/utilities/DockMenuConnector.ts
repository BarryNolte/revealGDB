/**
 * Provides dock menu connector renderer utilities for formatting, state shaping, and shared view logic.
 *
 * @remarks
 * Exported symbols include `DockMenuConnector`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { Dialog } from "dock-spawn-ts";
import { DockManager } from "../../../node_modules/dock-spawn-ts/lib/js/DockManager.js";
import { PanelContainer } from "../../../node_modules/dock-spawn-ts/lib/js/PanelContainer.js";
import { SAVE_DOCK_LAYOUT, TOGGLE_WINDOW, UPDATE_WINDOW_LIST } from "./renderer-events";

/**
 * Metadata for a dockable panel/window.
 */
export type DockPanelInfo = {
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
    window.addEventListener(TOGGLE_WINDOW, (data: Event) => {
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
      window.dispatchEvent(new Event(UPDATE_WINDOW_LIST));
      window.dispatchEvent(new Event(SAVE_DOCK_LAYOUT));
    });
  }

  /**
   * Creates all windows for downstream use.
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
   * Performs reconsile panels as part of this module's public API.
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
   * Returns panel list from current state.
   *
   * @returns The resulting collection produced by this operation.
   */
  public getPanelList(): DockPanelInfo[] {
    return Array.from(this.panelMap.values());
  }

  /**
   * Registers panel for the active runtime context.
   *
   * @param id - Unique identifier used to look up the target entity.
   * @param displayName - Value for `displayName` consumed by this operation.
   * @param description - Value for `description` consumed by this operation.
   * @param iconCss - Value for `iconCss` consumed by this operation.
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
   * Returns dock panel info by display name from current state.
   *
   * @param dn - Value for `dn` consumed by this operation.
   * @returns The computed result produced by this operation.
   */
  public getDockPanelInfoByDisplayName(dn: string): DockPanelInfo | undefined {
    return this.panelMap.get(dn);
  }

  /**
   * Returns panel by display name from current state.
   *
   * @param dn - Value for `dn` consumed by this operation.
   * @returns The computed result produced by this operation.
   */
  public getPanelByDisplayName(dn: string): PanelContainer {
    const panel = this.panelMap.get(dn)?.panel;
    if (!panel) {
      throw new Error(`Panel '${dn}' is not registered or not initialized`);
    }
    return panel;
  }

  /**
   * Performs is visible as part of this module's public API.
   *
   * @param displayName - Value for `displayName` consumed by this operation.
   * @returns True when the operation succeeds; otherwise false.
   */
  public isVisible(displayName: string): boolean {
    const di = this.panelMap.get(displayName);
    if (di?.dialog) {
      return false;
    }
    return true;
  }
}
