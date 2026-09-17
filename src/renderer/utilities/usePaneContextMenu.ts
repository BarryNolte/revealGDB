/**
 * usePaneContextMenu Hook
 *
 * Attaches right-click context menus to dock-spawn-ts pane headers.
 * Allows users to float/dock windows from the UI.
 *
 * @remarks
 * dock-spawn-ts renders pane headers dynamically in the DOM.
 * We monitor the DOM for `.ps-panel-title` elements and attach context menu handlers.
 */

import { useEffect, useRef, type MutableRefObject } from "react";

export interface PaneContextMenuOptions {
  onFloatPane?: (panelTitle: string) => void;
  onDockPane?: (panelTitle: string) => void;
  onSplitPane?: (panelTitle: string, direction: "horizontal" | "vertical") => void;
  onOpenConnections?: () => void;
  onCreateWindow?: () => void;
  isPanelFloating?: (panelTitle: string) => boolean;
  getMoveTargets?: () => Array<{ hostId: string; label: string }>;
  onMoveToHost?: (panelTitle: string, targetHostId: string) => void;
}

interface MenuElement extends HTMLDivElement {
  __dockItem?: HTMLDivElement;
  __splitHorizontalItem?: HTMLDivElement;
  __splitVerticalItem?: HTMLDivElement;
  __openConnectionsItem?: HTMLDivElement;
  __createWindowItem?: HTMLDivElement;
  __moveItems?: HTMLDivElement[];
}

function applyMenuItemHoverStyles(item: HTMLDivElement): void {
  item.addEventListener("mouseenter", () => {
    item.style.backgroundColor = "#f0f0f0";
  });
  item.addEventListener("mouseleave", () => {
    item.style.backgroundColor = "";
  });
}

function createMenuItem(id: string, text: string): HTMLDivElement {
  const item = document.createElement("div");
  item.id = id;
  item.tabIndex = 0;
  item.textContent = text;
  item.setAttribute("role", "menuitem");
  item.setAttribute("aria-label", text);
  item.style.cssText = `
    padding: 6px 12px;
    cursor: pointer;
    user-select: none;
    outline: none;
    transition: background-color 120ms ease;
  `;
  applyMenuItemHoverStyles(item);
  return item;
}

/**
 * Create a context menu DOM element
 */
function createContextMenu(): HTMLDivElement {
  const menu = document.createElement("div");
  menu.id = "pane-context-menu";
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "Pane actions");
  menu.style.cssText = `
    position: fixed;
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    z-index: 10000;
    display: none;
    min-width: 150px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 12px;
    opacity: 0;
    transform: translateY(-2px);
    transition: opacity 120ms ease, transform 120ms ease;
  `;

  const floatItem = createMenuItem("float-item", "Float Window");

  const dockItem = createMenuItem("dock-item", "Dock Window");
  dockItem.style.cssText = `
    padding: 6px 12px;
    cursor: pointer;
    user-select: none;
    display: none;
  `;
  applyMenuItemHoverStyles(dockItem);

  const splitHorizontalItem = createMenuItem("split-horizontal-item", "Split Horizontal");
  const splitVerticalItem = createMenuItem("split-vertical-item", "Split Vertical");
  const openConnectionsItem = createMenuItem("open-connections-item", "Connections");
  const createWindowItem = createMenuItem("create-window-item", "New Window");

  // Store dock item ref for toggling visibility
  (menu as MenuElement).__dockItem = dockItem;
  (menu as MenuElement).__splitHorizontalItem = splitHorizontalItem;
  (menu as MenuElement).__splitVerticalItem = splitVerticalItem;
  (menu as MenuElement).__openConnectionsItem = openConnectionsItem;
  (menu as MenuElement).__createWindowItem = createWindowItem;

  menu.appendChild(floatItem);
  menu.appendChild(dockItem);
  menu.appendChild(splitHorizontalItem);
  menu.appendChild(splitVerticalItem);
  menu.appendChild(openConnectionsItem);
  menu.appendChild(createWindowItem);
  document.body.appendChild(menu);

  return menu as MenuElement;
}

/**
 * Attach menu item click handlers
 */
