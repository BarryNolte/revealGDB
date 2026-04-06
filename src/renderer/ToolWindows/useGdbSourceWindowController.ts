/**
 * Implements use gdb source window controller behavior for debugger tool-window rendering and interactions.
 *
 * @remarks
 * Exported symbols include `GdbSourceWindowController`, `useGdbSourceWindowController`. It coordinates live debugger data with user interactions in docked tool-window views.
 */
import ace from "ace-builds";
import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import AceEditor from "react-ace";

import { gdbBreakpoint } from "../../main/mi-interface/gdb-state-database/gdbStateDatabase";
import { gdbShowSourceInfo } from "../../main/mi-interface/mi-interface";
import { configureAceBasePath, defaultMode, editorModes } from "./GdbSourceEditorConfig";
import {
  SourceWindowState,
  applySourceUpdate,
  createInitialSourceWindowState,
  getEditorModeForFile,
} from "./GdbSourceWindowModel";
import { useSourceBreakpointInteractions } from "./useSourceBreakpointInteractions";
import { useSourceEditorSettings } from "./useSourceEditorSettings";
import { useSourceIpcSubscriptions } from "./useSourceIpcSubscriptions";

configureAceBasePath();

export type GdbSourceWindowController = {
  sourceState: SourceWindowState;
  mode: string;
  theme: string;
  fontSize: number;
  lineHeight: number;
  fontName: string;
  editorRef: RefObject<AceEditor | null>;
  onLoad: (editor: ace.Ace.Editor) => void;
  onCopySelection: () => void;
};

/**
 * Creates and returns the `useGdbSourceWindowController` hook API used by renderer components.
 *
 * @remarks
 * Encapsulates stateful React logic and returns values/callbacks consumed by UI components. Supports debugger tool-window rendering, interaction handling, or data synchronization.
 *
 * @returns The computed result produced by this operation.
 */
export function useGdbSourceWindowController(): GdbSourceWindowController {
  const [sourceState, setSourceState] = useState(createInitialSourceWindowState);
  const [mode, setMode] = useState(defaultMode);
  const { theme, fontSize, lineHeight, fontName } = useSourceEditorSettings();

  const fullFilePathRef = useRef("");
  const editorRef = useRef<AceEditor | null>(null);
  const { setBreakpoints, updateBreakpointMarkers, onLoad, onCopySelection } =
    useSourceBreakpointInteractions(editorRef, fullFilePathRef);

  const displayData = useCallback((data: gdbShowSourceInfo) => {
    if (data.fileName) {
      fullFilePathRef.current = data.fileName;
    }
    setSourceState((prevState) => applySourceUpdate(prevState, data));
  }, []);

  const handleSourceFile = useCallback(
    (data: gdbShowSourceInfo) => {
      setMode(getEditorModeForFile(data.fileName, editorModes, defaultMode));
      displayData(data);
      updateBreakpointMarkers();
    },
    [displayData, updateBreakpointMarkers],
  );

  const handleBreakpoints = useCallback(
    (data: Map<string, gdbBreakpoint>) => {
      setBreakpoints(data);
      updateBreakpointMarkers();
    },
    [setBreakpoints, updateBreakpointMarkers],
  );

  useSourceIpcSubscriptions({
    onSourceFile: handleSourceFile,
    onBreakpoints: handleBreakpoints,
  });

  useEffect(() => {
    if (sourceState.currentMarker !== -1) {
      editorRef.current?.editor.scrollToLine(sourceState.currentMarker, true, true);
    }
  }, [sourceState.currentMarker]);

  return {
    sourceState,
    mode,
    theme,
    fontSize,
    lineHeight,
    fontName,
    editorRef,
    onLoad,
    onCopySelection,
  };
}
