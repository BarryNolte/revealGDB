/* eslint-disable sonarjs/no-duplicate-string */
/**
 * WorkspacePanel Component
 *
 * Displays and manages the debug-only multi-window workspace surface.
 * Allows users to add/remove windows, show/hide them, organize by group,
 * and exercise pane drag/drop behaviors during Phase 3 development.
 */

import { JSX, KeyboardEvent, MouseEvent, useEffect, useMemo, useState } from "react";
import type {
  DockableWindow,
  LayoutNode,
  Pane,
  WindowGroup,
  Workspace,
  WorkspaceWindow,
} from "../../common/workspace-types";

interface WorkspacePanelProps {
  isVisible?: boolean;
}

type DragState = {
  windowId: string;
  paneId: string;
};

type ContextMenuState = {
  x: number;
  y: number;
  windowId: string;
  paneId?: string;
};

type WorkspaceHandlers = ReturnType<typeof createWorkspaceHandlers>;

/**
 * Create workspace event handlers
 */
function createWorkspaceHandlers() {
  return {
    async addSourceFile(): Promise<void> {
      const title = "untitled.cpp";
      if (title) {
        await window.ipcToMain.commands.workspace.addWindow("SourceFileWindow", title);
      }
    },
    async addToolWindow(selectedGroup: string): Promise<void> {
      const title = "ToolWindow";
      if (title) {
        await window.ipcToMain.commands.workspace.addWindow("ToolWindow", title, selectedGroup);
      }
    },
    async removeWindow(windowId: string): Promise<void> {
      await window.ipcToMain.commands.workspace.removeWindow(windowId);
    },
    async toggleVisibility(windowId: string, isVisible: boolean): Promise<void> {
      if (isVisible) {
        await window.ipcToMain.commands.workspace.hideWindow(windowId);
      } else {
        await window.ipcToMain.commands.workspace.showWindow(windowId);
      }
    },
    async moveWindow(windowId: string, targetGroup: string): Promise<void> {
      await window.ipcToMain.commands.workspace.moveWindow(windowId, targetGroup);
    },
    async setActiveWindow(windowId: string): Promise<void> {
      await window.ipcToMain.commands.workspace.setActiveWindow(windowId);
    },
    async splitPane(windowId: string, direction: "horizontal" | "vertical"): Promise<void> {
      await window.ipcToMain.commands.workspace.splitPane(windowId, direction);
    },
    moveWindowToPane(windowId: string, targetPaneId: string): Promise<Workspace> {
      return window.ipcToMain.commands.workspace.moveWindowToPane(windowId, targetPaneId);
    },
    reorderPaneWindows(paneId: string, windowIds: string[]): Promise<Workspace> {
      return window.ipcToMain.commands.workspace.reorderPaneWindows(paneId, windowIds);
    },
    async createWindow(): Promise<void> {
      await window.ipcToMain.commands.workspace.createHost({ label: "New Window" });
    },
    openConnections(): void {
      window.ipcToMain.commands.app.notifyMain({ command: "connections-dialog" });
    },
  };
}

