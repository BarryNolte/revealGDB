import type { OpenWindowTitle } from "../../common/ipc-data-types";
import type { DockManager } from "../../../node_modules/dock-spawn-ts/lib/js/DockManager.js";

type Cleanup = () => void;

const TAB_HANDLE_SELECTOR = ".dockspan-tab-handle";
const TAB_HANDLE_TEXT_SELECTOR = ".dockspan-tab-handle-text";
const PANEL_TITLE_BAR_SELECTOR = ".panel-titlebar";
const PANEL_TITLE_BAR_TEXT_SELECTOR = ".panel-titlebar-text";
const CONTEXT_MENU_CLASS = "dockspab-tab-handle-context-menu";

function getClickedPanelTitle(panelSurface: HTMLElement | null): string {
  const candidates = [
    panelSurface?.querySelector(TAB_HANDLE_TEXT_SELECTOR),
    panelSurface?.querySelector(PANEL_TITLE_BAR_TEXT_SELECTOR),
    panelSurface,
  ];

  for (const candidate of candidates) {
    const title = (candidate?.textContent ?? "").trim();
    if (title.length > 0) {
      return title;
    }
  }

  return "";
}

function createMenuItem(label: string, onClick?: () => void): HTMLDivElement {
  const item = document.createElement("div");
  item.innerText = label;
  if (onClick) {
    item.onclick = onClick;
  }
  return item;
}

function findPanelByTitle(dockManager: DockManager, panelTitle: string) {
  return dockManager
    .getPanels()
    .find((panel) => (panel.elementTitleText?.innerText ?? "").trim() === panelTitle);
}

export function installPanelTabContextMenu(dockManager: DockManager): Cleanup {
  let contextMenuElement: HTMLDivElement | undefined;
  let mouseUpListener: ((event: MouseEvent) => void) | undefined;

  const closeMenu = () => {
    if (!contextMenuElement) {
      return;
    }

    if (contextMenuElement.parentElement) {
      contextMenuElement.parentElement.removeChild(contextMenuElement);
    }
    contextMenuElement = undefined;

    if (mouseUpListener) {
      window.removeEventListener("mouseup", mouseUpListener);
      mouseUpListener = undefined;
    }
  };

  const contextMenuListener = async (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    const panelSurface = target?.closest(
      `${TAB_HANDLE_SELECTOR}, ${PANEL_TITLE_BAR_SELECTOR}, ${PANEL_TITLE_BAR_TEXT_SELECTOR}`,
    ) as HTMLElement | null;
    if (!panelSurface) {
      closeMenu();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    closeMenu();

    const panelTitle = getClickedPanelTitle(panelSurface);
    if (!panelTitle) {
      return;
    }

    const openWindowTitles: OpenWindowTitle[] =
      (await window.ipcToMain.queries.app.getOpenWindowTitles()) ?? [];

    const movePanelToWindow = (targetUniqueId?: string) => {
      const panel = findPanelByTitle(dockManager, panelTitle);
      if (!panel) {
        closeMenu();
        return;
      }

      if (targetUniqueId) {
        window.ipcToMain.commands.app.notifyMain({
          command: "move-panel-to-window",
          data: { panelTitle, targetUniqueId },
        });
      } else {
        window.ipcToMain.commands.app.notifyMain({
          command: "move-panel-to-new-window",
          data: { panelTitle },
        });
      }
      closeMenu();
    };

    const menuItems: HTMLDivElement[] = [];

    menuItems.push(createMenuItem("Move to new Window", () => movePanelToWindow()));

    openWindowTitles.forEach((windowTitle) => {
      menuItems.push(
        createMenuItem(windowTitle.title, () => {
          movePanelToWindow(windowTitle.uniqueId);
        }),
      );
    });

    contextMenuElement = document.createElement("div");
    contextMenuElement.className = CONTEXT_MENU_CLASS;
    contextMenuElement.append(...menuItems);
    contextMenuElement.style.left = `${event.pageX}px`;
    contextMenuElement.style.top = `${event.pageY}px`;
    document.body.appendChild(contextMenuElement);

    mouseUpListener = (mouseUpEvent) => {
      if (!contextMenuElement) {
        return;
      }

      const clickPath = mouseUpEvent.composedPath();
      if (clickPath.includes(contextMenuElement)) {
        return;
      }

      closeMenu();
    };
    window.addEventListener("mouseup", mouseUpListener);
  };

  window.addEventListener("contextmenu", contextMenuListener);

  return () => {
    window.removeEventListener("contextmenu", contextMenuListener);
    closeMenu();
  };
}
