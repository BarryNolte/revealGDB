/**
 * Implements gdb source window behavior for debugger tool-window rendering and interactions.
 *
 * @remarks
 * Exported symbols include `GdbSourceWindow`. It coordinates live debugger data with user interactions in docked tool-window views.
 */
import "ace-builds/css/ace.css";
import { JSX, useId } from "react";
import { IMarker } from "react-ace";

import GdbSourceWindowView from "./GdbSourceWindowView";
import { useGdbSourceWindowController } from "./useGdbSourceWindowController";

export { editorThemes } from "./GdbSourceEditorConfig";

import "./GdbSourceWindow.css";
import { ToolWindowContent } from "./ToolWindowContent";
import { TOOL_WINDOW_TITLES } from "./toolWindowTitles";

/**
 * Performs gdb source window as part of this module's public API.
 *
 * @remarks
 * Supports debugger tool-window rendering, interaction handling, or data synchronization.
 *
 * @returns The computed result produced by this operation.
 */
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
    onMenuSelect,
  } = useGdbSourceWindowController();

  return (
    <ToolWindowContent title={TOOL_WINDOW_TITLES.source}>
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
        onMenuSelect={onMenuSelect}
      />
    </ToolWindowContent>
  );
}
