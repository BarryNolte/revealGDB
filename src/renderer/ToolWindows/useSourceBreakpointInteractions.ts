import ace from "ace-builds";
import { RefObject, useCallback, useEffect, useRef } from "react";
import AceEditor from "react-ace";

import { gdbBreakpoint } from "../../main/mi-interface/gdb-state-database/gdbStateDatabase";
import { GdbAny } from "../../common/gdb-common";
import { sendTextToClipboard } from "../utilities/Clipboard";
import { mapBreakpointsToMarkers, SourceBreakpointMarker } from "./GdbSourceWindowModel";

export type SourceBreakpointInteractions = {
  setBreakpoints: (data: Map<string, gdbBreakpoint>) => void;
  updateBreakpointMarkers: () => void;
  onLoad: (editor: ace.Ace.Editor) => void;
  onCopySelection: () => void;
};

export function useSourceBreakpointInteractions(
  editorRef: RefObject<AceEditor | null>,
  fullFilePathRef: RefObject<string>,
): SourceBreakpointInteractions {
  const gutterClickListenerRef = useRef<((e: GdbAny) => void) | null>(null);
  const breakpointsRef = useRef<SourceBreakpointMarker[]>([]);

  const updateBreakpointMarkers = useCallback(() => {
    const session = editorRef.current?.editor.getSession();

    session?.clearBreakpoints();
    breakpointsRef.current.forEach((bp) => {
      if (bp.file === fullFilePathRef.current) {
        session?.setBreakpoint(bp.line, bp.type);
      }
    });
  }, [editorRef, fullFilePathRef]);

  const setBreakpoints = useCallback((data: Map<string, gdbBreakpoint>) => {
    breakpointsRef.current = mapBreakpointsToMarkers(data);
  }, []);

  const toggleBreakpointAtRow = useCallback(
    (editor: ace.Ace.Editor, row: number) => {
      if (editor.getSession().getBreakpoints()[row] === undefined) {
        window.ipcToMain.sendGdbCommand(`break ${fullFilePathRef.current}:${row + 1}`);
      } else {
        window.ipcToMain.sendGdbCommand(`clear ${fullFilePathRef.current}:${row + 1}`);
      }
    },
    [fullFilePathRef],
  );

  useEffect(() => {
    const editor = editorRef.current?.editor;
    if (!editor) {
      return;
    }

    editor.commands.addCommand({
      name: "F9_Breakpoint_Toggle",
      bindKey: { win: "F9", mac: "F9" },
      exec: (activeEditor: ace.Ace.Editor) => {
        const row = activeEditor.getCursorPosition().row;
        toggleBreakpointAtRow(activeEditor, row);
      },
      readOnly: true,
    });

    editor.setOption("showFoldWidgets", false);

    gutterClickListenerRef.current = (e: GdbAny) => {
      const target = e.domEvent.target;
      if (
        target.className.indexOf("ace_gutter-cell") === -1 ||
        !editor.isFocused() ||
        e.clientX > 25 + target.getBoundingClientRect().left
      ) {
        return;
      }

      const row = e.getDocumentPosition().row;
      toggleBreakpointAtRow(e.editor, row);
      e.stop();
    };

    editor.on("gutterclick", gutterClickListenerRef.current);

    return () => {
      if (gutterClickListenerRef.current) {
        editor.off("gutterclick", gutterClickListenerRef.current);
      }
    };
  }, [editorRef, toggleBreakpointAtRow]);

  const onLoad = useCallback((editor: ace.Ace.Editor) => {
    editor.clearSelection();
  }, []);

  const onCopySelection = useCallback(() => {
    const text = editorRef.current?.editor.getSelectedText();
    sendTextToClipboard(text ?? "");
  }, [editorRef]);

  return {
    setBreakpoints,
    updateBreakpointMarkers,
    onLoad,
    onCopySelection,
  };
}
