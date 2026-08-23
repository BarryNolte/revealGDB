/**
 * Types and interfaces for satellite window (multi-window docking) support.
 *
 * @remarks
 * Satellite windows are separate native browser windows that can host docked panels.
 * This enables the Visual Studio style multi-window debugging experience where you can
 * drag panels out into their own independent windows.
 */

/**
 * Configuration for a satellite window position and size.
 */
export type SatelliteWindowBounds = {
  /** X coordinate of window position */
  x: number;
  /** Y coordinate of window position */
  y: number;
  /** Width of the window */
  width: number;
  /** Height of the window */
  height: number;
};

/**
 * Persistent state for a single satellite window.
 */
export type SatelliteWindowState = {
  /** Unique window identifier */
  windowId: string;
  /** Window title/name */
  title: string;
  /** Panel/layout content for this window */
  layout: unknown;
  /** Window bounds (position and size) */
  bounds: SatelliteWindowBounds;
  /** Whether window should be restored on startup */
  autoRestore: boolean;
  /** When window was last saved */
  lastModified: number;
};

/**
 * Container for all satellite windows state.
 */
export type SatelliteWindowsState = {
  /** Map of window ID to window state */
  windows: Record<string, SatelliteWindowState>;
  /** Total number of satellite windows created (for ID generation) */
  windowCounter: number;
};
