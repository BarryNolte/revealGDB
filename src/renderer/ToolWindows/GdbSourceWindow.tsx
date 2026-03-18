/**
 * GDB Source window component.
 *
 * Displays source code files with syntax highlighting using Ace Editor.
 * Features include:
 * - Syntax highlighting for multiple languages (C/C++, Python, Rust, etc.)
 * - Configurable editor themes (50+ themes available)
 * - Current execution line highlighting
 * - Breakpoint markers in the gutter
 * - Line numbers and code folding
 * - Context menu for copy operations
 *
 * The editor responds to source file updates from GDB and highlights the
 * current execution position. Breakpoints are visually marked in the gutter.
 */

import "ace-builds/css/ace.css";
import { JSX, useId } from "react";
import { IMarker } from "react-ace";

import "./GdbSourceWindow.css";
import GdbSourceWindowView from "./GdbSourceWindowView";
import { useGdbSourceWindowController } from "./useGdbSourceWindowController";

export { editorThemes } from "./GdbSourceEditorConfig";

export default function GdbSourceWindow(): JSX.Element {
  const menuId = useId();
  const {
    sourceState,
    mode,
    theme,
    fontSize,
    lineHeight,
    fontName,
    editorRef,
    onLoad,
    onCopySelection,
  } = useGdbSourceWindowController();

  return (
    <GdbSourceWindowView
      menuId={menuId}
      hasSource={sourceState.hasSource}
      editorRef={editorRef}
      fullpath={sourceState.fullpath}
      filename={sourceState.filename}
      line={sourceState.line}
      source={sourceState.source}
      mode={mode}
      theme={theme}
      fontSize={fontSize}
      lineHeight={lineHeight}
      fontName={fontName}
      stackMarkers={sourceState.stackMarkers as IMarker[]}
      onLoad={onLoad}
      onCopySelection={onCopySelection}
    />
  );
}
