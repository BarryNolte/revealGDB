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

  private ensurePanelInitialized(displayName: string): PanelContainer | undefined {
    const panelInfo = this.panelMap.get(displayName);
    if (!panelInfo) {
      return undefined;
    }

    if (panelInfo.panel) {
      return panelInfo.panel;
    }

    const element = document.getElementById(panelInfo.id);
    if (!element) {
      return undefined;
    }

    const panel = new PanelContainer(element, this.dockManager, panelInfo.displayName);
    panel.hideCloseButton(true);
    panelInfo.panel = panel;
    return panel;
  }

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
      const displayName = String(ev.detail ?? "");
      const di = this.getDockPanelInfoByDisplayName(displayName);
      if (di && di.visible) {
        this.hidePanel(displayName);
      } else if (di) {
        this.showPanel(displayName);
      }
    });
  }

  /**
   * Creates all windows for downstream use.
   */
  public createAllWindows(): void {
    this.panelMap.forEach((di) => {
      this.ensurePanelInitialized(di.displayName);
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
    const panel = this.ensurePanelInitialized(dn);
    if (!panel) {
      throw new Error(`Panel '${dn}' is not registered or not initialized`);
    }
    return panel;
  }

  public ensurePanelDockedInRoot(displayName: string): void {
    const panel = this.getPanelByDisplayName(displayName);
    if (!panel.tabPage) {
      this.dockManager.dockFill(this.dockManager.context.model.documentManagerNode, panel);
    }
  }

  public hidePanel(displayName: string): void {
    const di = this.getDockPanelInfoByDisplayName(displayName);
    if (!di) {
      return;
    }
    const panel = this.ensurePanelInitialized(displayName);
    if (!panel) {
      return;
    }
    di.visible = false;
    if (!panel.isDialog) {
      di.dialog = panel.performUndockToDialog(undefined, { x: 0, y: 0 });
      di.dialog?.setPosition(-100000, 0);
      di.dialog?.hide();
    } else {
      panel.floatingDialog?.setPosition(-100000, 0);
      panel.floatingDialog?.hide();
    }
    window.dispatchEvent(new Event(UPDATE_WINDOW_LIST));
    window.dispatchEvent(new Event(SAVE_DOCK_LAYOUT));
  }

  public showPanel(displayName: string): void {
    const di = this.getDockPanelInfoByDisplayName(displayName);
    if (!di) {
      return;
    }
    const panel = this.ensurePanelInitialized(displayName);
    if (!panel) {
      return;
    }
    di.visible = true;
    if (di.dialog) {
      this.dockManager.dockDialogUp(this.dockManager.context.model.rootNode, di.dialog);
      di.dialog = undefined;
    } else if (!panel.tabPage) {
      this.dockManager.dockFill(this.dockManager.context.model.documentManagerNode, panel);
    }
    window.dispatchEvent(new Event(UPDATE_WINDOW_LIST));
    window.dispatchEvent(new Event(SAVE_DOCK_LAYOUT));
  }

  /**
   * Performs is visible as part of this module's public API.
   *
   * @param displayName - Value for `displayName` consumed by this operation.
   * @returns True when the operation succeeds; otherwise false.
   */
  // fallow-ignore-next-line unused-class-member
  public isVisible(displayName: string): boolean {
    const di = this.panelMap.get(displayName);
    if (di?.dialog) {
      return false;
    }
    return true;
  }

  /**
   * Activates (selects) the tab for the panel with the given display name.
   *
   * @param displayName - The display name of the panel to activate.
   */
  public activatePanel(displayName: string): void {
    const panel = this.panelMap.get(displayName)?.panel;
    if (panel?.tabPage) {
      panel.tabPage.host.setActiveTab(panel);
    }
  }
}