function collectWindowsById(groups: WindowGroup[]): Map<string, DockableWindow> {
  return new Map(
    groups.flatMap((group) => group.windows.map((window) => [window.id, window] as const)),
  );
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

function findWorkspacePane(workspace: Workspace, paneId: string): Pane | undefined {
  for (const workspaceWindow of workspace.windows) {
    const pane = findPaneById(workspaceWindow.layout.root, paneId);
    if (pane) {
      return pane;
    }
  }

  return undefined;
}

function findPrimaryWorkspaceWindow(workspace: Workspace): WorkspaceWindow | undefined {
  return workspace.windows.find((workspaceWindow) => workspaceWindow.type === "main");
}

function findWindowTitleById(windowsById: Map<string, DockableWindow>, windowId: string): string {
  return windowsById.get(windowId)?.title ?? windowId;
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
}

async function handleTabDrop(
  workspace: Workspace,
  handlers: WorkspaceHandlers,
  dragState: DragState,
  targetPaneId: string,
  targetWindowId?: string,
): Promise<void> {
  const sourcePane = findWorkspacePane(workspace, dragState.paneId);
  const targetPane = findWorkspacePane(workspace, targetPaneId);
  if (!sourcePane || !targetPane) {
    return;
  }

  if (dragState.paneId === targetPaneId) {
    const fromIndex = sourcePane.windowIds.indexOf(dragState.windowId);
    const toIndex = targetWindowId
      ? sourcePane.windowIds.indexOf(targetWindowId)
      : sourcePane.windowIds.length - 1;
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
      return;
    }
    await handlers.reorderPaneWindows(
      targetPaneId,
      moveItem(sourcePane.windowIds, fromIndex, toIndex),
    );
    return;
  }

  const updatedWorkspace = await handlers.moveWindowToPane(dragState.windowId, targetPaneId);
  const updatedPane = findWorkspacePane(updatedWorkspace, targetPaneId);
  if (!updatedPane) {
    return;
  }

  if (!targetWindowId) {
    return;
  }

  const nextWindowIds = updatedPane.windowIds.filter((windowId) => windowId !== dragState.windowId);
  const insertIndex = nextWindowIds.indexOf(targetWindowId);
  nextWindowIds.splice(
    insertIndex >= 0 ? insertIndex : nextWindowIds.length,
    0,
    dragState.windowId,
  );
  await handlers.reorderPaneWindows(targetPaneId, nextWindowIds);
}

/**
 * Render workspace group tabs
 */
function renderGroupTabs(
  groups: WindowGroup[],
  selectedGroup: string,
  onSelectGroup: (group: string) => void,
): JSX.Element {
  return (
    <div style={styles.groupTabs}>
      {groups.map((group) => (
        <button
          key={group.name}
          onClick={() => onSelectGroup(group.name)}
          style={{
            ...styles.groupTab,
            ...(selectedGroup === group.name ? styles.groupTabActive : {}),
          }}
        >
          {group.name} ({group.windows.length})
        </button>
      ))}
    </div>
  );
}

/**
 * Render workspace window list
 */
function renderWindowList(
  workspace: Workspace,
  selectedGroup: string,
  handlers: WorkspaceHandlers,
  setContextMenuState: (value: ContextMenuState | null) => void,
): JSX.Element {
  return (
    <div style={styles.windowList}>
      {workspace.groups
        .filter((g) => g.name === selectedGroup)
        .flatMap((g) =>
          g.windows.map((window) => (
            <WindowItem
              key={window.id}
              window={window}
              onRemove={() => handlers.removeWindow(window.id)}
              onToggleVisibility={() => handlers.toggleVisibility(window.id, window.isVisible)}
              onMove={(targetGroup) => handlers.moveWindow(window.id, targetGroup)}
              onContextMenu={(event) => {
                event.preventDefault();
                setContextMenuState({ x: event.clientX, y: event.clientY, windowId: window.id });
              }}
              allGroups={workspace.groups}
            />
          )),
        )}
    </div>
  );
}

// eslint-disable-next-line complexity
function handlePaneTabKeyDown(
  event: KeyboardEvent<HTMLButtonElement>,
  pane: Pane,
  currentWindowId: string,
  handlers: WorkspaceHandlers,
  _windowsById: Map<string, DockableWindow>,
): void {
  const currentIndex = pane.windowIds.indexOf(currentWindowId);
  if (currentIndex < 0) {
    return;
  }

  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    event.preventDefault();
    const nextWindowId = pane.windowIds[(currentIndex + 1) % pane.windowIds.length];
    handlers.setActiveWindow(nextWindowId);
    document.querySelector<HTMLElement>(`[data-testid="pane-tab-${nextWindowId}"]`)?.focus();
    return;
  }

  if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    event.preventDefault();
    const previousIndex = (currentIndex - 1 + pane.windowIds.length) % pane.windowIds.length;
    const previousWindowId = pane.windowIds[previousIndex];
    handlers.setActiveWindow(previousWindowId);
    document.querySelector<HTMLElement>(`[data-testid="pane-tab-${previousWindowId}"]`)?.focus();
    return;
  }

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    handlers.setActiveWindow(currentWindowId);
    return;
  }

  if (event.key.toLowerCase() === "c" && event.ctrlKey && event.shiftKey) {
    event.preventDefault();
    handlers.openConnections();
    return;
  }

  if (event.key.toLowerCase() === "n" && event.ctrlKey && event.shiftKey) {
    event.preventDefault();
    void handlers.createWindow();
  }
}