function attachMenuHandlers(
  menu: MenuElement,
  selectedPanelRef: MutableRefObject<string | null>,
  options: PaneContextMenuOptions,
  hideMenu: () => void,
): void {
  const floatItem = menu.querySelector("#float-item") as HTMLDivElement;
  const dockItem = menu.querySelector("#dock-item") as HTMLDivElement;
  const splitHorizontalItem = menu.querySelector("#split-horizontal-item") as HTMLDivElement;
  const splitVerticalItem = menu.querySelector("#split-vertical-item") as HTMLDivElement;
  const openConnectionsItem = menu.querySelector("#open-connections-item") as HTMLDivElement;
  const createWindowItem = menu.querySelector("#create-window-item") as HTMLDivElement;

  if (floatItem) {
    floatItem.onclick = () => {
      if (selectedPanelRef.current && options.onFloatPane) {
        options.onFloatPane(selectedPanelRef.current);
        hideMenu();
      }
    };
  }

  if (dockItem) {
    dockItem.onclick = () => {
      if (selectedPanelRef.current && options.onDockPane) {
        options.onDockPane(selectedPanelRef.current);
        hideMenu();
      }
    };
  }

  if (splitHorizontalItem) {
    splitHorizontalItem.onclick = () => {
      if (selectedPanelRef.current && options.onSplitPane) {
        options.onSplitPane(selectedPanelRef.current, "horizontal");
        hideMenu();
      }
    };
  }

  if (splitVerticalItem) {
    splitVerticalItem.onclick = () => {
      if (selectedPanelRef.current && options.onSplitPane) {
        options.onSplitPane(selectedPanelRef.current, "vertical");
        hideMenu();
      }
    };
  }

  if (openConnectionsItem) {
    openConnectionsItem.onclick = () => {
      options.onOpenConnections?.();
      hideMenu();
    };
  }

  if (createWindowItem) {
    createWindowItem.onclick = () => {
      options.onCreateWindow?.();
      hideMenu();
    };
  }

  const bindMoveItemHandlers = () => {
    for (const item of menu.__moveItems || []) {
      item.onclick = () => {
        const targetHostId = item.dataset.targetHostId;
        if (selectedPanelRef.current && targetHostId && options.onMoveToHost) {
          options.onMoveToHost(selectedPanelRef.current, targetHostId);
          hideMenu();
        }
      };
    }
  };

  bindMoveItemHandlers();

  Object.defineProperty(menu, "__bindMoveItemHandlers", {
    value: bindMoveItemHandlers,
    configurable: true,
  });
}

function ensureContextMenu(
  menuRef: MutableRefObject<MenuElement | null>,
  selectedPanelRef: MutableRefObject<string | null>,
  options: PaneContextMenuOptions,
): MenuElement {
  if (!menuRef.current) {
    menuRef.current = createContextMenu();
    attachMenuHandlers(menuRef.current, selectedPanelRef, options, () => {
      if (menuRef.current) {
        menuRef.current.style.display = "none";
      }
    });
  }

  return menuRef.current;
}

function hideContextMenu(menuRef: MutableRefObject<MenuElement | null>): void {
  if (menuRef.current) {
    menuRef.current.style.display = "none";
    menuRef.current.style.opacity = "0";
    menuRef.current.style.transform = "translateY(-2px)";
    (document.activeElement as HTMLElement | null)?.blur?.();
  }
}

function showContextMenu(
  menuRef: MutableRefObject<MenuElement | null>,
  selectedPanelRef: MutableRefObject<string | null>,
  options: PaneContextMenuOptions,
  x: number,
  y: number,
  panelTitle: string,
  isFloating: boolean,
): void {
  const menu = ensureContextMenu(menuRef, selectedPanelRef, options);

  selectedPanelRef.current = panelTitle;
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  menu.style.display = "block";
  menu.style.opacity = "1";
  menu.style.transform = "translateY(0)";

  const dockItem = menu.__dockItem;
  if (dockItem) {
    dockItem.style.display = isFloating ? "block" : "none";
  }

  for (const item of menu.__moveItems || []) {
    item.remove();
  }
  menu.__moveItems = [];

  const moveTargets = options.getMoveTargets?.() || [];
  if (moveTargets.length > 0) {
    for (const target of moveTargets) {
      const moveItem = createMenuItem(`move-to-${target.hostId}`, `Move To ${target.label}`);
      moveItem.dataset.targetHostId = target.hostId;
      menu.appendChild(moveItem);
      menu.__moveItems.push(moveItem);
    }

    const bindMoveHandlers = (
      menu as MenuElement & {
        __bindMoveItemHandlers?: () => void;
      }
    ).__bindMoveItemHandlers;
    bindMoveHandlers?.();
  }

  const firstMenuItem = menu.querySelector('[role="menuitem"]') as HTMLDivElement | null;
  if (firstMenuItem) {
    firstMenuItem.focus();
  }
}

