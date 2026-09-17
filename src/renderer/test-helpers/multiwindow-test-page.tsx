/**
 * Implements multiwindow-test-page for revealGDB.
 *
 * @remarks
 * Test harness for multi-window (satellite) functionality.
 * Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */

import type { JSX } from "react";
import type {
  DockableWindow,
  LayoutNode,
  Pane,
  Workspace,
  WorkspaceWindow,
} from "../../common/workspace-types";
import { initIpcMock } from "./ipc-test-setup";

type WorkspaceStateRef = {
  current: Workspace;
};

type MultiWindowTestApi = {
  reset(): void;
  emitNotifyRender(message: { command: string; data?: unknown }): void;
  getCreatedHosts(): Array<{ id: string; label: string }>;
  getDeletedHosts(): string[];
  getMovedPanes(): Array<{ paneId: string; targetHostId: string }>;
  getSavedLayouts(): Map<string, unknown>;
  getOpenedHosts(): string[];
  invokeCreateHost(label: string): Promise<string>;
  invokeDeleteHost(hostId: string): Promise<void>;
  invokeMovePane(paneId: string, sourceHostId: string, targetHostId: string): Promise<void>;
  invokeSaveHostLayout(hostId: string, layout: unknown): Promise<void>;
  invokeOpenHost(hostId: string): Promise<void>;
  getCurrentWorkspace(): Workspace;
};

type WindowWithMultiWindowTestApi = Window & {
  __MULTIWINDOW_TEST_API__?: MultiWindowTestApi;
};

const WORKSPACE_CHANGED_CMD = "workspace-changed";

function createGeneratedId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
}

function createEmptyPane(prefix = "pane"): Pane {
  return {
    id: createGeneratedId(prefix),
    windowIds: [],
    size: 1,
  };
}

function isPaneNode(node: LayoutNode): node is Pane {
  return !("children" in node);
}

function findWorkspaceWindowByHostId(
  workspace: Workspace,
  hostId: string,
): WorkspaceWindow | undefined {
  if (hostId === "main") {
    return workspace.windows.find((workspaceWindow) => workspaceWindow.type === "main");
  }

  return workspace.windows.find(
    (workspaceWindow) => workspaceWindow.type === "satellite" && workspaceWindow.hostId === hostId,
  );
}

function findPaneById(node: LayoutNode, paneId: string): Pane | undefined {
  if (isPaneNode(node)) {
    return node.id === paneId ? node : undefined;
  }

  for (const child of node.children) {
    const pane = findPaneById(child, paneId);
    if (pane) {
      return pane;
    }
  }

  return undefined;
}

function findPaneIdContainingWindow(node: LayoutNode, windowId: string): string | undefined {
  if (isPaneNode(node)) {
    return node.windowIds.includes(windowId) ? node.id : undefined;
  }

  for (const child of node.children) {
    const paneId = findPaneIdContainingWindow(child, windowId);
    if (paneId) {
      return paneId;
    }
  }

  return undefined;
}

function detachPaneFromLayout(
  node: LayoutNode,
  paneId: string,
): { remaining: LayoutNode | null; extracted?: Pane } {
  if (isPaneNode(node)) {
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

  for (let index = 0; index < node.children.length; index++) {
    const result = detachPaneFromLayout(node.children[index], paneId);
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
        splitters: nextChildren.slice(1).map(() => ({
          id: createGeneratedId("splitter"),
          direction: node.direction,
        })),
      },
      extracted: result.extracted,
    };
  }

  return { remaining: node };
}

function appendPaneToWorkspaceWindow(workspaceWindow: WorkspaceWindow, pane: Pane): void {
  const clonedPane: Pane = {
    ...pane,
    windowIds: [...pane.windowIds],
  };

  if (
    isPaneNode(workspaceWindow.layout.root) &&
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
        id: createGeneratedId("splitter"),
        direction: "horizontal",
      },
    ],
  };
  workspaceWindow.layout.activeWindowId = clonedPane.activeWindowId ?? clonedPane.windowIds[0];
}

function collectPanes(node: LayoutNode): Pane[] {
  if (isPaneNode(node)) {
    return [
      {
        ...node,
        windowIds: [...node.windowIds],
      },
    ];
  }

  return node.children.flatMap((child) => collectPanes(child));
}

function updateDockableHostIds(workspace: Workspace, windowIds: string[], hostId: string): void {
  const dockableWindows = workspace.groups.flatMap((group) => group.windows);
  for (const windowId of windowIds) {
    const dockableWindow = dockableWindows.find((window) => window.id === windowId);
    if (dockableWindow) {
      dockableWindow.hostId = hostId;
    }
  }
}

