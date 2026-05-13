/**
 * Implements use source breakpoint interactions behavior for debugger tool-window rendering and interactions.
 *
 * @remarks
 * Exported symbols include `SourceBreakpointInteractions`, `useSourceBreakpointInteractions`. It coordinates live debugger data with user interactions in docked tool-window views.
 */
import ace from "ace-builds";
import { RefObject, useCallback, useEffect, useRef } from "react";
import AceEditor from "react-ace";

import { MenuEventArgs } from "@syncfusion/ej2-navigations";
import { GdbAny } from "../../common/gdb-common";
import { gdbBreakpoint } from "../../common/gdb-state-types";
import { sendTextToClipboard } from "../utilities/Clipboard";
import { mapBreakpointsToMarkers, SourceBreakpointMarker } from "./GdbSourceWindowModel";

export type SourceBreakpointInteractions = {
  setBreakpoints: (data: Map<string, gdbBreakpoint>) => void;
  updateBreakpointMarkers: () => void;
  onLoad: (editor: ace.Ace.Editor) => void;
  onMenuSelect: (e: MenuEventArgs) => void;
};

function useEditorSetup(
  editorRef: RefObject<AceEditor | null>,
  toggleBreakpointAtRow: (editor: ace.Ace.Editor, row: number) => void,
): void {
  const gutterClickListenerRef = useRef<((e: GdbAny) => void) | null>(null);

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

    editor.commands.addCommand({
      name: "F1_Goto_Command_Entry",
      bindKey: { win: "F1", mac: "F1" },
      exec: (_activeEditor: ace.Ace.Editor) => {
        window.ipcToMain.commands.app.notifyMain({ command: "command-entry" });
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
}

function useMenuSelect(
  editorRef: RefObject<AceEditor | null>,
  fullFilePathRef: RefObject<string>,
): (e: MenuEventArgs) => void {
  return useCallback(
    (e: MenuEventArgs) => {
      const row = editorRef.current?.editor.getCursorPosition().row ?? 0;

      switch (e.item.id) {
        case "copy":
          {
            const text = editorRef.current?.editor.getSelectedText();
            sendTextToClipboard(text ?? "");
          }
          break;
        case "bp-set":
          {
            window.ipcToMain.commands.debugger.sendGdbCommand(
              `break ${fullFilePathRef.current}:${row + 1}`,
            );
          }
          break;
        case "bp-run-to-cursor":
          {
            window.ipcToMain.commands.debugger.sendGdbCommand(
              `tbreak ${fullFilePathRef.current}:${row + 1}`,
            );
            window.ipcToMain.commands.debugger.sendGdbCommand("continue");
          }
          break;
        case "bp-jump-and-stop":
          {
            window.ipcToMain.commands.debugger.sendGdbCommand(
              `tbreak ${fullFilePathRef.current}:${row + 1}`,
            );
            window.ipcToMain.commands.debugger.sendGdbCommand(
              `jump ${fullFilePathRef.current}:${row + 1}`,
            );
          }
          break;
        case "bp-jump":
          {
            window.ipcToMain.commands.debugger.sendGdbCommand(
              `jump ${fullFilePathRef.current}:${row + 1}`,
            );
          }
          break;
      }
    },
    [editorRef, fullFilePathRef],
  );
}

/**
 * Creates and returns the `useSourceBreakpointInteractions` hook API used by renderer components.
 *
 * @remarks
 * Encapsulates stateful React logic and returns values/callbacks consumed by UI components. Supports debugger tool-window rendering, interaction handling, or data synchronization.
 *
 * @param editorRef - Value for `editorRef` consumed by this operation.
 * @param fullFilePathRef - Filesystem or source path used to locate the target resource.
 * @returns The computed result produced by this operation.
 */
export function useSourceBreakpointInteractions(
  editorRef: RefObject<AceEditor | null>,
  fullFilePathRef: RefObject<string>,
): SourceBreakpointInteractions {
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
        window.ipcToMain.commands.debugger.sendGdbCommand(
          `break ${fullFilePathRef.current}:${row + 1}`,
        );
      } else {
        window.ipcToMain.commands.debugger.sendGdbCommand(
          `clear ${fullFilePathRef.current}:${row + 1}`,
        );
      }
    },
    [fullFilePathRef],
  );

  useEditorSetup(editorRef, toggleBreakpointAtRow);

  const onLoad = useCallback((editor: ace.Ace.Editor) => {
    editor.clearSelection();
  }, []);

  const onMenuSelect = useMenuSelect(editorRef, fullFilePathRef);

  return {
    setBreakpoints,
    updateBreakpointMarkers,
    onLoad,
    onMenuSelect,
  };
}
