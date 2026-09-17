/**
 * WorkspaceService
 *
 * Core domain logic for multi-window, multi-panel workspace management.
 * Owns authoritative workspace state and coordinates all mutations.
 */

import { EventEmitter } from "events";
import {
  DockableWindow,
  LayoutNode,
  Pane,
  Rectangle,
  Splitter,
  Workspace,
  WorkspaceWindow,
} from "../common/workspace-types";

/**
 * Service for managing multi-window workspace state and mutations
 */
export class WorkspaceService extends EventEmitter {
  private workspace: Workspace;

  constructor(initialWorkspace?: Workspace) {
    super();
    this.workspace = initialWorkspace || this.createDefaultWorkspace();
    this.normalizeWorkspaceLayouts();
    if (this.workspace && !this.workspace.metadata) {
      this.workspace.metadata = {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        appVersion: "1.0.0",
      };
    }
  }

  /**
   * Create a default workspace with main window and documents/toolwindows groups
   */
  private createDefaultWorkspace(): Workspace {
    const mainWindowId = this.generateId("window");

    return {
      version: 1,
      windows: [
        {
          id: mainWindowId,
          type: "main",
          bounds: { x: 0, y: 0, width: 1200, height: 800 },
          layout: {
            id: this.generateId("layout"),
            root: {
              id: this.generateId("pane"),
              windowIds: [],
              size: 1.0,
            },
          },
          isMinimized: false,
          isMaximized: false,
          hostId: "main",
        },
      ],
      hosts: [
        {
          id: "main",
          label: "Main Window",
          isVisible: true,
          createdAt: Date.now(),
        },
      ],
      groups: [
        {
          name: "documents",
          type: "SourceFileWindow",
          windows: [],
        },
        {
          name: "toolwindows",
          type: "ToolWindow",
          windows: [],
        },
      ],
      activeWindowId: mainWindowId,
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        appVersion: "1.0.0",
      },
    };
  }

  /**
   * Get current workspace state
   */
  getWorkspace(): Workspace {
    return JSON.parse(JSON.stringify(this.workspace)); // Deep copy
  }

  /**
   * Add a dockable window to a group
   */
  addWindow(
    type: "SourceFileWindow" | "ToolWindow",
    title: string,
    group?: string,
    windowState?: Record<string, unknown>,
  ): Workspace {
    const windowId = this.generateId("window");
    const defaultGroup = type === "SourceFileWindow" ? "documents" : "toolwindows";
    const targetGroup = group || defaultGroup;

    // Ensure group exists
    let groupObj = this.workspace.groups.find((g) => g.name === targetGroup);
    if (!groupObj) {
      groupObj = {
        name: targetGroup,
        type,
        windows: [],
      };
      this.workspace.groups.push(groupObj);
    }

    // Create dockable window
    const dockableWindow: DockableWindow = {
      id: windowId,
      type,
      title,
      group: targetGroup,
      isActive: false,
      isVisible: true,
      windowState,
      hostId: "main",
    };

    groupObj.windows.push(dockableWindow);
    this.addWindowToDefaultPane(windowId);
    this.workspace.version++;
    this.workspace.metadata!.updatedAt = Date.now();
    this.emitWorkspaceUpdated();

    return this.getWorkspace();
  }

  /**
   * Remove a dockable window
   */
  removeWindow(windowId: string): Workspace {
    let removed = false;

    for (const group of this.workspace.groups) {
      const index = group.windows.findIndex((w) => w.id === windowId);
      if (index >= 0) {
        group.windows.splice(index, 1);
        removed = true;
        break;
      }
    }

    if (removed) {
      this.removeWindowFromAllLayouts(windowId);
      this.workspace.version++;
      this.workspace.metadata!.updatedAt = Date.now();
      this.emitWorkspaceUpdated();
    }

    return this.getWorkspace();
  }

  /**
   * Show a window (restore to its last known group)
   */
  showWindow(windowId: string): Workspace {
    for (const group of this.workspace.groups) {
      const window = group.windows.find((w) => w.id === windowId);
      if (window) {
        window.isVisible = true;
        this.workspace.version++;
        this.workspace.metadata!.updatedAt = Date.now();
        this.emitWorkspaceUpdated();
        break;
      }
    }

    return this.getWorkspace();
  }

  /**
   * Hide a window (keep it in group but mark as not visible)
   */
  hideWindow(windowId: string): Workspace {
    for (const group of this.workspace.groups) {
      const window = group.windows.find((w) => w.id === windowId);
      if (window) {
        window.isVisible = false;
        this.workspace.version++;
        this.workspace.metadata!.updatedAt = Date.now();
        this.emitWorkspaceUpdated();
        break;
      }
    }

    return this.getWorkspace();
  }

  /**
   * Move a window between groups or within a group
   */
  moveWindow(windowId: string, targetGroupName: string): Workspace {
    const targetGroup = this.workspace.groups.find((g) => g.name === targetGroupName);
    if (!targetGroup) {
      throw new Error(`Group not found: ${targetGroupName}`);
    }

    let window: DockableWindow | null = null;

    // Find and remove window from current group
    for (const group of this.workspace.groups) {
      const index = group.windows.findIndex((w) => w.id === windowId);
      if (index >= 0) {
        [window] = group.windows.splice(index, 1);
        break;
      }
    }

    if (!window) {
      throw new Error(`Window not found: ${windowId}`);
    }

    // Update window's group and add to target group
    window.group = targetGroupName;
    targetGroup.windows.push(window);

    this.workspace.version++;
    this.workspace.metadata!.updatedAt = Date.now();
    this.emitWorkspaceUpdated();

    return this.getWorkspace();
  }

  /**
   * Set a window as active
   */
  setActiveWindow(windowId: string): Workspace {
    for (const group of this.workspace.groups) {
      for (const window of group.windows) {
        window.isActive = window.id === windowId;
      }
    }

    for (const workspaceWindow of this.workspace.windows) {
      this.setActiveWindowInLayout(workspaceWindow.layout.root, windowId);
    }

    this.workspace.version++;
    this.workspace.metadata!.updatedAt = Date.now();
    this.emitWorkspaceUpdated();

    return this.getWorkspace();
  }

  /**
   * Get windows by group name
   */
  getWindowsByGroup(groupName: string): DockableWindow[] {
    const group = this.workspace.groups.find((g) => g.name === groupName);
    return group ? [...group.windows] : [];
  }

  /**
   * Get a specific window by ID
   */
  getWindow(windowId: string): DockableWindow | undefined {
    for (const group of this.workspace.groups) {
      const window = group.windows.find((w) => w.id === windowId);
      if (window) {
        return window;
      }
    }
    return undefined;
  }

  /**
   * Update window state (opaque per-window data)
   */
  updateWindowState(windowId: string, state: Record<string, unknown>): Workspace {
    const window = this.getWindow(windowId);
    if (!window) {
      throw new Error(`Window not found: ${windowId}`);
    }

    window.windowState = state;
    this.workspace.version++;
    this.workspace.metadata!.updatedAt = Date.now();
    this.emitWorkspaceUpdated();

    return this.getWorkspace();
  }

  /**
   * Restore workspace from saved state
   */
  restoreFromState(savedWorkspace: Workspace): Workspace {
    // Validate and merge saved state
    if (savedWorkspace && savedWorkspace.version !== undefined) {
      this.workspace = JSON.parse(JSON.stringify(savedWorkspace));
    }
    return this.getWorkspace();
  }

  /**
   * Generate unique ID for entities
   */
  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Split a pane containing a window into two panes
   * The second pane receives a new empty container
   */
  splitPane(windowId: string, direction: "horizontal" | "vertical"): Workspace {
    // Find the window/pane to split
    const window = this.getWindow(windowId);
    if (!window) {
      throw new Error(`Window not found: ${windowId}`);
    }

    // Find the BrowserWindow containing this window in its layout
    let targetBrowserWindow: WorkspaceWindow | undefined;

    for (const browserWindow of this.workspace.windows) {
      if (this.isWindowInLayout(windowId, browserWindow.layout.root)) {
        targetBrowserWindow = browserWindow;
        break;
      }
    }

    // If not found in layout, add to main window's layout
    if (!targetBrowserWindow) {
      targetBrowserWindow = this.workspace.windows.find((w) => w.type === "main");
      if (!targetBrowserWindow) {
        throw new Error("Main window not found");
      }

      // Add window to main layout if it's empty
      if (
        this.isPaneNode(targetBrowserWindow.layout.root) &&
        targetBrowserWindow.layout.root.windowIds.length === 0
      ) {
        targetBrowserWindow.layout.root.windowIds = [windowId];
        targetBrowserWindow.layout.root.activeWindowId = windowId;
      }
    }

    // Find and split the pane
    this.splitLayoutNode(targetBrowserWindow.layout.root, windowId, direction);

    this.workspace.version++;
    this.workspace.metadata!.updatedAt = Date.now();
    this.emitWorkspaceUpdated();

    return this.getWorkspace();
  }

  /**
   * Resize a pane by adjusting size proportions
   */
  resizePane(paneId: string, newSize: number): Workspace {
    // Validate size is between 0 and 1
    if (newSize <= 0 || newSize >= 1) {
      throw new Error("Pane size must be between 0 and 1");
    }

    // Find and resize the pane in all windows
    for (const window of this.workspace.windows) {
      if (this.resizeLayoutNode(window.layout.root, paneId, newSize)) {
        this.workspace.version++;
        this.workspace.metadata!.updatedAt = Date.now();
        this.emitWorkspaceUpdated();
        return this.getWorkspace();
      }
    }

    throw new Error(`Pane not found: ${paneId}`);
  }

  /**
   * Move a window to a specific pane
   */
  moveWindowToPane(
    windowId: string,
    targetPaneId: string,
    targetBrowserWindow: WorkspaceWindow,
  ): Workspace {
    const window = this.getWindow(windowId);
    if (!window) {
      throw new Error(`Window not found: ${windowId}`);
    }

    this.removeWindowFromAllLayouts(windowId);

    let moved = false;
    for (const workspaceWindow of this.workspace.windows) {
      if (this.addWindowToPane(workspaceWindow.layout.root, targetPaneId, windowId)) {
        moved = true;
        break;
      }
    }

    if (!moved) {
      throw new Error(`Pane not found: ${targetPaneId}`);
    }

    window.hostId = this.getHostIdForWorkspaceWindow(targetBrowserWindow);

    this.workspace.version++;
    this.workspace.metadata!.updatedAt = Date.now();
    this.emitWorkspaceUpdated();

    return this.getWorkspace();
  }

  reorderPaneWindows(paneId: string, windowIds: string[]): Workspace {
    for (const workspaceWindow of this.workspace.windows) {
      const pane = this.findPaneById(workspaceWindow.layout.root, paneId);
      if (!pane) {
        continue;
      }

      const currentIds = [...pane.windowIds].sort();
      const nextIds = [...windowIds].sort();
      if (
        currentIds.length !== nextIds.length ||
        currentIds.some((windowId, index) => windowId !== nextIds[index])
      ) {
        throw new Error(`Pane reorder does not match existing pane contents: ${paneId}`);
      }

      pane.windowIds = [...windowIds];
      if (!pane.activeWindowId || !pane.windowIds.includes(pane.activeWindowId)) {
        pane.activeWindowId = pane.windowIds[0];
      }

      this.workspace.version++;
      this.workspace.metadata!.updatedAt = Date.now();
      this.emitWorkspaceUpdated();
      return this.getWorkspace();
    }

    throw new Error(`Pane not found: ${paneId}`);
  }

  createHost(hostId: string, label: string): Workspace {
    this.workspace.hosts = this.workspace.hosts || [];
    if (this.workspace.hosts.some((host) => host.id === hostId)) {
      throw new Error(`Host already exists: ${hostId}`);
    }

    this.workspace.hosts.push({
      id: hostId,
      label: label || `Window ${hostId.substring(10, 14).toUpperCase()}`,
      isVisible: true,
      createdAt: Date.now(),
    });
    this.workspace.windows.push(this.createWorkspaceWindow("satellite", hostId));

    this.workspace.version++;
    this.workspace.metadata!.updatedAt = Date.now();
    this.emitWorkspaceUpdated();

    return this.getWorkspace();
  }

  deleteHost(hostId: string): Workspace {
    if (hostId === "main") {
      return this.getWorkspace();
    }

    const satelliteWindow = this.getWorkspaceWindowForHost(hostId);
    const mainWindow = this.getWorkspaceWindowForHost("main");

    if (satelliteWindow && mainWindow && satelliteWindow !== mainWindow) {
      const panesToMove = this.collectPanes(satelliteWindow.layout.root).filter(
        (pane) => pane.windowIds.length > 0,
      );

      for (const pane of panesToMove) {
        this.updatePaneWindowHostIds(pane, "main");
        this.appendPaneToWorkspaceWindow(mainWindow, pane);
      }

      this.workspace.windows = this.workspace.windows.filter(
        (workspaceWindow) => workspaceWindow !== satelliteWindow,
      );
    }

    this.workspace.hosts = (this.workspace.hosts || []).filter((host) => host.id !== hostId);
    for (const group of this.workspace.groups) {
      for (const window of group.windows) {
        if (window.hostId === hostId) {
          window.hostId = "main";
        }
      }
    }

    if (this.workspace.hostLayouts?.[hostId]) {
      delete this.workspace.hostLayouts[hostId];
    }

    this.workspace.version++;
    this.workspace.metadata!.updatedAt = Date.now();
    this.emitWorkspaceUpdated();

    return this.getWorkspace();
  }

  movePaneToHost(paneId: string, targetHostId: string): Workspace {
    const resolvedPaneId = this.resolveMovablePaneId(paneId);
    if (!resolvedPaneId) {
      throw new Error(`Pane not found: ${paneId}`);
    }

    const sourceWorkspaceWindow = this.findWorkspaceWindowContainingPane(resolvedPaneId);
    const targetWorkspaceWindow = this.getWorkspaceWindowForHost(targetHostId);

    if (!sourceWorkspaceWindow) {
      throw new Error(`Source host for pane not found: ${resolvedPaneId}`);
    }

    if (!targetWorkspaceWindow) {
      throw new Error(`Target host not found: ${targetHostId}`);
    }

    if (sourceWorkspaceWindow === targetWorkspaceWindow) {
      return this.getWorkspace();
    }

    const detachedPane = this.detachPaneFromWorkspaceWindow(sourceWorkspaceWindow, resolvedPaneId);
    if (!detachedPane) {
      throw new Error(`Pane not found: ${resolvedPaneId}`);
    }

    this.updatePaneWindowHostIds(detachedPane, targetHostId);
    this.appendPaneToWorkspaceWindow(targetWorkspaceWindow, detachedPane);

    const targetHost = this.workspace.hosts?.find((host) => host.id === targetHostId);
    if (targetHost) {
      targetHost.isVisible = true;
    }

    this.workspace.version++;
    this.workspace.metadata!.updatedAt = Date.now();
    this.emitWorkspaceUpdated();

    return this.getWorkspace();
  }

  saveHostLayout(hostId: string, layout: Record<string, unknown>): Workspace {
    this.workspace.hostLayouts = this.workspace.hostLayouts || {};
    this.workspace.hostLayouts[hostId] = layout;

    if (hostId !== "main" && !this.getWorkspaceWindowForHost(hostId)) {
      this.workspace.windows.push(this.createWorkspaceWindow("satellite", hostId));
    }

    this.workspace.version++;
    this.workspace.metadata!.updatedAt = Date.now();
    this.emitWorkspaceUpdated();

    return this.getWorkspace();
  }

  markHostVisible(hostId: string, isVisible: boolean): Workspace {
    const host = this.workspace.hosts?.find((entry) => entry.id === hostId);
    if (!host) {
      throw new Error(`Host not found: ${hostId}`);
    }

    host.isVisible = isVisible;
    this.workspace.version++;
    this.workspace.metadata!.updatedAt = Date.now();
    this.emitWorkspaceUpdated();

    return this.getWorkspace();
  }

  /**
   * Float a window to a new BrowserWindow
   */
  floatWindow(windowId: string): Workspace {
    const window = this.getWindow(windowId);
    if (!window) {
      throw new Error(`Window not found: ${windowId}`);
    }

    const existingHost = this.workspace.hosts?.find((host) => host.id === windowId);
    if (!existingHost) {
      this.workspace.hosts = this.workspace.hosts || [];
      this.workspace.hosts.push({
        id: windowId,
        label: window.title,
        isVisible: true,
        createdAt: Date.now(),
      });
    }

    window.hostId = windowId;

    // Create new floating BrowserWindow
    const newPane: Pane = {
      id: this.generateId("pane"),
      windowIds: [windowId],
      activeWindowId: windowId,
      size: 1.0,
    };

    const floatingWindow: WorkspaceWindow = {
      id: windowId,
      type: "floating",
      bounds: { x: 100, y: 100, width: 1200, height: 800 }, // Default floating position
      layout: {
        id: this.generateId("layout"),
        root: newPane,
        activeWindowId: windowId,
      },
      isMinimized: false,
      isMaximized: false,
      hostId: windowId,
    };

    const existingFloatingIndex = this.workspace.windows.findIndex(
      (workspaceWindow) => workspaceWindow.id === windowId && workspaceWindow.type === "floating",
    );
    if (existingFloatingIndex >= 0) {
      this.workspace.windows[existingFloatingIndex] = floatingWindow;
    } else {
      this.workspace.windows.push(floatingWindow);
    }

    // Remove window from its current layout
    this.removeWindowFromAllLayouts(windowId, windowId);

    this.workspace.version++;
    this.workspace.metadata!.updatedAt = Date.now();
    this.emitWorkspaceUpdated();

    return this.getWorkspace();
  }

  /**
   * Dock a floating window back to the main window
   */
  // eslint-disable-next-line complexity
  dockWindow(floatingWindowId: string, targetPaneId: string): Workspace {
    const floatingWindow = this.workspace.windows.find((w) => w.id === floatingWindowId);
    if (!floatingWindow) {
      throw new Error(`Floating window not found: ${floatingWindowId}`);
    }

    const targetHost = this.workspace.hosts?.find((host) => host.id === targetPaneId);
    if (targetHost) {
      const dockableWindow = this.getWindow(floatingWindowId);
      if (dockableWindow) {
        dockableWindow.hostId = targetHost.id;
      }

      this.workspace.windows = this.workspace.windows.filter(
        (workspaceWindow) => workspaceWindow !== floatingWindow,
      );
      this.workspace.hosts = (this.workspace.hosts || []).filter(
        (host) => host.id !== floatingWindowId,
      );
      if (this.workspace.hostLayouts?.[floatingWindowId]) {
        delete this.workspace.hostLayouts[floatingWindowId];
      }

      this.workspace.version++;
      this.workspace.metadata!.updatedAt = Date.now();
      this.emitWorkspaceUpdated();

      return this.getWorkspace();
    }

    // Get the window from floating window's layout
    const pane = floatingWindow.layout.root as Pane;
    if (pane.windowIds.length === 0) {
      throw new Error("Floating window has no content");
    }

    // Find main window
    const targetWorkspaceWindow = this.workspace.windows.find((workspaceWindow) =>
      this.findPaneById(workspaceWindow.layout.root, targetPaneId),
    );
    if (!targetWorkspaceWindow) {
      throw new Error(`Target pane not found: ${targetPaneId}`);
    }

    // Move windows to target pane
    for (const windowId of pane.windowIds) {
      this.addWindowToPane(targetWorkspaceWindow.layout.root, targetPaneId, windowId);
      const dockableWindow = this.getWindow(windowId);
      if (dockableWindow) {
        dockableWindow.hostId = this.getHostIdForWorkspaceWindow(targetWorkspaceWindow);
      }
    }

    // Remove floating window
    const index = this.workspace.windows.indexOf(floatingWindow);
    if (index >= 0) {
      this.workspace.windows.splice(index, 1);
    }
    this.workspace.hosts = (this.workspace.hosts || []).filter(
      (host) => host.id !== floatingWindowId,
    );
    if (this.workspace.hostLayouts?.[floatingWindowId]) {
      delete this.workspace.hostLayouts[floatingWindowId];
    }

    this.workspace.version++;
    this.workspace.metadata!.updatedAt = Date.now();
    this.emitWorkspaceUpdated();

    return this.getWorkspace();
  }

  /**
   * Helper: Check if a window exists in a layout subtree
   */
  private isWindowInLayout(windowId: string, node: LayoutNode): boolean {
    if (this.isPaneNode(node)) {
      return node.windowIds.includes(windowId);
    }

    if ("children" in node) {
      return node.children.some((child) => this.isWindowInLayout(windowId, child));
    }

    return false;
  }

  /**
   * Helper: Split a layout node at the specified window
   */
  private splitLayoutNode(
    node: LayoutNode,
    windowId: string,
    direction: "horizontal" | "vertical",
  ): boolean {
    if (this.isPaneNode(node)) {
      if (node.windowIds.includes(windowId)) {
        // Found the pane to split - replace with split container
        const leftPane: Pane = {
          id: this.generateId("pane"),
          windowIds: [...node.windowIds],
          activeWindowId: node.activeWindowId,
          size: 0.5,
        };

        const rightPane: Pane = {
          id: this.generateId("pane"),
          windowIds: [],
          size: 0.5,
        };

        const splitNode = node as unknown as {
          type: "split";
          direction: "horizontal" | "vertical";
          children: LayoutNode[];
          splitters: Splitter[];
        };

        splitNode.type = "split";
        splitNode.direction = direction;
        splitNode.children = [leftPane, rightPane];
        splitNode.splitters = [
          {
            id: this.generateId("splitter"),
            direction: direction,
          },
        ];

        return true;
      }
      return false;
    }

    if ("children" in node) {
      return node.children.some((child) => this.splitLayoutNode(child, windowId, direction));
    }

    return false;
  }

  /**
   * Helper: Resize a pane in the layout tree
   */
  private resizeLayoutNode(node: LayoutNode, paneId: string, newSize: number): boolean {
    if (this.isPaneNode(node)) {
      if (node.id === paneId) {
        node.size = newSize;
        return true;
      }
      return false;
    }

    if ("children" in node) {
      for (const child of node.children) {
        if (this.resizeLayoutNode(child, paneId, newSize)) {
          return true;
        }
      }
    }

    return false;
  }

  private addWindowToDefaultPane(windowId: string): void {
    const mainWindow = this.getWorkspaceWindowForHost("main");
    if (!mainWindow) {
      return;
    }

    const pane = this.findFirstPane(mainWindow.layout.root);
    if (!pane) {
      return;
    }

    if (!pane.windowIds.includes(windowId)) {
      pane.windowIds.push(windowId);
    }
    pane.activeWindowId = windowId;
  }

  private addWindowToPane(node: LayoutNode, targetPaneId: string, windowId: string): boolean {
    const pane = this.findPaneById(node, targetPaneId);
    if (!pane) {
      return false;
    }

    if (!pane.windowIds.includes(windowId)) {
      pane.windowIds.push(windowId);
    }
    pane.activeWindowId = windowId;
    return true;
  }

  private findFirstPane(node: LayoutNode): Pane | undefined {
    if (this.isPaneNode(node)) {
      return node;
    }

    if ("children" in node) {
      for (const child of node.children) {
        const pane = this.findFirstPane(child);
        if (pane) {
          return pane;
        }
      }
    }

    return undefined;
  }

  private findPaneById(node: LayoutNode, paneId: string): Pane | undefined {
    if (this.isPaneNode(node)) {
      return node.id === paneId ? node : undefined;
    }

    if ("children" in node) {
      for (const child of node.children) {
        const pane = this.findPaneById(child, paneId);
        if (pane) {
          return pane;
        }
      }
    }

    return undefined;
  }

  private removeWindowFromAllLayouts(windowId: string, skipWorkspaceWindowId?: string): void {
    for (const workspaceWindow of this.workspace.windows) {
      if (workspaceWindow.id === skipWorkspaceWindowId) {
        continue;
      }
      this.removeWindowFromLayout(workspaceWindow.layout.root, windowId);
    }
  }

  private removeWindowFromLayout(node: LayoutNode, windowId: string): boolean {
    if (this.isPaneNode(node)) {
      const nextWindowIds = node.windowIds.filter((candidateId) => candidateId !== windowId);
      if (nextWindowIds.length === node.windowIds.length) {
        return false;
      }

      node.windowIds = nextWindowIds;
      if (node.activeWindowId === windowId) {
        node.activeWindowId = node.windowIds[0];
      }
      return true;
    }

    if ("children" in node) {
      return node.children.some((child) => this.removeWindowFromLayout(child, windowId));
    }

    return false;
  }

  private setActiveWindowInLayout(node: LayoutNode, windowId: string): boolean {
    if (this.isPaneNode(node)) {
      if (!node.windowIds.includes(windowId)) {
        return false;
      }

      node.activeWindowId = windowId;
      return true;
    }

    if ("children" in node) {
      return node.children.some((child) => this.setActiveWindowInLayout(child, windowId));
    }

    return false;
  }

  private isPaneNode(node: LayoutNode): node is Pane {
    return "size" in node && !("children" in node);
  }

  private normalizeWorkspaceLayouts(): void {
    this.ensureHostWorkspaceWindows();

    for (const workspaceWindow of this.workspace.windows) {
      this.normalizeLayoutNode(workspaceWindow.layout.root);
    }
  }

  private ensureHostWorkspaceWindows(): void {
    this.workspace.hosts = this.workspace.hosts || [];

    let mainHost = this.workspace.hosts.find((host) => host.id === "main");
    if (!mainHost) {
      mainHost = {
        id: "main",
        label: "Main Window",
        isVisible: true,
        createdAt: Date.now(),
      };
      this.workspace.hosts.unshift(mainHost);
    }

    const mainWorkspaceWindow = this.workspace.windows.find(
      (workspaceWindow) => workspaceWindow.type === "main",
    );
    if (mainWorkspaceWindow) {
      mainWorkspaceWindow.hostId = "main";
    } else {
      this.workspace.windows.unshift(this.createWorkspaceWindow("main", "main"));
    }

    const knownHostIds = new Set(this.workspace.hosts.map((host) => host.id));
    for (const workspaceWindow of this.workspace.windows) {
      if (workspaceWindow.type !== "satellite") {
        continue;
      }

      const hostId = workspaceWindow.hostId || workspaceWindow.id;
      workspaceWindow.hostId = hostId;
      if (!knownHostIds.has(hostId)) {
        this.workspace.hosts.push({
          id: hostId,
          label: `Window ${hostId.substring(10, 14).toUpperCase()}`,
          isVisible: true,
          createdAt: Date.now(),
        });
        knownHostIds.add(hostId);
      }
    }

    for (const host of this.workspace.hosts) {
      if (host.id === "main") {
        continue;
      }

      if (!this.getWorkspaceWindowForHost(host.id)) {
        this.workspace.windows.push(this.createWorkspaceWindow("satellite", host.id));
      }
    }
  }

  private createWorkspaceWindow(type: "main" | "satellite", hostId: string): WorkspaceWindow {
    return {
      id: type === "main" ? this.generateId("window") : hostId,
      type,
      bounds: this.getDefaultBoundsForHost(type),
      layout: {
        id: this.generateId("layout"),
        root: this.createEmptyPane(),
      },
      isMinimized: false,
      isMaximized: false,
      hostId,
    };
  }

  private getDefaultBoundsForHost(type: "main" | "satellite"): Rectangle {
    return type === "main"
      ? { x: 0, y: 0, width: 1200, height: 800 }
      : { x: 100, y: 100, width: 1200, height: 800 };
  }

  private createEmptyPane(): Pane {
    return {
      id: this.generateId("pane"),
      windowIds: [],
      size: 1,
    };
  }

  private getWorkspaceWindowForHost(hostId: string): WorkspaceWindow | undefined {
    if (hostId === "main") {
      return this.workspace.windows.find((workspaceWindow) => workspaceWindow.type === "main");
    }

    return this.workspace.windows.find(
      (workspaceWindow) =>
        workspaceWindow.type === "satellite" && workspaceWindow.hostId === hostId,
    );
  }

  private getHostIdForWorkspaceWindow(workspaceWindow: WorkspaceWindow): string {
    return (
      workspaceWindow.hostId || (workspaceWindow.type === "main" ? "main" : workspaceWindow.id)
    );
  }

  private resolveMovablePaneId(identifier: string): string | undefined {
    const owningPane = this.findWorkspaceWindowContainingPane(identifier);
    if (owningPane) {
      return identifier;
    }

    for (const workspaceWindow of this.workspace.windows) {
      const paneId = this.findPaneIdContainingWindow(workspaceWindow.layout.root, identifier);
      if (paneId) {
        return paneId;
      }
    }

    return undefined;
  }

  private findWorkspaceWindowContainingPane(paneId: string): WorkspaceWindow | undefined {
    return this.workspace.windows.find((workspaceWindow) =>
      this.findPaneById(workspaceWindow.layout.root, paneId),
    );
  }

  private findPaneIdContainingWindow(node: LayoutNode, windowId: string): string | undefined {
    if (this.isPaneNode(node)) {
      return node.windowIds.includes(windowId) ? node.id : undefined;
    }

    if ("children" in node) {
      for (const child of node.children) {
        const paneId = this.findPaneIdContainingWindow(child, windowId);
        if (paneId) {
          return paneId;
        }
      }
    }

    return undefined;
  }

  private detachPaneFromWorkspaceWindow(
    workspaceWindow: WorkspaceWindow,
    paneId: string,
  ): Pane | undefined {
    const result = this.detachPaneFromLayout(workspaceWindow.layout.root, paneId);
    if (!result.extracted) {
      return undefined;
    }

    workspaceWindow.layout.root = result.remaining ?? this.createEmptyPane();
    return result.extracted;
  }

  private detachPaneFromLayout(
    node: LayoutNode,
    paneId: string,
  ): { remaining: LayoutNode | null; extracted?: Pane } {
    if (this.isPaneNode(node)) {
      if (node.id !== paneId) {
        return { remaining: node };
      }

      return {
        remaining: null,
        extracted: {
          ...node,
          windowIds: [...node.windowIds],
        },
      };
    }

    if (!("children" in node)) {
      return { remaining: node };
    }

    for (let index = 0; index < node.children.length; index++) {
      const child = node.children[index];
      const result = this.detachPaneFromLayout(child, paneId);
      if (!result.extracted) {
        continue;
      }

      const nextChildren = [...node.children];
      if (result.remaining) {
        nextChildren[index] = result.remaining;
      } else {
        nextChildren.splice(index, 1);
      }

      if (nextChildren.length === 0) {
        return { remaining: null, extracted: result.extracted };
      }

      if (nextChildren.length === 1) {
        return { remaining: nextChildren[0], extracted: result.extracted };
      }

      return {
        remaining: {
          ...node,
          children: nextChildren,
          splitters: Array.from({ length: Math.max(0, nextChildren.length - 1) }, () => ({
            id: this.generateId("splitter"),
            direction: node.direction,
          })),
        },
        extracted: result.extracted,
      };
    }

    return { remaining: node };
  }

  private appendPaneToWorkspaceWindow(workspaceWindow: WorkspaceWindow, pane: Pane): void {
    const clonedPane: Pane = {
      ...pane,
      windowIds: [...pane.windowIds],
    };

    if (
      this.isPaneNode(workspaceWindow.layout.root) &&
      workspaceWindow.layout.root.windowIds.length === 0
    ) {
      workspaceWindow.layout.root = clonedPane;
      workspaceWindow.layout.activeWindowId = clonedPane.activeWindowId ?? clonedPane.windowIds[0];
      return;
    }

    workspaceWindow.layout.root = {
      type: "split",
      direction: "horizontal",
      children: [workspaceWindow.layout.root, clonedPane],
      splitters: [
        {
          id: this.generateId("splitter"),
          direction: "horizontal",
        },
      ],
    };
    workspaceWindow.layout.activeWindowId = clonedPane.activeWindowId ?? clonedPane.windowIds[0];
  }

  private collectPanes(node: LayoutNode): Pane[] {
    if (this.isPaneNode(node)) {
      return [
        {
          ...node,
          windowIds: [...node.windowIds],
        },
      ];
    }

    if (!("children" in node)) {
      return [];
    }

    return node.children.flatMap((child) => this.collectPanes(child));
  }

  private updatePaneWindowHostIds(pane: Pane, hostId: string): void {
    for (const windowId of pane.windowIds) {
      const dockableWindow = this.getWindow(windowId);
      if (dockableWindow) {
        dockableWindow.hostId = hostId;
      }
    }
  }

  private normalizeLayoutNode(node: LayoutNode): void {
    if (this.isPaneNode(node)) {
      const legacyPane = node as Pane & { windowId?: string };
      if (!Array.isArray(node.windowIds)) {
        node.windowIds = legacyPane.windowId ? [legacyPane.windowId] : [];
      }
      if (!node.activeWindowId && node.windowIds.length > 0) {
        node.activeWindowId = node.windowIds[0];
      }
      if ("windowId" in legacyPane) {
        delete legacyPane.windowId;
      }
      return;
    }

    if ("children" in node) {
      node.children.forEach((child) => this.normalizeLayoutNode(child));
    }
  }

  /**
   * Emit workspace updated event for IPC listeners
   */
  private emitWorkspaceUpdated(): void {
    this.emit("workspaceUpdated", this.getWorkspace());
  }
}
