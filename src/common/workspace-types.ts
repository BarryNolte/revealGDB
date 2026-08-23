/**
 * Workspace data model types for docking system.
 *
 * @remarks
 * Defines the shape of workspace state (windows, groups, visibility) and related
 * data structures used for persistence and IPC synchronization.
 * Ported from DockManager reference implementation.
 */

/**
 * Window type categorization.
 */
export type DockWindowType = "SourceFileWindow" | "ToolWindow";

/**
 * Window group categorization (enables future filtering/organization).
 */
export type DockWindowGroup = "documents" | "toolwindows";

/**
 * Window display mode (docked in layout vs. floating dialog).
 */
export type DockWindowDisplayMode = "docked" | "floating";

/**
 * Serialized dock layout (opaque JSON from dock-spawn-ts).
 */
export type DockHostLayout = Record<string, unknown>;

/**
 * Dock host metadata for multi-window support.
 * Each satellite window is represented by a host entry.
 */
export interface DockHost {
  /** Unique host identifier (UUID for satellites, 'main' for primary) */
  id: string;
  /** Human-readable label (e.g., "Dock Window 1") */
  label: string;
  /** Whether this host window is currently open/visible */
  isVisible: boolean;
  /** Timestamp when host was created */
  createdAt: number;
  /** Timestamp of last use */
  lastUsedAt?: number;
}

/**
 * Window bounds and state for per-host persistence.
 */
export interface HostWindowBounds {
  /** Absolute X coordinate */
  x: number;
  /** Absolute Y coordinate */
  y: number;
  /** Window width in pixels */
  width: number;
  /** Window height in pixels */
  height: number;
}

/**
 * Single dockable window definition.
 */
export interface DockableWindow {
  /** Unique window identifier */
  id: string;
  /** Display title (shown in toolbar, menu) */
  title: string;
  /** Window content (HTML string or placeholder) */
  body: string;
  /** Window type categorization */
  type: DockWindowType;
  /** Group membership (documents vs. toolwindows) */
  group: DockWindowGroup;
  /** Previously known group (for restoring after hide) */
  lastKnownGroup?: DockWindowGroup;
  /** Whether window is currently visible */
  isVisible: boolean;
  /** Display mode (docked or floating) */
  displayMode: DockWindowDisplayMode;
  /** Host-specific state (e.g., hostId, x, y, width, height for floating windows) */
  windowState?: Record<string, unknown>;
}

/**
 * Complete workspace state (all windows, hosts, layouts, bounds).
 *
 * @remarks
 * Represents the full state of the application across all windows.
 * Each host (main or satellite) has its own dock layout, bounds, and state.
 */
export interface WorkspaceState {
  /** Workspace identifier */
  id: string;
  /** Array of all windows in workspace (global across all hosts) */
  windows: DockableWindow[];
  /** Host definitions for multi-window support */
  hosts: DockHost[];
  /** Per-host dock layouts (opaque serialized JSON from dock-spawn-ts) */
  hostLayouts: Record<string, DockHostLayout>;
  /** Per-host window bounds (for restoration on restart) */
  hostWindowBounds: Record<string, HostWindowBounds>;
  /** Per-host maximized state */
  hostWindowMaximized: Record<string, boolean>;
  /** Per-host fullscreen state */
  hostWindowFullscreen: Record<string, boolean>;
  /** Timestamp of last update */
  updatedAt: number;
}

/**
 * Request to create a new window.
 */
export interface CreateWindowRequest {
  /** Optional window ID; auto-generated if omitted */
  id?: string;
  /** Display title */
  title: string;
  /** Window content */
  body: string;
  /** Window type */
  type: DockWindowType;
  /** Group membership (default: "toolwindows") */
  group?: DockWindowGroup;
  /** Display mode (default: "docked") */
  displayMode?: DockWindowDisplayMode;
  /** Host-specific state */
  windowState?: Record<string, unknown>;
}

/**
 * Request to move a window to a different group.
 */
export interface MoveWindowRequest {
  /** Window ID to move */
  windowId: string;
  /** Target group */
  group: DockWindowGroup;
}

/**
 * Request to change window visibility.
 */
export interface SetWindowVisibilityRequest {
  /** Window ID */
  windowId: string;
  /** Desired visibility state */
  isVisible: boolean;
  /** Optional group to restore to */
  group?: DockWindowGroup;
}

/**
 * Request to save a host's dock layout.
 */
export interface SaveHostLayoutRequest {
  /** Host ID (default: "main") */
  hostId: string;
  /** Serialized dock layout (null to clear) */
  layout: DockHostLayout | null;
}