function removeDockableWindowFromLayout(node: LayoutNode, windowId: string): void {
  if (isPaneNode(node)) {
    node.windowIds = node.windowIds.filter((candidateId) => candidateId !== windowId);
    if (node.activeWindowId === windowId) {
      node.activeWindowId = node.windowIds[0];
    }
    return;
  }

  node.children.forEach((child) => removeDockableWindowFromLayout(child, windowId));
}

function findWorkspaceWindowContainingPane(
  workspace: Workspace,
  paneId: string,
): WorkspaceWindow | undefined {
  return workspace.windows.find(
    (workspaceWindow) => !!findPaneById(workspaceWindow.layout.root, paneId),
  );
}

function findDockableWindow(workspace: Workspace, windowId: string): DockableWindow | undefined {
  return workspace.groups
    .flatMap((group) => group.windows)
    .find((window) => window.id === windowId);
}

/**
 * Create initial workspace state
 */
function createInitialWorkspace(): Workspace {
  return {
    version: 1,
    hosts: [
      {
        id: "main",
        label: "Main Window",
        isVisible: true,
        createdAt: Date.now(),
      },
    ],
    hostLayouts: {},
    windows: [
      {
        id: "host-main",
        type: "main",
        bounds: { x: 0, y: 0, width: 1200, height: 800 },
        layout: {
          id: "layout-host-main",
          root: {
            id: "pane-main",
            windowIds: ["window-1", "window-2"],
            activeWindowId: "window-1",
            size: 1,
          },
        },
        isMinimized: false,
        isMaximized: false,
        hostId: "main",
      },
    ],
    groups: [
      {
        name: "default",
        type: "mixed",
        windows: [
          {
            id: "window-1",
            type: "SourceFileWindow",
            title: "Test Window 1",
            group: "default",
            isActive: true,
            isVisible: true,
            windowState: {},
            hostId: "main",
          },
          {
            id: "window-2",
            type: "ToolWindow",
            title: "Test Window 2",
            group: "default",
            isActive: false,
            isVisible: true,
            windowState: {},
            hostId: "main",
          },
        ],
      },
    ],
    activeWindowId: "host-main",
    metadata: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      appVersion: "1.0.0",
    },
  };
}

/**
 * Create host command handler
 */
function createHostCommandHandler(
  workspaceStateRef: WorkspaceStateRef,
  createdHosts: Array<{ id: string; label: string }>,
  notifyRenderHandler: ((message: { command: string; data?: unknown }) => void) | undefined,
) {
  return (payload: { label: string }) => {
    const currentWorkspace = workspaceStateRef.current;
    const hostId = `satellite-${Math.random().toString(36).substring(2, 9)}`;
    const host = {
      id: hostId,
      label: payload.label || `Window ${hostId.substring(10, 14).toUpperCase()}`,
      isVisible: true,
      createdAt: Date.now(),
    };

    currentWorkspace.hosts = currentWorkspace.hosts || [];
    currentWorkspace.hosts.push(host);
    currentWorkspace.windows.push({
      id: hostId,
      type: "satellite",
      bounds: { x: 100, y: 100, width: 1200, height: 800 },
      layout: {
        id: `layout-${hostId}`,
        root: createEmptyPane(`pane-${hostId}`),
      },
      isMinimized: false,
      isMaximized: false,
      hostId,
    });

    createdHosts.push({ id: hostId, label: host.label });
    notifyRenderHandler?.({ command: WORKSPACE_CHANGED_CMD, data: currentWorkspace });

    return Promise.resolve(hostId);
  };
}

/**
 * Create delete host command handler
 */
