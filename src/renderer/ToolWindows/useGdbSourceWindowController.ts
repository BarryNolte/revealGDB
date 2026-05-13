/**
 * Implements use gdb source window controller behavior for debugger tool-window rendering and interactions.
 *
 * @remarks
 * Exported symbols include `GdbSourceWindowController`, `useGdbSourceWindowController`. It coordinates live debugger data with user interactions in docked tool-window views.
 */
import { MenuEventArgs } from "@syncfusion/ej2-navigations";
import { Tooltip } from "@syncfusion/ej2-popups";
import ace from "ace-builds";
import "ace-builds/src-noconflict/ext-searchbox";
import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import AceEditor from "react-ace";
import { gdbBreakpoint, gdbShowSourceInfo } from "../../common/gdb-state-types";
import { formatGdbValueHtml, isComplexValue } from "./gdb-value-formatter";
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
export function getMemberExpression(
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
export function getDisplayTypeName(typeStr: string, varName: string): string {
  // typeStr ends with the variable name (e.g. "unsigned long flash_size").
  // Strip it to get the type part.
  const typePart = typeStr.replace(new RegExp(`\\s*\\b${varName}\\b\\s*$`), "").trim();
  if (!typePart) return "";
  // Struct/union: GDB expands typedefs, so we just report the keyword
  if (/^struct\b/.test(typePart) || /^union\b/.test(typePart)) return "struct";
  // Scalar: typePart is the actual type (e.g. "unsigned long", "uint32_t")
  return typePart.replace(/\s+/g, " ");
}

/** Build the HTML content string for the Syncfusion tooltip. */
export function buildTooltipHtml(
  name: string,
  value: string | undefined,
  typeName: string,
): string {
  let valueLine: string;
  if (value === undefined) {
    valueLine = `<span class="tip-name">${name}</span>`;
  } else if (isComplexValue(value)) {
    valueLine =
      `<span class="tip-name">${name}</span><span class="tip-eq"> = </span>` +
      formatGdbValueHtml(value);
  } else {
    valueLine = `<span class="tip-name">${name}</span><span class="tip-eq"> = </span><span class="tip-value">${value}</span>`;
  }
  const typeLine = typeName ? `<div class="tip-type">${typeName}</div>` : "";
  return `${valueLine}${typeLine}`;
}

export type TooltipContext = {
  anchor: HTMLDivElement;
  sfTip: Tooltip;
  fullFilePathRef: RefObject<string>;
};

/** Creates the ace HoverTooltip data provider function, driving a Syncfusion Tooltip for display. */
export function makeTooltipDataProvider(ctx: TooltipContext) {
  return function (e: ace.Ace.MouseEvent, editor: ace.Ace.Editor) {
    const pos = editor.renderer.screenToTextCoordinates(e.clientX, e.clientY);
    const sourceFile = ctx.fullFilePathRef.current;
    if (!sourceFile) {
      ctx.sfTip.close();
      return;
    }
    const line = editor.session.getLine(pos.row);
    const expr = getMemberExpression(line, pos.column);

    const showTip = (name: string, value: string | undefined, typeName: string) => {
      ctx.anchor.style.left = `${e.clientX}px`;
      ctx.anchor.style.top = `${e.clientY}px`;
      ctx.sfTip.content = buildTooltipHtml(name, value, typeName);
      ctx.sfTip.open(ctx.anchor);
    };

    if (expr && expr.fieldPath.length > 0) {
      void Promise.all([
        window.ipcToMain.queries.debugger.getVarByName(sourceFile, expr.base),
        window.ipcToMain.queries.debugger.evaluateExpression(expr.rawExpr),
      ]).then(([varInfo, value]) => {
        if (varInfo === undefined && value === undefined) {
          ctx.sfTip.close();
          return;
        }
        const typeName = varInfo?.typeStr ? getDisplayTypeName(varInfo.typeStr, varInfo.name) : "";
        showTip(expr.rawExpr, value, typeName);
      });
    } else {
      const wordMatch = /\w+/.exec(line.slice(pos.column));
      const ident = expr?.base ?? wordMatch?.[0] ?? "";
      void Promise.all([
        window.ipcToMain.queries.debugger.queryVarAtPosition(sourceFile, pos.row + 1, pos.column),
        window.ipcToMain.queries.debugger.evaluateExpression(ident),
      ]).then(([varInfo, value]) => {
        if (varInfo === undefined && value === undefined) {
          ctx.sfTip.close();
          return;
        }
        const typeName = varInfo?.typeStr ? getDisplayTypeName(varInfo.typeStr, varInfo.name) : "";
        showTip(varInfo?.name ?? ident, value, typeName);
      });
    }
  };
}

/**
 * Wires the tooltip-close behaviour: closes sfTip when the mouse leaves both the editor
 * container and the popup, but keeps it open if the mouse is geometrically within the
 * popup rect (handles pointer-event transitions during the open animation).
 * Returns a cleanup function.
 */
function wireTooltipCloseHandlers(
  sfTip: Tooltip,
  container: HTMLElement,
  session: ace.Ace.EditSession,
): () => void {
  let tipPopupEl: HTMLElement | null = null;
  let closeTimer: ReturnType<typeof setTimeout> | null = null;
  let lastMouseX = 0;
  let lastMouseY = 0;

  const trackMouse = (e: MouseEvent) => {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  };
  document.addEventListener("mousemove", trackMouse, { passive: true });

  const closeTip = () => {
    sfTip.close();
  };

  const scheduledClose = () => {
    if (closeTimer) clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      closeTimer = null;
      if (tipPopupEl) {
        const { left, right, top, bottom } = tipPopupEl.getBoundingClientRect();
        if (lastMouseX >= left && lastMouseX <= right && lastMouseY >= top && lastMouseY <= bottom)
          return;
      }
      sfTip.close();
    }, 80);
  };

  sfTip.beforeOpen = (args) => {
    if (tipPopupEl !== args.element) {
      tipPopupEl?.removeEventListener("mouseleave", scheduledClose);
      tipPopupEl = args.element;
      tipPopupEl?.addEventListener("mouseleave", scheduledClose);
    }
  };
  container.addEventListener("mouseleave", scheduledClose);
  session.on("changeScrollTop", closeTip);

  return () => {
    container.removeEventListener("mouseleave", scheduledClose);
    session.off("changeScrollTop", closeTip);
    document.removeEventListener("mousemove", trackMouse);
    if (closeTimer) clearTimeout(closeTimer);
  };
}

