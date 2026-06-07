/**
 * Implements gdb source window view behavior for debugger tool-window rendering and interactions.
 *
 * @remarks
 * Exported symbols include `GdbSourceWindowView`. It coordinates live debugger data with user interactions in docked tool-window views.
 */
import { MenuEventArgs } from "@syncfusion/ej2-navigations";
import { ButtonComponent } from "@syncfusion/ej2-react-buttons";
import { ContextMenuComponent } from "@syncfusion/ej2-react-navigations";
import ace from "ace-builds";
import { JSX, RefObject } from "react";
import AceEditor, { IMarker } from "react-ace";
import { menuGutterSourceWindow, menuSourceWindow } from "../utilities/Clipboard";

export type GdbSourceWindowViewProps = {
  menuId: string;
  hasSource: boolean;
  editorRef: RefObject<AceEditor | null>;
  fullpath: string;
  filename: string;
  line: string;
  source: string;
  mode: string;
  theme: string;
  fontSize: number;
  lineHeight: number;
  fontName: string;
  stackMarkers: IMarker[];
  onLoad: (editor: ace.Ace.Editor) => void;
  onMenuSelect: (e: MenuEventArgs) => void;
  onGutterMenuSelect: (e: MenuEventArgs) => void;
  gutterMenuRef: RefObject<ContextMenuComponent | null>;
  editorMenuRef: RefObject<ContextMenuComponent | null>;
  onOpenDisassembly: () => void;
};

type SourcePaneProps = Pick<
  GdbSourceWindowViewProps,
  | "editorRef"
  | "fullpath"
  | "mode"
  | "theme"
  | "fontSize"
  | "lineHeight"
  | "fontName"
  | "stackMarkers"
  | "onLoad"
  | "source"
>;
/**
 * Performs SourcePane as part of this module's internal workflow.
 *
 * @param props - props parameter.
 * @returns The computed result produced by this operation.
 */

function SourcePane(props: SourcePaneProps): JSX.Element {
  const {
    editorRef,
    fullpath,
    mode,
    theme,
    fontSize,
    lineHeight,
    fontName,
    stackMarkers,
    onLoad,
    source,
  } = props;
  return (
    <div id="gdb-ace-editor" className="full-size flex-container">
      <div className="file-name flex-item-grow">{fullpath}</div>
      <AceEditor
        ref={editorRef}
        className="flex-item"
        mode={mode}
        theme={theme}
        fontSize={fontSize}
        lineHeight={lineHeight}
        onLoad={onLoad}
        value={source}
        markers={stackMarkers}
        readOnly={true}
        showGutter={true}
        name="code-editor-instance"
        setOptions={{ fontFamily: fontName }}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}

type NoSourcePaneProps = Pick<
  GdbSourceWindowViewProps,
  "filename" | "line" | "fullpath" | "onOpenDisassembly"
>;
/**
 * Performs NoSourcePane as part of this module's internal workflow.
 *
 * @param {
  filename - {
  filename parameter.
 * @param line - line parameter.
 * @param fullpath - fullpath parameter.
 * @param onOpenDisassembly - onOpenDisassembly parameter.
 * @param } - } parameter.
 * @returns The computed result produced by this operation.
 */

function NoSourcePane({
  filename,
  line,
  fullpath,
  onOpenDisassembly,
}: NoSourcePaneProps): JSX.Element {
  return (
    <div className="no-source">
      <table className="no-source-table">
        <caption className="no-source-header">No Source Found:</caption>
        <tbody>
          <tr>
            <td className="no-source-row-header">Filename:</td>
            <td className="no-source-row-data">
              <span className="no-source-filename">{filename}</span>
            </td>
          </tr>
          <tr>
            <td className="no-source-row-header">Line:</td>
            <td className="no-source-row-data">
              <span className="no-source-lineno">{line}</span>
            </td>
          </tr>
          <tr>
            <td className="no-source-row-header">Full Path:</td>
            <td className="no-source-row-data">
              <span className="no-source-fullpath">{fullpath}</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div>
        <ButtonComponent className="no-source-button" type="button" onClick={onOpenDisassembly}>
          Open in Disassembly Window
        </ButtonComponent>
      </div>
    </div>
  );
}

/**
 * Performs gdb source window view as part of this module's public API.
 *
 * @remarks
 * Supports debugger tool-window rendering, interaction handling, or data synchronization.
 *
 * @param props - Value for `props` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
export default function GdbSourceWindowView(props: GdbSourceWindowViewProps): JSX.Element {
  const {
    menuId,
    hasSource,
    editorRef,
    fullpath,
    filename,
    line,
    source,
    mode,
    theme,
    fontSize,
    lineHeight,
    fontName,
    stackMarkers,
    onLoad,
    onMenuSelect,
    onGutterMenuSelect,
    gutterMenuRef,
    editorMenuRef,
    onOpenDisassembly,
  } = props;

  return (
    <div className="full-size">
      <div className="full-size" data-testid="source-pane" hidden={!hasSource}>
        <SourcePane
          editorRef={editorRef}
          fullpath={fullpath}
          mode={mode}
          theme={theme}
          fontSize={fontSize}
          lineHeight={lineHeight}
          fontName={fontName}
          stackMarkers={stackMarkers}
          onLoad={onLoad}
          source={source}
        />
      </div>
      <div data-testid="no-source-pane" hidden={hasSource}>
        <NoSourcePane
          filename={filename}
          line={line}
          fullpath={fullpath}
          onOpenDisassembly={onOpenDisassembly}
        />
      </div>
      {/* Rendered outside any hidden div so Syncfusion can always find its target element */}
      <ContextMenuComponent
        ref={editorMenuRef}
        id={`source-menu-${menuId}`}
        items={menuSourceWindow}
        select={onMenuSelect}
      />
      <ContextMenuComponent
        ref={gutterMenuRef}
        id={`gutter-menu-${menuId}`}
        items={menuGutterSourceWindow}
        select={onGutterMenuSelect}
      />
    </div>
  );
}
