/**
 * Monitor profile types for multi-monitor window management.
 *
 * @remarks
 * Enables saving and restoring window layouts across different monitor
 * configurations (e.g., office setup with 2 monitors vs. home setup with 1 monitor).
 * Stores snapshots of display configuration and corresponding window bounds.
 */

import type { HostWindowBounds } from "./workspace-types";

/**
 * Snapshot of a single display at time of profile creation.
 *
 * @remarks
 * Used to detect if current monitor setup matches saved profile.
 * If displays don't match exactly, smart restoration logic applies
 * proportional scaling/fallback.
 */
export interface DisplaySnapshot {
  /** Electron display ID */
  displayId: number;
  /** Display name (OS-provided) */
  displayName?: string;
  /** Display bounds (absolute coordinates) */
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Usable work area (excluding taskbars, menu bars) */
  workArea: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Pixel scale factor (e.g., 2.0 on retina displays) */
  scaleFactor: number;
  /** Whether this is the primary display */
  isPrimary: boolean;
}

/**
 * Window layout snapshot for a single host.
 *
 * @remarks
 * Includes window bounds, maximized/fullscreen state,
 * and optional dock layout (panel arrangement).
 */
export interface HostLayoutSnapshot {
  /** Host ID (e.g., "main", "satellite-1") */
  hostId: string;
  /** Host label (e.g., "Main Window", "Dock Window 1") */
  hostLabel: string;
  /** Window bounds in absolute coordinates */
  bounds: HostWindowBounds;
  /** Whether window was maximized */
  isMaximized: boolean;
  /** Whether window was fullscreen */
  isFullscreen: boolean;
  /** Serialized dock layout (opaque JSON from dock-spawn-ts) */
  layout?: string;
}

/**
 * Complete monitor profile: Display configuration + window layouts.
 *
 * @remarks
 * Includes profile metadata, display snapshots, and window layout states
 * for all hosts (main + satellites).
 */
export interface MonitorProfile {
  /** Unique profile identifier (UUID) */
  id: string;
  /** User-friendly name (e.g., "Office Setup") */
  name: string;
  /** Timestamp when profile was created */
  createdAt: number;
  /** Timestamp when profile was last used */
  lastUsedAt?: number;
  /** Snapshot of all displays at time of profile creation */
  displays: DisplaySnapshot[];
  /** Window bounds and state per host */
  hostLayouts: HostLayoutSnapshot[];
  /** Whether this is the currently active profile */
  isActive: boolean;
}

/**
 * Container for all monitor profiles.
 */
export interface MonitorProfiles {
  /** Array of saved profiles */
  profiles: MonitorProfile[];
  /** ID of currently active profile (if any) */
  currentProfileId?: string;
}

/**
 * Request to create a new monitor profile.
 */
export interface CreateMonitorProfileRequest {
  /** Profile name */
  name: string;
  /** Current host layouts to save (optional; uses current state if omitted) */
  hostLayouts?: HostLayoutSnapshot[];
}

/**
 * Request to apply a saved monitor profile.
 */
export interface ApplyMonitorProfileRequest {
  /** Profile ID to apply */
  profileId: string;
  /** Whether to restore window bounds (default: true) */
  restoreBounds?: boolean;
  /** Whether to restore dock layouts (default: true) */
  restoreLayouts?: boolean;
}

/**
 * Request to delete a monitor profile.
 */
export interface DeleteMonitorProfileRequest {
  /** Profile ID to delete */
  profileId: string;
}

/**
 * Result of profile detection/restoration attempt.
 */
export interface ProfileDetectionResult {
  /** Whether a matching profile was found and applied */
  success: boolean;
  /** Matching profile (if success) */
  profile?: MonitorProfile;
  /** Reason for failure (if not success) */
  reason?: string;
  /** Current display configuration */
  currentDisplays: DisplaySnapshot[];
}

/**
 * Utility type: Bound layout with original profile metadata.
 *
 * @remarks
 * Used during restoration to track which profile a layout came from,
 * useful for logging and debugging.
 */
export interface BoundHostLayout extends HostLayoutSnapshot {
  /** Source profile ID (for debugging) */
  sourceProfileId: string;
  /** Whether bounds were scaled (vs. exact match) */
  wasScaled: boolean;
}
