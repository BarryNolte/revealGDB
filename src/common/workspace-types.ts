/**
 * Workspace Types
 *
 * Defines the data model for multi-window, multi-panel workspace management.
 * Based on the multi-window workspace specification.
 */

/**
 * Rectangle bounds for window positioning
 */
export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A dockable window (panel/pane) in the workspace
 */
export interface DockableWindow {
  id: string;
  type: "SourceFileWindow" | "ToolWindow";
  title: string;
  icon?: string;
  group: string; // documents, toolwindows, custom-panels, etc.
  isActive: boolean;
  isVisible: boolean;
  windowState?: Record<string, unknown>; // Opaque per-window state
  /**
   * Host ID where this pane currently belongs (e.g., "main", "satellite-xyz")
   * Used for multi-window support to track pane ownership across hosts
   */
  hostId?: string;
}

/**
 * A pane (resizable container holding a dockable window)
 */
export interface Pane {
  id: string;
  windowIds: string[]; // References DockableWindow.id in tab order
  activeWindowId?: string; // Selected tab within the pane
  size: number; // Proportion (0.0-1.0) or pixel size
}

/**
 * A splitter (resize handle between panes)
 */
export interface Splitter {
  id: string;
  direction: "horizontal" | "vertical";
}

/**
 * Layout node (either a Pane or a split container)
 */
export type LayoutNode =
  | Pane
  | {
      type: "split";
      direction: "horizontal" | "vertical";
      children: LayoutNode[];
      splitters: Splitter[];
    };

/**
 * Layout for a single BrowserWindow
 */
export interface WindowLayout {
  id: string;
  root: LayoutNode;
  activeWindowId?: string; // ID of currently focused dockable window
}

/**
 * Configuration for a group of dockable windows
 */
export interface WindowGroup {
  name: string;
  type: "SourceFileWindow" | "ToolWindow" | "mixed";
  windows: DockableWindow[];
}

/**
 * Metadata for a host (Electron BrowserWindow) in the workspace
 */
export interface WorkspaceHost {
  id: string; // e.g., "main", "satellite-abc-123"
  label: string; // e.g., "Main Window", "Satellite 1" - for display in UI
  isVisible: boolean; // Whether this host window is currently shown
  createdAt?: number; // Timestamp when host was created
}

/**
 * Per-host dock-spawn-ts layout state (opaque JSON from dockManager.saveState())
 */
export type HostLayout = Record<string, unknown>;

/**
 * A BrowserWindow in the workspace
 */
export interface WorkspaceWindow {
  id: string;
  type: "main" | "satellite" | "floating";
  bounds: Rectangle;
  layout: WindowLayout;
  isMinimized: boolean;
  isMaximized: boolean;
  hostId?: string; // Optional host ID for host-backed windows; defaults to "main" if undefined
}

/**
 * Top-level workspace state
 *
 * @remarks
 * Supports both single-window and multi-window scenarios:
 * - Single window: only "main" host, single layout
 * - Multi-window: "main" + satellite hosts, per-host layouts in hostLayouts
 *
 * Each DockableWindow has an optional hostId indicating which host it belongs to.
 * When hostId is undefined, the window defaults to "main" host.
 */
export interface Workspace {
  version: number;
  windows: WorkspaceWindow[];
  groups: WindowGroup[];
  activeWindowId?: string; // ID of currently active BrowserWindow
  /**
   * All hosts (satellite windows) in this workspace
   * Always includes at least { id: "main", label: "Main Window" }
   */
  hosts?: WorkspaceHost[];
  /**
   * Per-host dock-spawn-ts layout snapshots
   * Key: hostId (e.g., "main", "satellite-xyz")
   * Value: opaque JSON from dockManager.saveState()
   */
  hostLayouts?: Record<string, HostLayout>;
  metadata?: {
    createdAt: number;
    updatedAt: number;
    appVersion: string;
  };
}

/**
 * Workspace mutation result
 */
export interface WorkspaceMutationResult {
  success: boolean;
  workspace: Workspace;
  error?: string;
}