function renderSplitNode(
  node: Exclude<LayoutNode, Pane>,
  workspace: Workspace,
  windowsById: Map<string, DockableWindow>,
  handlers: WorkspaceHandlers,
  dragState: DragState | null,
  setDragState: (value: DragState | null) => void,
  highlightedPaneId: string | null,
  setHighlightedPaneId: (value: string | null) => void,
  setContextMenuState: (value: ContextMenuState | null) => void,
): JSX.Element {
  return (
    <div
      style={{
        ...styles.splitContainer,
        flexDirection: node.direction === "horizontal" ? "row" : "column",
      }}
    >
      {node.children.map((child) =>
        renderLayoutNode(
          child,
          workspace,
          windowsById,
          handlers,
          dragState,
          setDragState,
          highlightedPaneId,
          setHighlightedPaneId,
          setContextMenuState,
        ),
      )}
    </div>
  );
}

// eslint-disable-next-line max-lines-per-function
function renderPaneNode(
  pane: Pane,
  workspace: Workspace,
  windowsById: Map<string, DockableWindow>,
  handlers: WorkspaceHandlers,
  dragState: DragState | null,
  setDragState: (value: DragState | null) => void,
  highlightedPaneId: string | null,
  setHighlightedPaneId: (value: string | null) => void,
  setContextMenuState: (value: ContextMenuState | null) => void,
): JSX.Element {
  const activeWindow = pane.activeWindowId ? windowsById.get(pane.activeWindowId) : undefined;

  return (
    <div
      key={pane.id}
      data-testid={`pane-${pane.id}`}
      style={{
        ...styles.paneCard,
        ...(highlightedPaneId === pane.id ? styles.paneCardHighlighted : {}),
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setHighlightedPaneId(pane.id);
      }}
      onDragLeave={() => {
        if (highlightedPaneId === pane.id) {
          setHighlightedPaneId(null);
        }
      }}
      onDrop={async (event) => {
        event.preventDefault();
        if (dragState) {
          await handleTabDrop(workspace, handlers, dragState, pane.id);
        }
        setDragState(null);
        setHighlightedPaneId(null);
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        const activeWindowId = pane.activeWindowId ?? pane.windowIds[0];
        if (activeWindowId) {
          setContextMenuState({
            x: event.clientX,
            y: event.clientY,
            windowId: activeWindowId,
            paneId: pane.id,
          });
        }
      }}
    >
      <div style={styles.paneHeader}>
        <div>
          <div style={styles.paneTitle}>Pane {pane.id}</div>
          <div style={styles.paneMeta}>Tabs: {pane.windowIds.length}</div>
        </div>
        {activeWindow && (
          <div style={styles.paneActions}>
            <button
              type="button"
              style={styles.smallButton}
              onClick={() => handlers.splitPane(activeWindow.id, "horizontal")}
            >
              Split H
            </button>
            <button
              type="button"
              style={styles.smallButton}
              onClick={() => handlers.splitPane(activeWindow.id, "vertical")}
            >
              Split V
            </button>
          </div>
        )}
      </div>
      <div style={styles.tabStrip}>
        {pane.windowIds.map((windowId) => {
          const workspaceWindow = windowsById.get(windowId);
          if (!workspaceWindow) {
            return null;
          }

          return (
            <button
              key={windowId}
              type="button"
              draggable={true}
              data-testid={`pane-tab-${windowId}`}
              style={{
                ...styles.tabChip,
                ...(pane.activeWindowId === windowId ? styles.tabChipActive : {}),
              }}
              onClick={() => handlers.setActiveWindow(windowId)}
              onKeyDown={(event) =>
                handlePaneTabKeyDown(event, pane, windowId, handlers, windowsById)
              }
              onDragStart={() => {
                setDragState({ windowId, paneId: pane.id });
                setHighlightedPaneId(pane.id);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setHighlightedPaneId(pane.id);
              }}
              onDrop={async (event) => {
                event.preventDefault();
                if (dragState) {
                  await handleTabDrop(workspace, handlers, dragState, pane.id, windowId);
                }
                setDragState(null);
                setHighlightedPaneId(null);
              }}
              onDragEnd={() => {
                setDragState(null);
                setHighlightedPaneId(null);
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                setContextMenuState({
                  x: event.clientX,
                  y: event.clientY,
                  windowId,
                  paneId: pane.id,
                });
              }}
            >
              {workspaceWindow.title}
            </button>
          );
        })}
        {pane.windowIds.length === 0 && <div style={styles.emptyPane}>Drop a window here</div>}
      </div>
    </div>
  );
}