function useSourceTooltip(
  editorRef: RefObject<AceEditor | null>,
  fullFilePathRef: RefObject<string>,
): void {
  useEffect(() => {
    const currentEditor = editorRef.current;
    if (!currentEditor?.editor) return undefined;

    const editor = currentEditor.editor;

    // Phantom anchor: 1×1 fixed div that Syncfusion anchors the popup to.
    const anchor = document.createElement("div");
    anchor.style.cssText = "position:fixed;width:1px;height:1px;pointer-events:none;";
    document.body.appendChild(anchor);

    const sfTip = new Tooltip(
      {
        opensOn: "Custom",
        cssClass: "reveal-tip",
        content: "",
        enableHtmlSanitizer: true,
        enableHtmlParse: true,
        position: "RightBottom",
        offsetX: 10,
        offsetY: 10,
        animation: {
          open: { effect: "FadeIn", duration: 100, delay: 0 },
          close: { effect: "FadeOut", duration: 100, delay: 0 },
        },
      },
      anchor,
    );

    // Ace HoverTooltip — used only for debounce/mousemove wiring; never calls show/setText.
    const aceTooltip: ace.Ace.HoverTooltip = new (ace.require("ace/tooltip").HoverTooltip)(
      currentEditor.refEditor,
    );

    const ctx: TooltipContext = {
      anchor,
      sfTip,
      fullFilePathRef,
    };
    aceTooltip.setDataProvider(makeTooltipDataProvider(ctx));
    aceTooltip.addToEditor(editor);

    const unwireClose = wireTooltipCloseHandlers(sfTip, currentEditor.refEditor, editor.session);

    return () => {
      aceTooltip.removeFromEditor(editor);
      unwireClose();
      sfTip.destroy();
      anchor.remove();
    };
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
