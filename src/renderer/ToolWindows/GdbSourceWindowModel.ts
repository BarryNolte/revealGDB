import { IMarker } from "react-ace";

import { gdbBreakpoint } from "../../main/mi-interface/gdb-state-database/gdbStateDatabase";
import { gdbShowSourceInfo } from "../../main/mi-interface/mi-interface";

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

export function getBaseFilename(filePath: string): string {
  return filePath.replace(/^.*[\\/]/, "");
}

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

export function applySourceUpdate(
  prevState: SourceWindowState,
  data: gdbShowSourceInfo,
): SourceWindowState {
  const nextState: SourceWindowState = {
    ...prevState,
  };

  if (data.contents) {
    nextState.source = data.contents;
  }
  if (data.fileName) {
    nextState.fullpath = data.fileName;
    nextState.filename = getBaseFilename(data.fileName);
  }
  if (data.line) {
    nextState.line = data.line;
  }

  if (data.contents) {
    const markerData = createMarkerForLine(nextState.line);
    nextState.currentMarker = markerData.currentMarker;
    nextState.stackMarkers = markerData.markers;
    nextState.hasSource = true;
  } else {
    nextState.hasSource = false;
  }

  return nextState;
}

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
