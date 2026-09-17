/**
 * Shared application settings types used across renderer and main processes.
 *
 * @remarks
 * These types model the `gdb` subtree returned by `getSettings()` from the main-process settings store.
 * `ConnectionConfig` represents the loose, pre-normalization shape of connection entries that may
 * originate from older settings files before being converted to `NormalizedConnection`.
 *
 * Settings are organized under `gdb.gui.windowConfigs[hostId]` with a unified structure:
 * - `bounds`: Window position and size (x, y, width, height)
 * - `maximized` and `fullscreen` state tracked in bounds or separately as needed
 */

import { Rectangle } from "./workspace-types";

export interface FloatingWindowState {
  windowId: string;
  dockableWindowId?: string;
  panelTitle: string;
  bounds: { x: number; y: number; width: number; height: number };
}

/**
 * Configuration for a single window (main or satellite).
 * Stores size, position, and dock layout for that window.
 * Dictionary key is the window name (e.g., "main", "satellite-1").
 */
export interface WindowConfig {
  bounds: Rectangle; // Window position and size (x, y, width, height)/ Legacy field kept for cleanup of older settings files
  maximized?: boolean; // Whether window is maximized
  fullscreen?: boolean; // Whether window is fullscreen
  createdAt?: string; // ISO timestamp when config was first created
  updatedAt?: string; // ISO timestamp of last modification
}

export interface GdbSettings {
  gui?: {
    sourceViewerTheme?: string;
    sourceViewerFontSize?: string;
    sourceViewerFontName?: string;
    applicationTheme?: string;
    showDebugInfo?: boolean;
    disableAutoSymbolLoading?: boolean;
    gridColumns?: Record<string, unknown>;
    sectionsView?: {
      showEmptySpace?: boolean;
      showLegend?: boolean;
    };
    // Unified window configuration structure
    windowConfigs?: Record<string, WindowConfig>; // Per-window size/position/layout configs (hostId => config)
  };
  command?: {
    history?: string[];
  };
  connections?: ConnectionConfig[];
  lastUsedConnection?: unknown;
  dangerousCommands?: unknown[];
}

export interface ConnectionConfig {
  name?: string;
  shell?: string;
  connectionType?: string;
  commands?: string[] | string;
  extraArguments?: string[] | string;
  wslDistribution?: string;
}
