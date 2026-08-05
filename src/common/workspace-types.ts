/**
 * Workspace type definitions for multi-host docking architecture.
 *
 * @remarks
 * These types define the structure of workspace state, dockable windows,
 * and layout persistence for the multi-host dock-spawn-ts integration.
 */

/**
 * Enum for dockable window types.
 */
export enum DockableWindowType {
  SourceFile = "SourceFile",
  ToolWindow = "ToolWindow",
}

/**
 * Enum for window display modes.
 */
export enum WindowDisplayMode {
  Docked = "docked",
  Floating = "floating",
}

/**
 * Enum for tool window groups (used for fallback layout positioning).
 */
export enum WindowGroup {
  Documents = "documents",
  ToolWindows = "toolwindows",
}

/**
 * Interface for a single dockable window in the workspace.
 *
 * @remarks
 * Represents either a source file or a tool window that can be docked,
 * floated, or hidden. Window state includes positioning and host assignment.
 */
export interface DockableWindow {
  /** Unique identifier for the window */
  id: string;

  /** Display title shown in panel tab */
  title: string;

  /** HTML element body/content template identifier */
  body: string;

  /** Window type (SourceFile or ToolWindow) */
  type: DockableWindowType;

  /** Grouping for layout placement (documents vs toolwindows) */
  group: WindowGroup;

  /** Whether window is currently visible (docked or floating) */
  isVisible: boolean;

  /** Current display mode: docked in workspace or floating dialog */
  displayMode: WindowDisplayMode;

  /** Arbitrary state object for window positioning/sizing */
  windowState?: Record<string, unknown>;
}

/**
 * Interface for workspace host (main or satellite dock window).
 *
 * @remarks
 * Each host represents a separate BrowserWindow instance that can
 * display a subset of the workspace windows.
 */
export interface WorkspaceHost {
  /** Unique host identifier (e.g., "main", "dock-1", "dock-2") */
  id: string;

  /** Display label for the host (e.g., "Main Window", "Dock Window 1") */
  label: string;

  /** IDs of windows assigned to this host */
  visibleWindows: string[];
}

/**
 * Type alias for dock-spawn-ts serialized layout.
 *
 * @remarks
 * This is the raw JSON output from `dockManager.saveState()`.
 * Structure contains node tree, panel references, and layout metadata.
 */
export type DockHostLayout = Record<string, unknown>;

/**
 * Interface for the complete workspace state.
 *
 * @remarks
 * Persisted to electron-store and serves as the single source of truth
 * for workspace configuration across app sessions.
 */
export interface WorkspaceState {
  /** Workspace identifier (typically UUID or app constant) */
  id: string;

  /** All dockable windows in the workspace */
  windows: DockableWindow[];

  /** Defined hosts (main + satellite dock windows) */
  hosts: WorkspaceHost[];

  /** Saved layout per host ID */
  hostLayouts: Record<string, DockHostLayout>;

  /** Last update timestamp (ISO string or unix ms) */
  updatedAt: number;
}

/**
 * Interface for creating a new window (partial DockableWindow).
 *
 * @remarks
 * Used when creating windows dynamically. Omits id (auto-generated)
 * and has optional isVisible (defaults to true).
 */
export interface CreateWindowRequest {
  title: string;
  body: string;
  type: DockableWindowType;
  group: WindowGroup;
  isVisible?: boolean;
  displayMode?: WindowDisplayMode;
  windowState?: Record<string, unknown>;
}

/**
 * Interface for updating a window's properties.
 *
 * @remarks
 * Allows partial updates to window state without replacing entire object.
 */
export interface UpdateWindowRequest {
  isVisible?: boolean;
  displayMode?: WindowDisplayMode;
  windowState?: Record<string, unknown>;
}

/**
 * Interface for moving a window to a different host.
 *
 * @remarks
 * Used by IPC commands to transfer window ownership between hosts.
 */
export interface MoveWindowRequest {
  windowId: string;
  targetHostId: string;
}