function renderLayoutNode(
  node: LayoutNode,
  workspace: Workspace,
  windowsById: Map<string, DockableWindow>,
  handlers: WorkspaceHandlers,
  dragState: DragState | null,
  setDragState: (value: DragState | null) => void,
  highlightedPaneId: string | null,
  setHighlightedPaneId: (value: string | null) => void,
  setContextMenuState: (value: ContextMenuState | null) => void,
): JSX.Element {
  if (isPaneNode(node)) {
    return renderPaneNode(
      node,
      workspace,
      windowsById,
      handlers,
      dragState,
      setDragState,
      highlightedPaneId,
      setHighlightedPaneId,
      setContextMenuState,
    );
  }

  return renderSplitNode(
    node,
    workspace,
    windowsById,
    handlers,
    dragState,
    setDragState,
    highlightedPaneId,
    setHighlightedPaneId,
    setContextMenuState,
  );
}

// eslint-disable-next-line max-lines-per-function
function renderWorkspaceContextMenu(
  contextMenuState: ContextMenuState | null,
  handlers: WorkspaceHandlers,
  windowsById: Map<string, DockableWindow>,
  onClose: () => void,
): JSX.Element | null {
  if (!contextMenuState) {
    return null;
  }

  return (
    <div
      data-testid="workspace-context-menu"
      style={{
        ...styles.contextMenu,
        left: contextMenuState.x,
        top: contextMenuState.y,
      }}
    >
      <div style={styles.contextMenuTitle}>
        {findWindowTitleById(windowsById, contextMenuState.windowId)}
      </div>
      <button
        type="button"
        style={styles.contextMenuButton}
        onClick={() => {
          handlers.setActiveWindow(contextMenuState.windowId);
          onClose();
        }}
      >
        Activate
      </button>
      <button
        type="button"
        style={styles.contextMenuButton}
        onClick={() => {
          void handlers.toggleVisibility(contextMenuState.windowId, true);
          onClose();
        }}
      >
        Hide Window
      </button>
      <button
        type="button"
        style={styles.contextMenuButton}
        onClick={() => {
          void handlers.splitPane(contextMenuState.windowId, "horizontal");
          onClose();
        }}
      >
        Split Horizontal
      </button>
      <button
        type="button"
        style={styles.contextMenuButton}
        onClick={() => {
          void handlers.splitPane(contextMenuState.windowId, "vertical");
          onClose();
        }}
      >
        Split Vertical
      </button>
      <button
        type="button"
        style={styles.contextMenuButton}
        onClick={() => {
          handlers.openConnections();
          onClose();
        }}
      >
        Open Connections
      </button>
      <button
        type="button"
        style={styles.contextMenuButton}
        onClick={() => {
          void handlers.createWindow();
          onClose();
        }}
      >
        New Window
      </button>
    </div>
  );
}