function deleteHostCommandHandler(
  workspaceStateRef: WorkspaceStateRef,
  deletedHosts: string[],
  notifyRenderHandler: ((message: { command: string; data?: unknown }) => void) | undefined,
) {
  return (payload: { hostId: string }) => {
    const currentWorkspace = workspaceStateRef.current;
    const hostId = payload.hostId;
    if (hostId === "main") return Promise.resolve(currentWorkspace);

    const mainWorkspaceWindow = findWorkspaceWindowByHostId(currentWorkspace, "main");
    const satelliteWorkspaceWindow = findWorkspaceWindowByHostId(currentWorkspace, hostId);

    if (
      mainWorkspaceWindow &&
      satelliteWorkspaceWindow &&
      mainWorkspaceWindow !== satelliteWorkspaceWindow
    ) {
      const panesToMove = collectPanes(satelliteWorkspaceWindow.layout.root).filter(
        (pane) => pane.windowIds.length > 0,
      );
      for (const pane of panesToMove) {
        updateDockableHostIds(currentWorkspace, pane.windowIds, "main");
        appendPaneToWorkspaceWindow(mainWorkspaceWindow, pane);
      }
    }

    currentWorkspace.hosts = (currentWorkspace.hosts || []).filter((host) => host.id !== hostId);
    currentWorkspace.windows = currentWorkspace.windows.filter(
      (workspaceWindow) =>
        !(workspaceWindow.type === "satellite" && workspaceWindow.hostId === hostId),
    );
    if (currentWorkspace.hostLayouts) {
      delete currentWorkspace.hostLayouts[hostId];
    }

    deletedHosts.push(hostId);
    notifyRenderHandler?.({ command: WORKSPACE_CHANGED_CMD, data: currentWorkspace });

    return Promise.resolve(currentWorkspace);
  };
}

/**
 * Create move pane command handler
 */
function movePaneCommandHandler(
  workspaceStateRef: WorkspaceStateRef,
  movedPanes: Array<{ paneId: string; targetHostId: string }>,
  notifyRenderHandler: ((message: { command: string; data?: unknown }) => void) | undefined,
) {
  return (payload: { paneId: string; sourceHostId: string; targetHostId: string }) => {
    const currentWorkspace = workspaceStateRef.current;
    const sourceWorkspaceWindow = findWorkspaceWindowByHostId(
      currentWorkspace,
      payload.sourceHostId,
    );
    const targetWorkspaceWindow = findWorkspaceWindowByHostId(
      currentWorkspace,
      payload.targetHostId,
    );
    if (
      !sourceWorkspaceWindow ||
      !targetWorkspaceWindow ||
      sourceWorkspaceWindow === targetWorkspaceWindow
    ) {
      return Promise.resolve(currentWorkspace);
    }

    let sourcePaneId = payload.paneId;
    if (!findPaneById(sourceWorkspaceWindow.layout.root, sourcePaneId)) {
      sourcePaneId =
        findPaneIdContainingWindow(sourceWorkspaceWindow.layout.root, payload.paneId) ??
        payload.paneId;
    }

    const detached = detachPaneFromLayout(sourceWorkspaceWindow.layout.root, sourcePaneId);
    if (detached.extracted) {
      sourceWorkspaceWindow.layout.root = detached.remaining ?? createEmptyPane("pane-main");
      updateDockableHostIds(currentWorkspace, detached.extracted.windowIds, payload.targetHostId);
      appendPaneToWorkspaceWindow(targetWorkspaceWindow, detached.extracted);
    }

    movedPanes.push({
      paneId: sourcePaneId,
      targetHostId: payload.targetHostId,
    });

    notifyRenderHandler?.({ command: WORKSPACE_CHANGED_CMD, data: currentWorkspace });
    return Promise.resolve(currentWorkspace);
  };
}

/**
 * Create save host layout command handler
 */
function saveHostLayoutCommandHandler(
  workspaceStateRef: WorkspaceStateRef,
  savedLayouts: Map<string, unknown>,
  notifyRenderHandler: ((message: { command: string; data?: unknown }) => void) | undefined,
) {
  return (payload: { hostId: string; layout: unknown }) => {
    const currentWorkspace = workspaceStateRef.current;
    currentWorkspace.hostLayouts = currentWorkspace.hostLayouts || {};
    currentWorkspace.hostLayouts[payload.hostId] = payload.layout;
    savedLayouts.set(payload.hostId, payload.layout);
    notifyRenderHandler?.({ command: WORKSPACE_CHANGED_CMD, data: currentWorkspace });
    return Promise.resolve(currentWorkspace);
  };
}

/**
 * Create open host command handler
 */
function openHostCommandHandler(openedHosts: string[]) {
  return (payload: { hostId: string }) => {
    openedHosts.push(payload.hostId);
    return Promise.resolve();
  };
}

/**
 * Create float window command handler
 */
