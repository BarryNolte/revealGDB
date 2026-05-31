/**
 * Shared IPC data types used across main, preload, and renderer processes.
 *
 * @remarks
 * Pure data types for IPC payloads — safe to import from any layer.
 */

export type MemoryData = {
  begin: string;
  offset: string;
  end: string;
  data: Uint8Array;
};

export type WslDistro = {
  name: string;
  version: string;
  state: string;
  default: boolean;
};

export type SectionsViewOptions = {
  showEmptySpace: boolean;
  showLegend: boolean;
};

export type ConnectionCapturePayload = ["console-capture", { error: boolean; line: string }];
export type ConnectionStartupPayload = ["gdb-startup", string, string];
export type ConnectionStatusPayload = ConnectionCapturePayload | ConnectionStartupPayload;
