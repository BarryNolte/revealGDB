/**
 * Implements gdb source window view behavior for debugger tool-window rendering and interactions.
 *
 * @remarks
 * Exported symbols include `GdbSourceWindowView`. It coordinates live debugger data with user interactions in docked tool-window views.
 */
import { MenuEventArgs } from "@syncfusion/ej2-navigations";
import { ContextMenuComponent } from "@syncfusion/ej2-react-navigations";
import ace from "ace-builds";
import { JSX, RefObject } from "react";
import AceEditor, { IMarker } from "react-ace";
import { menuSourceWindow } from "../utilities/Clipboard";

type GdbSourceWindowViewProps = {
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
};

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
  } = props;

  return (
    <div className="full-size">
      <div className="full-size" data-testid="source-pane" hidden={!hasSource}>
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
            showPrintMargin={false}
            showGutter={true}
            name="code-editor-instance"
            setOptions={{ fontFamily: fontName }}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      </div>
      <div data-testid="no-source-pane" hidden={hasSource}>
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
          {/* <div>
            <button className="no-source-button button-disassemble" type="button">
              Show Diassembly
            </button>
            <button className="no-source-button button-open-file" type="button">
              Open File...
            </button>
          </div> */}
        </div>
      </div>
      {/* Rendered outside any hidden div so Syncfusion can always find its target element */}
      <ContextMenuComponent
        id={`source-menu-${menuId}`}
        target="#gdb-ace-editor"
        items={menuSourceWindow}
        select={onMenuSelect}
      />
    </div>
  );
}