function floatWindowCommandHandler(
  workspaceStateRef: WorkspaceStateRef,
  notifyRenderHandler: ((message: { command: string; data?: unknown }) => void) | undefined,
) {
  return (windowId: string) => {
    const currentWorkspace = workspaceStateRef.current;

    currentWorkspace.windows.forEach((workspaceWindow) => {
      if (workspaceWindow.type !== "floating") {
        removeDockableWindowFromLayout(workspaceWindow.layout.root, windowId);
      }
    });

    const existingFloatingWindow = currentWorkspace.windows.find(
      (workspaceWindow) => workspaceWindow.id === windowId && workspaceWindow.type === "floating",
    );

    if (!existingFloatingWindow) {
      currentWorkspace.windows.push({
        id: windowId,
        type: "floating",
        bounds: {
          x: 200,
          y: 200,
          width: 600,
          height: 400,
        },
        layout: {
          id: `layout-float-${windowId}`,
          root: {
            id: `pane-float-${windowId}`,
            windowIds: [windowId],
            activeWindowId: windowId,
            size: 1,
          },
        },
        isMinimized: false,
        isMaximized: false,
      });
    }

    notifyRenderHandler?.({ command: WORKSPACE_CHANGED_CMD, data: currentWorkspace });
    return Promise.resolve(windowId);
  };
}

/**
 * Create dock window command handler
 */
function dockWindowCommandHandler(
  workspaceStateRef: WorkspaceStateRef,
  notifyRenderHandler: ((message: { command: string; data?: unknown }) => void) | undefined,
) {
  return (floatingWindowId: string, targetPaneId: string) => {
    const currentWorkspace = workspaceStateRef.current;

    const floatingWindow = currentWorkspace.windows.find(
      (workspaceWindow) =>
        workspaceWindow.id === floatingWindowId && workspaceWindow.type === "floating",
    );
    const targetWorkspaceWindow = findWorkspaceWindowContainingPane(currentWorkspace, targetPaneId);
    const targetPane = targetWorkspaceWindow
      ? findPaneById(targetWorkspaceWindow.layout.root, targetPaneId)
      : undefined;

    if (
      floatingWindow &&
      targetWorkspaceWindow &&
      targetPane &&
      isPaneNode(floatingWindow.layout.root)
    ) {
      for (const dockableWindowId of floatingWindow.layout.root.windowIds) {
        if (!targetPane.windowIds.includes(dockableWindowId)) {
          targetPane.windowIds.push(dockableWindowId);
        }
        targetPane.activeWindowId = dockableWindowId;
        const dockableWindow = findDockableWindow(currentWorkspace, dockableWindowId);
        if (dockableWindow) {
          dockableWindow.hostId = targetWorkspaceWindow.hostId || "main";
        }
      }

      currentWorkspace.windows = currentWorkspace.windows.filter(
        (workspaceWindow) => workspaceWindow !== floatingWindow,
      );
    }

    notifyRenderHandler?.({ command: WORKSPACE_CHANGED_CMD, data: currentWorkspace });
    return Promise.resolve(currentWorkspace);
  };
}

/**
 * Setup workspace commands for IPC
 */
function setupWorkspaceCommands(
  ipc: ReturnType<typeof initIpcMock>,
  workspaceStateRef: WorkspaceStateRef,
  createdHosts: Array<{ id: string; label: string }>,
  deletedHosts: string[],
  movedPanes: Array<{ paneId: string; targetHostId: string }>,
  savedLayouts: Map<string, unknown>,
  openedHosts: string[],
  notifyRenderHandler: ((message: { command: string; data?: unknown }) => void) | undefined,
): void {
  ipc.commands = ipc.commands ?? {};
  ipc.commands.workspace = {
    createHost: createHostCommandHandler(workspaceStateRef, createdHosts, notifyRenderHandler),
    deleteHost: deleteHostCommandHandler(workspaceStateRef, deletedHosts, notifyRenderHandler),
    movePane: movePaneCommandHandler(workspaceStateRef, movedPanes, notifyRenderHandler),
    saveHostLayout: saveHostLayoutCommandHandler(
      workspaceStateRef,
      savedLayouts,
      notifyRenderHandler,
    ),
    openHost: openHostCommandHandler(openedHosts),
    floatWindow: floatWindowCommandHandler(workspaceStateRef, notifyRenderHandler),
    dockWindow: dockWindowCommandHandler(workspaceStateRef, notifyRenderHandler),
  };
}

/**
 * Create multi-window test API object
 */