// eslint-disable-next-line max-lines-per-function
export function WorkspacePanel({ isVisible = true }: WorkspacePanelProps): JSX.Element | null {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>("documents");
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [highlightedPaneId, setHighlightedPaneId] = useState<string | null>(null);
  const [contextMenuState, setContextMenuState] = useState<ContextMenuState | null>(null);
  const windowsById = useMemo(
    () => (workspace ? collectWindowsById(workspace.groups) : new Map<string, DockableWindow>()),
    [workspace],
  );

  // Load initial workspace state
  useEffect(() => {
    const loadWorkspace = async () => {
      try {
        const ws = await window.ipcToMain.queries.workspace.getWorkspace();
        setWorkspace(ws);
      } catch (error) {
        console.error("Failed to load workspace:", error);
      }
    };

    loadWorkspace();

    // Listen for workspace updates
    const unsubscribe = window.ipcToMain.notifications.workspaceUpdated((updatedWorkspace) => {
      setWorkspace(updatedWorkspace);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!contextMenuState) {
      return;
    }

    const handleGlobalClick = () => setContextMenuState(null);
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenuState(null);
      }
    };

    window.addEventListener("click", handleGlobalClick);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("click", handleGlobalClick);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [contextMenuState]);

  if (!isVisible || !workspace) {
    return null;
  }

  const handlers = createWorkspaceHandlers();
  const primaryWindow = findPrimaryWorkspaceWindow(workspace);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3>Workspace Manager</h3>
      </div>

      <div style={styles.controls}>
        <button onClick={() => handlers.addSourceFile()} style={styles.button}>
          + Source File
        </button>
        <button onClick={() => handlers.addToolWindow(selectedGroup)} style={styles.button}>
          + Tool Window
        </button>
      </div>

      {renderGroupTabs(workspace.groups, selectedGroup, setSelectedGroup)}
      {renderWindowList(workspace, selectedGroup, handlers, setContextMenuState)}

      {primaryWindow && (
        <div style={styles.layoutSection}>
          <div style={styles.layoutHeader}>Debug Layout</div>
          {renderLayoutNode(
            primaryWindow.layout.root,
            workspace,
            windowsById,
            handlers,
            dragState,
            setDragState,
            highlightedPaneId,
            setHighlightedPaneId,
            setContextMenuState,
          )}
        </div>
      )}

      {renderWorkspaceContextMenu(contextMenuState, handlers, windowsById, () => {
        setContextMenuState(null);
      })}

      {workspace.groups.find((g) => g.name === selectedGroup)?.windows.length === 0 && (
        <div style={styles.emptyMessage}>No windows in this group</div>
      )}
    </div>
  );
}

interface WindowItemProps {
  window: DockableWindow;
  onRemove: () => void;
  onToggleVisibility: () => void;
  onMove: (targetGroup: string) => void;
  onContextMenu: (event: MouseEvent<HTMLDivElement>) => void;
  allGroups: WindowGroup[];
}

