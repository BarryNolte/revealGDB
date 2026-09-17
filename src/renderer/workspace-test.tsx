/**
 * Workspace Test Harness
 *
 * This harness provides a dedicated testing environment for the multi-window
 * workspace functionality in revealGDB.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import type { LayoutNode, Pane, Workspace } from "../common/workspace-types";
import { WorkspacePanel } from "./Components/WorkspacePanel";
import { initIpcMock } from "./test-helpers/ipc-test-setup";

interface TestLog {
  timestamp: string;
  level: "info" | "success" | "error" | "warning";
  message: string;
}

function isPaneNode(node: LayoutNode): node is Pane {
  return !("children" in node);
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

function removeWindowFromLayout(node: LayoutNode, windowId: string): void {
  if (isPaneNode(node)) {
    node.windowIds = node.windowIds.filter((candidateId) => candidateId !== windowId);
    if (node.activeWindowId === windowId) {
      node.activeWindowId = node.windowIds[0];
    }
    /* eslint-disable max-lines-per-function, require-await */
    return;
  }

  node.children.forEach((child) => removeWindowFromLayout(child, windowId));
}

function createInitialWorkspace(): Workspace {
  return {
    version: 1,
    windows: [
      {
        id: "host-main",
        type: "main",
        bounds: { x: 0, y: 0, width: 1200, height: 800 },
        layout: {
          id: "layout-main",
          root: {
            id: "pane-main",
            windowIds: ["window-1", "window-2"],
            size: 1,
          },
        },
        isMinimized: false,
        isMaximized: false,
      },
    ],
    groups: [
      {
        name: "documents",
        type: "SourceFileWindow",
        windows: [
          {
            id: "window-1",
            type: "SourceFileWindow",
            title: "main.cpp",
            group: "documents",
            isActive: true,
            isVisible: true,
          },
        ],
      },
      {
        name: "toolwindows",
        type: "ToolWindow",
        windows: [
          {
            id: "window-2",
            type: "ToolWindow",
            title: "Locals",
            group: "toolwindows",
            isActive: false,
            isVisible: true,
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

function cloneWorkspace(workspace: Workspace): Workspace {
  return JSON.parse(JSON.stringify(workspace)) as Workspace;
}

function setupWorkspaceTestApi(): void {
  const ipc = initIpcMock();
  let currentWorkspace = createInitialWorkspace();
  const workspaceSubscribers = new Set<(workspace: Workspace) => void>();

  const emitWorkspaceUpdated = (): Workspace => {
    currentWorkspace.version += 1;
    currentWorkspace.metadata = {
      ...(currentWorkspace.metadata ?? {
        createdAt: Date.now(),
        appVersion: "1.0.0",
      }),
      updatedAt: Date.now(),
    };

    const snapshot = cloneWorkspace(currentWorkspace);
    workspaceSubscribers.forEach((callback) => callback(snapshot));
    return snapshot;
  };

  ipc.notifications.workspaceUpdated = (callback) => {
    workspaceSubscribers.add(callback);
    return () => {
      workspaceSubscribers.delete(callback);
    };
  };

  ipc.queries.workspace = {
    getWorkspace: () => Promise.resolve(cloneWorkspace(currentWorkspace)),
  };

  ipc.commands.workspace = {
    addWindow: async (type: "SourceFileWindow" | "ToolWindow", title: string, group?: string) => {
      const windowId = `window-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const groupName = group || (type === "SourceFileWindow" ? "documents" : "toolwindows");
      let targetGroup = currentWorkspace.groups.find((entry) => entry.name === groupName);
      if (!targetGroup) {
        targetGroup = { name: groupName, type, windows: [] };
        currentWorkspace.groups.push(targetGroup);
      }
      targetGroup.windows.push({
        id: windowId,
        type,
        title,
        group: groupName,
        isActive: false,
        isVisible: true,
      });
      const rootPane = currentWorkspace.windows[0].layout.root as Pane;
      rootPane.windowIds.push(windowId);
      rootPane.activeWindowId = windowId;
      return emitWorkspaceUpdated();
    },
    removeWindow: async (windowId: string) => {
      currentWorkspace.groups.forEach((group) => {
        group.windows = group.windows.filter((window) => window.id !== windowId);
      });
      currentWorkspace.windows.forEach((workspaceWindow) => {
        removeWindowFromLayout(workspaceWindow.layout.root, windowId);
      });
      return emitWorkspaceUpdated();
    },
    showWindow: async (windowId: string) => {
      currentWorkspace.groups.forEach((group) => {
        group.windows.forEach((window) => {
          if (window.id === windowId) window.isVisible = true;
        });
      });
      return emitWorkspaceUpdated();
    },
    hideWindow: async (windowId: string) => {
      currentWorkspace.groups.forEach((group) => {
        group.windows.forEach((window) => {
          if (window.id === windowId) window.isVisible = false;
        });
      });
      return emitWorkspaceUpdated();
    },
    moveWindow: async (windowId: string, targetGroupName: string) => {
      let movedWindow;
      currentWorkspace.groups.forEach((group) => {
        const index = group.windows.findIndex((window) => window.id === windowId);
        if (index >= 0) {
          [movedWindow] = group.windows.splice(index, 1);
        }
      });
      if (movedWindow) {
        let targetGroup = currentWorkspace.groups.find((group) => group.name === targetGroupName);
        if (!targetGroup) {
          targetGroup = { name: targetGroupName, type: movedWindow.type, windows: [] };
          currentWorkspace.groups.push(targetGroup);
        }
        movedWindow.group = targetGroupName;
        targetGroup.windows.push(movedWindow);
      }
      return emitWorkspaceUpdated();
    },
    setActiveWindow: async (windowId: string) => {
      currentWorkspace.groups.forEach((group) => {
        group.windows.forEach((window) => {
          window.isActive = window.id === windowId;
        });
      });
      currentWorkspace.windows.forEach((workspaceWindow) => {
        const root = workspaceWindow.layout.root;
        const visitNode = (node: LayoutNode): void => {
          if (isPaneNode(node)) {
            if (node.windowIds.includes(windowId)) {
              node.activeWindowId = windowId;
            }
            return;
          }
          node.children.forEach((child) => visitNode(child));
        };
        visitNode(root);
      });
      return emitWorkspaceUpdated();
    },
    splitPane: async (windowId: string, direction: "horizontal" | "vertical") => {
      const rootPane = currentWorkspace.windows[0].layout.root as Pane;
      currentWorkspace.windows[0].layout.root = {
        type: "split",
        direction,
        splitters: [{ id: `split-${Date.now()}`, direction }],
        children: [
          {
            id: `pane-left-${Date.now()}`,
            windowIds: rootPane.windowIds.filter((candidateId) => candidateId !== windowId),
            activeWindowId: rootPane.activeWindowId,
            size: 0.5,
          },
          {
            id: `pane-right-${Date.now()}`,
            windowIds: [windowId],
            activeWindowId: windowId,
            size: 0.5,
          },
        ],
      };
      return emitWorkspaceUpdated();
    },
    resizePane: async (_paneId: string, _newSize: number) => emitWorkspaceUpdated(),
    moveWindowToPane: async (windowId: string, targetPaneId: string) => {
      currentWorkspace.windows.forEach((workspaceWindow) => {
        removeWindowFromLayout(workspaceWindow.layout.root, windowId);
        const pane = findPaneById(workspaceWindow.layout.root, targetPaneId);
        if (pane && !pane.windowIds.includes(windowId)) {
          pane.windowIds.push(windowId);
          pane.activeWindowId = windowId;
        }
      });
      return emitWorkspaceUpdated();
    },
    reorderPaneWindows: async (paneId: string, windowIds: string[]) => {
      const pane = findPaneById(currentWorkspace.windows[0].layout.root, paneId);
      if (pane) {
        pane.windowIds = [...windowIds];
        pane.activeWindowId = pane.windowIds[0];
      }
      return emitWorkspaceUpdated();
    },
    floatWindow: async (_windowId: string) => cloneWorkspace(currentWorkspace),
    dockWindow: async (_floatingWindowId: string, _targetPaneId: string) =>
      cloneWorkspace(currentWorkspace),
    createHost: async () => "satellite-test",
    createFloatingWindow: async (payload: { windowId: string }) => payload.windowId,
    closeFloatingWindow: async () => undefined,
    updateFloatingWindowBounds: async () => undefined,
  };
}

/**
 * Create addLog handler
 */
function createAddLog(
  setLogs: React.Dispatch<React.SetStateAction<TestLog[]>>,
): (level: TestLog["level"], message: string) => void {
  return (level: TestLog["level"], message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp, level, message }]);
  };
}

/**
 * Setup workspace API detection and listeners
 */
function useWorkspaceSetup(addLog: (level: TestLog["level"], message: string) => void): boolean {
  const [workspaceReady, setWorkspaceReady] = React.useState(false);

  React.useEffect(() => {
    const logApiDetection = () => {
      if (window.ipcToMain?.queries?.workspace?.getWorkspace) {
        addLog("success", "Workspace API detected");
        setWorkspaceReady(true);
      } else {
        addLog("error", "Workspace API not available");
      }
    };

    const timer = setTimeout(logApiDetection, 0);

    if (window.ipcToMain?.notifications?.workspaceUpdated) {
      const unsubscribe = window.ipcToMain.notifications.workspaceUpdated((workspace) => {
        addLog(
          "info",
          `Workspace updated: ${workspace.windows.length} windows, version ${workspace.version}`,
        );
      });
      return () => {
        clearTimeout(timer);
        if (unsubscribe) unsubscribe();
      };
    }

    return () => {
      clearTimeout(timer);
    };
  }, [addLog]);

  return workspaceReady;
}

/**
 * Create add window test handler
 */
function createAddWindowHandler(
  addLog: (level: TestLog["level"], message: string) => void,
): () => Promise<void> {
  return async () => {
    try {
      addLog("info", "Testing add window...");
      const result = await window.ipcToMain.commands.workspace.addWindow(
        "SourceFileWindow",
        "test-file.cpp",
      );
      addLog("success", `Window added: ${result.windows.length} total windows`);
    } catch (error) {
      addLog(
        "error",
        `Failed to add window: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };
}

/**
 * Create remove window test handler
 */
function createRemoveWindowHandler(
  addLog: (level: TestLog["level"], message: string) => void,
): () => Promise<void> {
  return async () => {
    try {
      addLog("info", "Testing remove window...");
      const workspace = await window.ipcToMain.queries.workspace.getWorkspace();
      const firstWindow = workspace.groups[0]?.windows[0];
      if (firstWindow) {
        const result = await window.ipcToMain.commands.workspace.removeWindow(firstWindow.id);
        addLog("success", `Window removed: ${result.windows.length} total windows`);
      } else {
        addLog("warning", "No windows to remove");
      }
    } catch (error) {
      addLog(
        "error",
        `Failed to remove window: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };
}

/**
 * Create toggle visibility test handler
 */
function createToggleVisibilityHandler(
  addLog: (level: TestLog["level"], message: string) => void,
): () => Promise<void> {
  return async () => {
    try {
      addLog("info", "Testing toggle visibility...");
      const workspace = await window.ipcToMain.queries.workspace.getWorkspace();
      const firstWindow = workspace.groups[0]?.windows[0];
      if (firstWindow) {
        if (firstWindow.isVisible) {
          await window.ipcToMain.commands.workspace.hideWindow(firstWindow.id);
          addLog("success", `Window hidden: ${firstWindow.title}`);
        } else {
          await window.ipcToMain.commands.workspace.showWindow(firstWindow.id);
          addLog("success", `Window shown: ${firstWindow.title}`);
        }
      } else {
        addLog("warning", "No windows to toggle");
      }
    } catch (error) {
      addLog(
        "error",
        `Failed to toggle visibility: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };
}

/**
 * Create move window test handler
 */
function createMoveWindowHandler(
  addLog: (level: TestLog["level"], message: string) => void,
): () => Promise<void> {
  return async () => {
    try {
      addLog("info", "Testing move window...");
      const workspace = await window.ipcToMain.queries.workspace.getWorkspace();
      const firstWindow = workspace.groups[0]?.windows[0];
      const targetGroup = workspace.groups[1];
      if (firstWindow && targetGroup) {
        await window.ipcToMain.commands.workspace.moveWindow(firstWindow.id, targetGroup.name);
        addLog("success", `Window moved to ${targetGroup.name}`);
      } else {
        addLog("warning", "Cannot move window (missing window or target group)");
      }
    } catch (error) {
      addLog(
        "error",
        `Failed to move window: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };
}

/**
 * Create test handlers
 */
function createTestHandlers(addLog: (level: TestLog["level"], message: string) => void): {
  handleTestAddWindow: () => Promise<void>;
  handleTestRemoveWindow: () => Promise<void>;
  handleTestToggleVisibility: () => Promise<void>;
  handleTestMoveWindow: () => Promise<void>;
  handleClearLogs: () => void;
} {
  return {
    handleTestAddWindow: createAddWindowHandler(addLog),
    handleTestRemoveWindow: createRemoveWindowHandler(addLog),
    handleTestToggleVisibility: createToggleVisibilityHandler(addLog),
    handleTestMoveWindow: createMoveWindowHandler(addLog),
    handleClearLogs: () => {
      // Implemented in component
    },
  };
}

/**
 * Render test buttons
 */
function renderTestButtons(
  handlers: ReturnType<typeof createTestHandlers>,
  workspaceReady: boolean,
): React.JSX.Element {
  return (
    <div className="test-section">
      <h2>Quick Tests</h2>
      <div className="test-actions">
        <button
          className="test-button"
          onClick={handlers.handleTestAddWindow}
          disabled={!workspaceReady}
        >
          Add Window
        </button>
        <button
          className="test-button"
          onClick={handlers.handleTestRemoveWindow}
          disabled={!workspaceReady}
        >
          Remove Window
        </button>
        <button
          className="test-button"
          onClick={handlers.handleTestToggleVisibility}
          disabled={!workspaceReady}
        >
          Toggle Visibility
        </button>
        <button
          className="test-button"
          onClick={handlers.handleTestMoveWindow}
          disabled={!workspaceReady}
        >
          Move Window
        </button>
      </div>
    </div>
  );
}

/**
 * Render workspace status
 */
function renderWorkspaceStatus(workspaceReady: boolean): React.JSX.Element {
  return (
    <div className="test-section">
      <h2>Status</h2>
      <div
        style={{
          padding: "12px",
          backgroundColor: workspaceReady ? "#e8f5e9" : "#ffebee",
          borderRadius: "4px",
        }}
      >
        {workspaceReady ? (
          <span style={{ color: "#2e7d32" }}>✓ Workspace API Ready</span>
        ) : (
          <span style={{ color: "#c62828" }}>✗ Workspace API Not Available</span>
        )}
      </div>
    </div>
  );
}

/**
 * Render test logs
 */
function renderTestLogs(logs: TestLog[], onClearLogs: () => void): React.JSX.Element {
  return (
    <div className="test-section">
      <h2>Test Log</h2>
      <div className="test-output">
        {logs.length === 0 ? (
          <div className="test-log-entry" style={{ color: "#999" }}>
            (No logs yet. Run some tests to see output here.)
          </div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className={`test-log-entry ${log.level}`}>
              <strong>[{log.timestamp}]</strong> {log.message}
            </div>
          ))
        )}
      </div>
      <button className="test-button secondary" onClick={onClearLogs} style={{ marginTop: "12px" }}>
        Clear Logs
      </button>
    </div>
  );
}

/**
 * Render workspace manager panel
 */
function renderWorkspaceManager(workspaceReady: boolean): React.JSX.Element {
  return (
    <div className="test-right">
      <h2 style={{ margin: "0 0 12px 0" }}>Workspace Manager</h2>
      {workspaceReady ? (
        <WorkspacePanel isVisible={true} />
      ) : (
        <div
          style={{
            padding: "12px",
            backgroundColor: "#ffebee",
            borderRadius: "4px",
            color: "#c62828",
          }}
        >
          Workspace API not available
        </div>
      )}
    </div>
  );
}

function WorkspaceTestHarness(): React.JSX.Element {
  const [logs, setLogs] = React.useState<TestLog[]>([]);
  const addLog = createAddLog(setLogs);
  const workspaceReady = useWorkspaceSetup(addLog);
  const handlers = createTestHandlers(addLog);

  const handleClearLogs = () => {
    setLogs([]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div className="test-header">
        <h1>🧪 Workspace Test Harness</h1>
        <p>Test the multi-window workspace functionality in revealGDB</p>
      </div>

      <div className="test-container">
        <div className="test-left">
          {renderTestButtons(handlers, workspaceReady)}
          {renderWorkspaceStatus(workspaceReady)}
          {renderTestLogs(logs, handleClearLogs)}
        </div>

        {renderWorkspaceManager(workspaceReady)}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("app")!);
setupWorkspaceTestApi();
root.render(<WorkspaceTestHarness />);