function createMultiWindowTestApi(
  ipc: ReturnType<typeof initIpcMock>,
  workspaceStateRef: WorkspaceStateRef,
  createdHosts: Array<{ id: string; label: string }>,
  deletedHosts: string[],
  movedPanes: Array<{ paneId: string; targetHostId: string }>,
  savedLayouts: Map<string, unknown>,
  openedHosts: string[],
  notifyRenderHandler: ((message: { command: string; data?: unknown }) => void) | undefined,
): MultiWindowTestApi {
  return {
    reset: () => {
      workspaceStateRef.current = createInitialWorkspace();
      createdHosts.length = 0;
      deletedHosts.length = 0;
      movedPanes.length = 0;
      savedLayouts.clear();
      openedHosts.length = 0;
    },

    emitNotifyRender: (message) => {
      notifyRenderHandler?.(message);
    },

    getCreatedHosts: () => createdHosts.slice(),
    getDeletedHosts: () => deletedHosts.slice(),
    getMovedPanes: () => movedPanes.slice(),
    getSavedLayouts: () => new Map(savedLayouts),
    getOpenedHosts: () => openedHosts.slice(),

    invokeCreateHost: (label: string) => ipc.commands.workspace.createHost({ label }),

    invokeDeleteHost: (hostId: string) => ipc.commands.workspace.deleteHost({ hostId }),

    invokeMovePane: (paneId: string, sourceHostId: string, targetHostId: string) =>
      ipc.commands.workspace.movePane({ paneId, sourceHostId, targetHostId }),

    invokeSaveHostLayout: (hostId: string, layout: unknown) =>
      ipc.commands.workspace.saveHostLayout({ hostId, layout }),

    invokeOpenHost: (hostId: string) => ipc.commands.workspace.openHost({ hostId }),

    getCurrentWorkspace: () => workspaceStateRef.current,
  };
}

/**
 * Sets up the test API for multi-window functionality testing
 */
export function setupMultiWindowTestApi(): void {
  const ipc = initIpcMock();
  const workspaceStateRef: WorkspaceStateRef = { current: createInitialWorkspace() };

  const createdHosts: Array<{ id: string; label: string }> = [];
  const deletedHosts: string[] = [];
  const movedPanes: Array<{ paneId: string; targetHostId: string }> = [];
  const savedLayouts = new Map<string, unknown>();
  const openedHosts: string[] = [];

  let notifyRenderHandler: ((message: { command: string; data?: unknown }) => void) | undefined;

  // Set up notification handler
  ipc.notifications.render = (callback) => {
    notifyRenderHandler = callback;
    return () => {
      notifyRenderHandler = undefined;
    };
  };

  // Set up workspace queries
  ipc.queries = ipc.queries ?? {};
  ipc.queries.workspace = {
    getWorkspace: () => Promise.resolve(workspaceStateRef.current),
  };

  // Set up workspace commands
  setupWorkspaceCommands(
    ipc,
    workspaceStateRef,
    createdHosts,
    deletedHosts,
    movedPanes,
    savedLayouts,
    openedHosts,
    notifyRenderHandler,
  );

  // Set up test API
  (window as WindowWithMultiWindowTestApi).__MULTIWINDOW_TEST_API__ = createMultiWindowTestApi(
    ipc,
    workspaceStateRef,
    createdHosts,
    deletedHosts,
    movedPanes,
    savedLayouts,
    openedHosts,
    notifyRenderHandler,
  );

  // Also set up the floating window test API
  type FloatingWindowTestApi = {
    reset(): void;
    getCurrentWorkspace(): Workspace;
    invokeFloatWindow(windowId: string): Promise<string>;
    invokeDockWindow(floatingWindowId: string, targetPaneId: string): Promise<void>;
  };

  type WindowWithFloatingWindowTestApi = Window & {
    __FLOATING_WINDOW_TEST_API__?: FloatingWindowTestApi;
  };

  (window as WindowWithFloatingWindowTestApi).__FLOATING_WINDOW_TEST_API__ = {
    reset: () => {
      workspaceStateRef.current = createInitialWorkspace();
    },

    getCurrentWorkspace: () => workspaceStateRef.current,

    invokeFloatWindow: (windowId: string) => ipc.commands.workspace.floatWindow(windowId),

    invokeDockWindow: (floatingWindowId: string, targetPaneId: string) =>
      ipc.commands.workspace.dockWindow(floatingWindowId, targetPaneId),
  };
}

/**
 * Simple test page component
 */
export function MultiWindowTestPage(): JSX.Element {
  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>Multi-Window Test Harness</h1>
      <p>This page provides API access for Playwright tests of multi-window functionality.</p>
      <div
        id="test-status"
        style={{
          marginTop: "20px",
          padding: "10px",
          backgroundColor: "#e8f5e9",
          borderRadius: "4px",
        }}
      >
        Test API ready: {typeof window.__MULTIWINDOW_TEST_API__ !== "undefined" ? "✓" : "✗"}
      </div>
    </div>
  );
}