function WindowItem({
  window,
  onRemove,
  onToggleVisibility,
  onMove,
  onContextMenu,
  allGroups,
}: WindowItemProps): JSX.Element {
  return (
    <div style={styles.windowItem} onContextMenu={onContextMenu}>
      <div style={styles.windowHeader}>
        <span
          style={{
            ...styles.windowTitle,
            fontWeight: window.isActive ? "bold" : "normal",
            opacity: window.isVisible ? 1 : 0.5,
          }}
        >
          {window.title}
        </span>
        <span style={styles.windowType}>{window.type}</span>
      </div>

      <div style={styles.windowActions}>
        <button onClick={onToggleVisibility} style={styles.smallButton} title="Toggle visibility">
          {window.isVisible ? "👁️ Hide" : "👁️‍🗨️ Show"}
        </button>

        <select onChange={(e) => onMove(e.target.value)} style={styles.moveSelect} defaultValue="">
          <option value="">Move to...</option>
          {allGroups.map((g) => (
            <option
              key={g.name}
              value={g.name}
              disabled={allGroups
                .filter((gg) => gg.windows.includes(window))
                .some((gg) => gg.name === g.name)}
            >
              {g.name}
            </option>
          ))}
        </select>

        <button onClick={onRemove} style={styles.removeButton} title="Remove window">
          ✕
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "12px",
    backgroundColor: "#f5f5f5",
    borderRadius: "4px",
    fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
    fontSize: "12px",
  } as const,
  header: {
    marginBottom: "12px",
    paddingBottom: "8px",
    borderBottom: "1px solid #ddd",
  } as const,
  controls: {
    display: "flex",
    gap: "8px",
    marginBottom: "12px",
  } as const,
  button: {
    padding: "6px 12px",
    backgroundColor: "#007acc",
    color: "white",
    border: "none",
    borderRadius: "3px",
    cursor: "pointer",
    fontSize: "12px",
  } as const,
  groupTabs: {
    display: "flex",
    gap: "4px",
    marginBottom: "12px",
    borderBottom: "1px solid #ddd",
    overflowX: "auto",
  } as const,
  groupTab: {
    padding: "6px 12px",
    backgroundColor: "#e0e0e0",
    border: "none",
    borderRadius: "3px 3px 0 0",
    cursor: "pointer",
    fontSize: "11px",
    whiteSpace: "nowrap",
  } as const,
  groupTabActive: {
    backgroundColor: "#007acc",
    color: "white",
  } as const,
  windowList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
    maxHeight: "300px",
    overflowY: "auto",
  } as const,
  windowItem: {
    padding: "8px",
    backgroundColor: "white",
    border: "1px solid #ddd",
    borderRadius: "3px",
  } as const,
  windowHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "6px",
  } as const,
  windowTitle: {
    flex: 1,
    fontWeight: "normal",
  } as const,
  windowType: {
    fontSize: "10px",
    backgroundColor: "#e0e0e0",
    padding: "2px 4px",
    borderRadius: "2px",
    marginLeft: "4px",
  } as const,
  windowActions: {
    display: "flex",
    gap: "4px",
    fontSize: "11px",
  } as const,
  layoutSection: {
    marginTop: "16px",
    borderTop: "1px solid #ddd",
    paddingTop: "12px",
  } as const,
  layoutHeader: {
    fontWeight: 600,
    marginBottom: "8px",
  } as const,
  splitContainer: {
    display: "flex",
    gap: "8px",
    alignItems: "stretch",
  } as const,
  paneCard: {
    flex: 1,
    minWidth: "140px",
    border: "1px dashed #9aa5b1",
    borderRadius: "4px",
    backgroundColor: "#fafafa",
    padding: "8px",
  } as const,
  paneCardHighlighted: {
    backgroundColor: "#e8f4ff",
    borderColor: "#007acc",
  } as const,
  paneHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "8px",
    marginBottom: "8px",
  } as const,
  paneTitle: {
    fontWeight: 600,
  } as const,
  paneMeta: {
    color: "#666",
    fontSize: "10px",
  } as const,
  paneActions: {
    display: "flex",
    gap: "4px",
  } as const,
  tabStrip: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "6px",
    minHeight: "32px",
  } as const,
  tabChip: {
    padding: "4px 8px",
    borderRadius: "999px",
    border: "1px solid #b7c3cf",
    backgroundColor: "white",
    cursor: "grab",
    fontSize: "11px",
  } as const,
  tabChipActive: {
    borderColor: "#007acc",
    backgroundColor: "#dff1ff",
  } as const,
  emptyPane: {
    color: "#666",
    fontStyle: "italic",
    fontSize: "11px",
  } as const,
  contextMenu: {
    position: "fixed" as const,
    zIndex: 10001,
    minWidth: "180px",
    backgroundColor: "white",
    border: "1px solid #c8d1dc",
    borderRadius: "6px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.18)",
    padding: "8px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
  } as const,
  contextMenuTitle: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#334155",
    padding: "2px 4px 6px",
    borderBottom: "1px solid #e2e8f0",
    marginBottom: "2px",
  } as const,
  contextMenuButton: {
    textAlign: "left" as const,
    border: "none",
    backgroundColor: "transparent",
    padding: "6px 8px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px",
  } as const,
  smallButton: {
    padding: "4px 8px",
    backgroundColor: "#e0e0e0",
    border: "1px solid #ccc",
    borderRadius: "2px",
    cursor: "pointer",
    fontSize: "11px",
  } as const,
  moveSelect: {
    padding: "4px",
    fontSize: "11px",
    borderRadius: "2px",
    border: "1px solid #ccc",
  } as const,
  removeButton: {
    padding: "4px 8px",
    backgroundColor: "#ff6b6b",
    color: "white",
    border: "none",
    borderRadius: "2px",
    cursor: "pointer",
    fontSize: "11px",
  } as const,
  emptyMessage: {
    padding: "12px",
    textAlign: "center" as const,
    color: "#999",
    fontStyle: "italic",
  } as const,
};
