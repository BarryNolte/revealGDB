/**
 * Shared application settings types used across renderer and main processes.
 *
 * @remarks
 * These types model the `gdb` subtree returned by `getSettings()` (electron-settings `getSync("gdb")`).
 * `ConnectionConfig` represents the loose, pre-normalization shape of connection entries that may
 * originate from older settings files before being converted to `NormalizedConnection`.
 *
 */

export interface GdbSettings {
  gui?: {
    sourceViewerTheme?: string;
    sourceViewerFontSize?: string;
    sourceViewerFontName?: string;
    applicationTheme?: string;
    showDebugInfo?: boolean;
    disableAutoSymbolLoading?: boolean;
    gridColumns?: Record<string, unknown>;
    windowSize?: unknown;
    sectionsView?: {
      showEmptySpace?: boolean;
      showLegend?: boolean;
    };
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
