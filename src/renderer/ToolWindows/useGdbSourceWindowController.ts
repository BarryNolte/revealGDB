/**
 * Implements use gdb source window controller behavior for debugger tool-window rendering and interactions.
 *
 * @remarks
 * Exported symbols include `GdbSourceWindowController`, `useGdbSourceWindowController`. It coordinates live debugger data with user interactions in docked tool-window views.
 */
import { MenuEventArgs } from "@syncfusion/ej2-navigations";
import ace from "ace-builds";
import "ace-builds/src-noconflict/ext-searchbox";
import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import AceEditor from "react-ace";
import { gdbBreakpoint, gdbShowSourceInfo } from "../../common/gdb-state-types";
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

/**
 * Given a source line and column, extract the full member-access expression that
 * covers the cursor position (e.g. `mbs.ms.a`).
 *
 * Returns:
 *  - `base`:  the leftmost identifier (the root local variable, e.g. `mbs`)
 *  - `fieldPath`: the chain from after the base to and including the cursor identifier
 *                 (e.g. `ms.a` when cursor is on `a`), or `""` when cursor is on base
 *
 * Returns `null` when the cursor is not on an identifier character.
 */
function getMemberExpression(
  line: string,
  col: number,
): { base: string; fieldPath: string; rawExpr: string } | null {
  if (col >= line.length || !/\w/.test(line[col])) return null;

  // Match chains like `mbs`, `mbs.ms.a`, `ptr->field.sub`
  const memberExprRe = /\w+(?:(?:\.|->)\w+)*/g;
  let match: RegExpExecArray | null;
  while ((match = memberExprRe.exec(line)) !== null) {
    const exprStart = match.index;
    const exprEnd = exprStart + match[0].length;
    if (exprStart > col || col >= exprEnd) continue;

    // Find the end of the identifier the cursor sits on
    let wordEnd = col + 1;
    while (wordEnd < exprEnd && /\w/.test(line[wordEnd])) wordEnd++;

    // Slice expression up to (and including) the cursor identifier
    const cursorExpr = match[0].slice(0, wordEnd - exprStart);
    const baseMatch = /^\w+/.exec(cursorExpr);
    if (!baseMatch) return null;

    const base = baseMatch[0];
    const fieldPath = cursorExpr.slice(base.length).replace(/->/g, ".").replace(/^\./, "");
    return { base, fieldPath, rawExpr: cursorExpr };
  }
  return null;
}

/** Derive a short display type name from a GDB typeStr (which may be a full struct definition). */
function getDisplayTypeName(typeStr: string, varName: string): string {
  // typeStr ends with the variable name (e.g. "unsigned long flash_size").
  // Strip it to get the type part.
  const typePart = typeStr.replace(new RegExp(`\\s*\\b${varName}\\b\\s*$`), "").trim();
  if (!typePart) return "";
  // Struct/union: GDB expands typedefs, so we just report the keyword
  if (/^struct\b/.test(typePart) || /^union\b/.test(typePart)) return "struct";
  // Scalar: typePart is the actual type (e.g. "unsigned long", "uint32_t")
  return typePart.replace(/\s+/g, " ");
}

function useSourceTooltip(
  editorRef: RefObject<AceEditor | null>,
  fullFilePathRef: RefObject<string>,
): void {
  useEffect(() => {
    const currentEditor = editorRef.current;
    if (currentEditor?.editor) {
      const editor = currentEditor.editor;
      const tooltip: ace.Ace.HoverTooltip = new (ace.require("ace/tooltip").HoverTooltip)(
        currentEditor.refEditor,
      );
      tooltip.setDataProvider(function (e, editor) {
        const pos = editor.renderer.screenToTextCoordinates(e.clientX, e.clientY);

        const sourceFile = fullFilePathRef.current;
        if (!sourceFile) return;

        const line = editor.session.getLine(pos.row);
        const expr = getMemberExpression(line, pos.column);

        if (expr && expr.fieldPath.length > 0) {
          // Cursor is on a struct field — look up base variable type, evaluate the full expression
          void Promise.all([
            window.ipcToMain.queries.debugger.getVarByName(sourceFile, expr.base),
            window.ipcToMain.queries.debugger.evaluateExpression(expr.rawExpr),
          ]).then(([varInfo, value]) => {
            if (varInfo === undefined && value === undefined) {
              tooltip.hide(undefined);
              return;
            }
            const typeName = varInfo?.typeStr
              ? getDisplayTypeName(varInfo.typeStr, varInfo.name)
              : "";
            const valuePart = value !== undefined ? `${expr.rawExpr} = ${value}` : expr.rawExpr;
            const text = typeName ? `${valuePart}\n${typeName}` : valuePart;
            // this.host.emit("log-stream", `^done value=${resList}`);
            tooltip.setText(text);
            tooltip.show(undefined, e.clientX, e.clientY);
          });
        } else {
          // Cursor is on a plain identifier or the base of a member expression
          // expr?.base is the identifier when cursor is on the root of a member chain,
          // otherwise derive the word under the cursor directly from the line text.
          const wordMatch = /\w+/.exec(line.slice(pos.column));
          const identUnderCursor = expr?.base ?? wordMatch?.[0] ?? "";
          void Promise.all([
            window.ipcToMain.queries.debugger.queryVarAtPosition(
              sourceFile,
              pos.row + 1,
              pos.column,
            ),
            window.ipcToMain.queries.debugger.evaluateExpression(identUnderCursor),
          ]).then(([varInfo, value]) => {
            if (varInfo === undefined && value === undefined) {
              tooltip.hide(undefined);
              return;
            }
            const typeName = varInfo?.typeStr
              ? getDisplayTypeName(varInfo.typeStr, varInfo.name)
              : "";
            const name = varInfo?.name ?? identUnderCursor;
            const valuePart = value !== undefined ? `${name} = ${value}` : name;
            const text = typeName ? `${valuePart}\n${typeName}` : valuePart;
            tooltip.setText(text);
            tooltip.show(undefined, e.clientX, e.clientY);
          });
        }
      });

      tooltip.addToEditor(editor);
      return () => {
        tooltip.removeFromEditor(editor);
      };
    }
    return undefined;
  }, [editorRef, fullFilePathRef]);
}

export type GdbSourceWindowController = {
  sourceState: SourceWindowState;
  mode: string;
  theme: string;
  fontSize: number;
  lineHeight: number;
  fontName: string;
  editorRef: RefObject<AceEditor | null>;
  onLoad: (editor: ace.Ace.Editor) => void;
  onMenuSelect: (e: MenuEventArgs) => void;
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
  const { setBreakpoints, updateBreakpointMarkers, onLoad, onMenuSelect } =
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
      setTimeout(() => {
        editorRef.current?.editor.scrollToLine(sourceState.currentMarker, true, true);
      }, 150);
    }
  }, [sourceState.currentMarker]);

  // Workaround to prevent right-click context menu on gutter since  you can't
  // calculate anything useful there.
  useEffect(() => {
    editorRef.current?.editor.container.addEventListener("contextmenu", (e: MouseEvent) => {
      const width = editorRef.current?.editor.renderer.gutterWidth;
      if (e.x < width!) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      return true;
    });
  }, []);

  useSourceTooltip(editorRef, fullFilePathRef);

  return {
    sourceState,
    mode,
    theme,
    fontSize,
    lineHeight,
    fontName,
    editorRef,
    onLoad,
    onMenuSelect,
  };
}