function handlePaneContextMenu(
  options: PaneContextMenuOptions,
  showMenu: (x: number, y: number, panelTitle: string, isFloating: boolean) => void,
): (event: MouseEvent) => void {
  return (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const titleElement = target.closest(".ps-panel-title");

    if (titleElement) {
      event.preventDefault();
      event.stopPropagation();

      const panelTitle = (titleElement as HTMLElement).textContent?.trim() || "";
      const isFloating = options.isPanelFloating?.(panelTitle) ?? false;

      showMenu(event.clientX, event.clientY, panelTitle, isFloating);
    }
  };
}

function handlePaneMenuKeyDown(
  menuRef: MutableRefObject<MenuElement | null>,
  hideMenu: () => void,
): (event: KeyboardEvent) => void {
  return (event: KeyboardEvent) => {
    if (!menuRef.current || !menuRef.current.contains(event.target as Node)) {
      return;
    }

    const items = Array.from(
      menuRef.current.querySelectorAll('[role="menuitem"]'),
    ) as HTMLDivElement[];
    const focusedIndex = items.indexOf(document.activeElement as HTMLDivElement);

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (items.length > 0) {
          const nextIndex = focusedIndex >= 0 ? focusedIndex + 1 : 0;
          items[Math.min(nextIndex, items.length - 1)]?.focus();
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        if (items.length > 0) {
          const nextIndex = focusedIndex > 0 ? focusedIndex - 1 : 0;
          items[nextIndex]?.focus();
        }
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        (document.activeElement as HTMLDivElement | null)?.click();
        break;
      case "Escape":
        event.preventDefault();
        hideMenu();
        break;
      default:
        break;
    }
  };
}

/**
 * Setup context menu event listeners
 */
function setupContextMenuListeners(
  menuRef: MutableRefObject<MenuElement | null>,
  selectedPanelRef: MutableRefObject<string | null>,
  options: PaneContextMenuOptions,
): () => void {
  const showMenu = (x: number, y: number, panelTitle: string, isFloating: boolean) => {
    showContextMenu(menuRef, selectedPanelRef, options, x, y, panelTitle, isFloating);
  };

  const hideMenu = () => hideContextMenu(menuRef);
  const handleContextMenu = handlePaneContextMenu(options, showMenu);
  const handleClickOutside = (e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      hideMenu();
    }
  };
  const handleMenuKeyDown = handlePaneMenuKeyDown(menuRef, hideMenu);

  document.addEventListener("contextmenu", handleContextMenu, true);
  document.addEventListener("click", handleClickOutside, true);
  document.addEventListener("keydown", handleMenuKeyDown, true);

  return () => {
    document.removeEventListener("contextmenu", handleContextMenu, true);
    document.removeEventListener("click", handleClickOutside, true);
    document.removeEventListener("keydown", handleMenuKeyDown, true);
    if (menuRef.current) {
      menuRef.current.remove();
      menuRef.current = null;
    }
  };
}

/**
 * Custom hook to attach right-click context menus to dock pane headers.
 *
 * @param options - Callbacks for float/dock operations
 */
export function usePaneContextMenu(options: PaneContextMenuOptions): void {
  const menuRef = useRef<MenuElement | null>(null);
  const selectedPanelRef = useRef<string | null>(null);

  useEffect(() => {
    return setupContextMenuListeners(menuRef, selectedPanelRef, options);
  }, [options]);
}
