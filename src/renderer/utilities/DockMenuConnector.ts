import { Dialog } from "dock-spawn-ts";
import { DockManager } from "../../../node_modules/dock-spawn-ts/lib/js/DockManager.js";
import { PanelContainer } from "../../../node_modules/dock-spawn-ts/lib/js/PanelContainer.js";

type DockPanelInfo = {
  id: string;
  displayName: string;
  description: string;
  iconCss: string;
  visible: boolean;
  panel?: PanelContainer;
  dialog?: Dialog;
};

export class DockMenuConnector {
  private dockManager: DockManager;
  private panelMap: Map<string, DockPanelInfo> = new Map<string, DockPanelInfo>();

  constructor(dm: DockManager) {
    this.dockManager = dm;

    window.addEventListener("toggle-window", (data: Event) => {
      const ev = data as CustomEvent;
      const di = this.getDockPanelInfoByDisplayName(ev.detail);
      if (di) {
        di.visible = !di.visible;
        if (!di.visible) {
          if (!di.panel?.isDialog) {
            di.dialog = di.panel?.performUndockToDialog(undefined, { x: 0, y: 0 });
            di.dialog?.setPosition(-100000, 0);
            di.dialog?.hide();
          } else {
            di.panel?.floatingDialog?.setPosition(-100000, 0);
            di.panel?.floatingDialog?.hide();
          }
        } else {
          if (di.panel) {
            if (di.dialog) {
              this.dockManager.dockDialogUp(this.dockManager.context.model.rootNode, di.dialog);
              di.dialog = undefined;
            }
          }
        }
      }
      window.dispatchEvent(new Event("update-window-list"));
      window.dispatchEvent(new Event("save-dock-layout"));
    });
  }

  public createAllWindows(): void {
    this.panelMap.forEach((di) => {
      const el = document.getElementById(di.id);
      if (el) {
        const panel = new PanelContainer(el, this.dockManager, di.displayName);
        panel.hideCloseButton(true);
        di.panel = panel;
      }
    });
  }

  public reconsilePanels(): void {
    this.dockManager.getPanels().forEach((p) => {
      const pi = this.panelMap.get(p.title);
      if (pi) {
        pi.panel = p;
      }
    });
  }

  public getPanelList(): DockPanelInfo[] {
    return Array.from(this.panelMap.values());
  }

  public registerPanel(
    id: string,
    displayName: string,
    description: string,
    iconCss?: string,
  ): void {
    const dockPanelInfo = new Object() as DockPanelInfo;
    dockPanelInfo.id = id;
    dockPanelInfo.displayName = displayName;
    dockPanelInfo.description = description;
    dockPanelInfo.iconCss = iconCss ? iconCss : "";
    dockPanelInfo.visible = true;
    dockPanelInfo.dialog = undefined;
    this.panelMap.set(displayName, dockPanelInfo);
  }

  public getDockPanelInfoByDisplayName(dn: string): DockPanelInfo | undefined {
    return this.panelMap.get(dn);
  }

  public getPanelByDisplayName(dn: string): PanelContainer {
    return this.panelMap.get(dn)!.panel!;
  }

  public isVisible(displayName: string): boolean {
    const di = this.panelMap.get(displayName);
    if (di?.dialog) {
      return false;
    }
    return true;
  }
}
