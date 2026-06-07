/**
 * Implements gdb source window model behavior for debugger tool-window rendering and interactions.
 *
 * @remarks
 * Exported symbols include `SourceWindowState`, `SourceBreakpointMarker`, `createInitialSourceWindowState`, `getBaseFilename`, `getEditorModeForFile`, `createMarkerForLine`, `applySourceUpdate`, `mapBreakpointsToMarkers`. It coordinates live debugger data with user interactions in docked tool-window views.
 */
import { IMarker } from "react-ace";

import { gdbBreakpoint, gdbShowSourceInfo } from "../../common/gdb-state-types";

export type SourceWindowState = {
  source: string;
  fullpath: string;
  filename: string;
  line: string;
  hasSource: boolean;
  currentMarker: number;
  stackMarkers: IMarker[];
};

export type SourceBreakpointMarker = {
  line: number;
  type: string;
  file: string;
};

/**
 * Creates initial source window state for downstream use.
 *
 * @remarks
 * Supports debugger tool-window rendering, interaction handling, or data synchronization.
 *
 * @returns The computed result produced by this operation.
 */
/**
 * Performs createInitialSourceWindowState as part of this module's internal workflow.
 *
 * @returns The computed result produced by this operation.
 */
export function createInitialSourceWindowState(): SourceWindowState {
  return {
    source: "",
    fullpath: "",
    filename: "",
    line: "",
    hasSource: false,
    currentMarker: -1,
    stackMarkers: [],
  };
}

/**
 * Returns base filename from current state.
 *
 * @remarks
 * Supports debugger tool-window rendering, interaction handling, or data synchronization.
 *
 * @param filePath - Filesystem or source path used to locate the target resource.
 * @returns The resulting string value produced by this operation.
 */
/**
 * Performs getBaseFilename as part of this module's internal workflow.
 *
 * @param filePath - filePath parameter.
 * @returns The computed result produced by this operation.
 */
export function getBaseFilename(filePath: string): string {
  return filePath.replace(/^.*[\\/]/, "");
}

/**
 * Returns editor mode for file from current state.
 *
 * @remarks
 * Supports debugger tool-window rendering, interaction handling, or data synchronization.
 *
 * @param fileName - Filesystem or source path used to locate the target resource.
 * @param modes - Map of keyed values consumed or updated by this operation.
 * @param fallbackMode - Value for `fallbackMode` consumed by this operation.
 * @returns The resulting string value produced by this operation.
 */
/**
 * Performs getEditorModeForFile as part of this module's internal workflow.
 *
 * @param fileName - fileName parameter.
 * @param modes - modes parameter.
 * @param string> - string> parameter.
 * @param fallbackMode - fallbackMode parameter.
 * @returns The computed result produced by this operation.
 */
export function getEditorModeForFile(
  fileName: string,
  modes: Map<string, string>,
  fallbackMode: string,
): string {
  const lastPeriodIndex = fileName.lastIndexOf(".");
  if (lastPeriodIndex === -1) {
    return fallbackMode;
  }

  const fileExt = fileName.slice(lastPeriodIndex + 1).toLowerCase();
  return modes.get(fileExt) || fallbackMode;
}

/**
 * Creates marker for line for downstream use.
 *
 * @remarks
 * Supports debugger tool-window rendering, interaction handling, or data synchronization.
 *
 * @param line - Line value used for source navigation or rendering.
 * @returns The resulting collection produced by this operation.
 */
/**
 * Performs createMarkerForLine as part of this module's internal workflow.
 *
 * @param line - line parameter.
 * @returns The computed result produced by this operation.
 */
export function createMarkerForLine(line: string): { currentMarker: number; markers: IMarker[] } {
  const currentMarker = Number.parseInt(line, 10) - 1;
  if (!Number.isFinite(currentMarker) || currentMarker < 0) {
    return { currentMarker: -1, markers: [] };
  }

  return {
    currentMarker,
    markers: [
      {
        startRow: currentMarker,
        startCol: 0,
        endRow: currentMarker,
        endCol: 1,
        className: "ace_highlight_line",
        type: "fullLine",
      },
    ],
  };
}

/**
 * Performs apply source update as part of this module's public API.
 *
 * @remarks
 * Supports debugger tool-window rendering, interaction handling, or data synchronization.
 *
 * @param prevState - Current state object read or updated by this operation.
 * @param data - Structured payload consumed by this operation.
 * @returns The computed result produced by this operation.
 */
/**
 * Performs applySourceUpdate as part of this module's internal workflow.
 *
 * @param prevState - prevState parameter.
 * @param data - data parameter.
 * @returns The computed result produced by this operation.
 */
export function applySourceUpdate(
  prevState: SourceWindowState,
  data: gdbShowSourceInfo,
): SourceWindowState {
  const fullpath = data.fileName || prevState.fullpath;
  const filename = data.fileName ? getBaseFilename(data.fileName) : prevState.filename;
  const line = data.line || prevState.line;
  const source = data.contents ?? prevState.source;
  const hasSource = !!data.contents;

  if (hasSource) {
    const markerData = createMarkerForLine(line);
    return {
      source,
      fullpath,
      filename,
      line,
      hasSource: true,
      currentMarker: markerData.currentMarker,
      stackMarkers: markerData.markers,
    };
  }

  return {
    source,
    fullpath,
    filename,
    line,
    hasSource: false,
    currentMarker: prevState.currentMarker,
    stackMarkers: prevState.stackMarkers,
  };
}

/**
 * Maps source input into breakpoints to markers output.
 *
 * @remarks
 * Supports debugger tool-window rendering, interaction handling, or data synchronization.
 *
 * @param breakpoints - Map of keyed values consumed or updated by this operation.
 * @returns The resulting collection produced by this operation.
 */
/**
 * Performs mapBreakpointsToMarkers as part of this module's internal workflow.
 *
 * @param breakpoints - breakpoints parameter.
 * @param gdbBreakpoint> | undefined - gdbBreakpoint> | undefined parameter.
 * @returns The computed result produced by this operation.
 */
export function mapBreakpointsToMarkers(
  breakpoints: Map<string, gdbBreakpoint> | undefined,
): SourceBreakpointMarker[] {
  const result: SourceBreakpointMarker[] = [];
  breakpoints?.forEach((bp) => {
    const bpLine = Number.parseInt(bp.line, 10) - 1;
    const type = bp.enabled === "y" ? "ace_breakpoint_enabled" : "ace_breakpoint_disabled";
    result.push({ line: bpLine, type, file: bp.fullname });
  });
  return result;
}
