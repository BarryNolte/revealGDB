import { Component, createRef } from "react";
import HexEditorAscii from "./editor-ascii-input-output";
import EditorHexInputOutput from "./editor-hex-input-output";
import EditorRowOffset from "./editor-row-offset";
import EditorHeader from "./editor-header";
import EditorFooter from "./editor-footer";

export type HexEditorAction = "hover" | "end-hover" | "changed";
export type HexEditorAsciiActionCallback = (action: HexEditorAction, data: string) => void;

class EditorBody extends Component<{ datasource: Uint8Array; radix: number }> {
  private asciiRef = createRef<HexEditorAscii>();
  private hexRef = createRef<EditorHexInputOutput>();
  private headerRef = createRef<EditorHeader>();
  private rowOffsetRef = createRef<EditorRowOffset>();

  private readonly radix = 16;

  private asciiCallback = (action: HexEditorAction, data: string): void => {
    switch (action) {
      case "hover":
        {
          const idx: number = parseInt(data, 10) || -1;
          this.asciiRef.current?.highlightAtIdx(idx);
          this.hexRef.current?.highlightAtIdx(idx);
          this.rowOffsetRef.current?.highlightAtIdx(idx);
          this.headerRef.current?.highlightAtIdx(idx);
        }
        break;
      case "end-hover":
        {
          this.asciiRef.current?.clearHighlights();
          this.hexRef.current?.clearHighlights();
          this.rowOffsetRef.current?.clearHighlights();
          this.headerRef.current?.clearHighlights();
        }
        break;
      case "changed":
        {
          console.log("Changed:", data);
        }
        break;
      default: {
        console.warn("Unknown action:", action);
      }
    }
  };

  private hexCallback = (action: HexEditorAction, data: string): void => {
    switch (action) {
      case "hover":
        {
          const idx: number = parseInt(data, 10) || -1;
          this.hexRef.current?.highlightAtIdx(idx);
          this.asciiRef.current?.highlightAtIdx(idx);
          this.rowOffsetRef.current?.highlightAtIdx(idx);
          this.headerRef.current?.highlightAtIdx(idx);
        }
        break;
      case "end-hover":
        {
          this.hexRef.current?.clearHighlights();
          this.asciiRef.current?.clearHighlights();
          this.rowOffsetRef.current?.clearHighlights();
          this.headerRef.current?.clearHighlights();
        }
        break;
      case "changed":
        {
          console.log("Changed:", data);
        }
        break;
      default: {
        console.warn("Unknown action:", action);
      }
    }
  };

  override render() {
    const dataLength = this.props.datasource.length;

    return (
      <div className="editor-body-container editor-font">
        <EditorHeader radix={this.props.radix} ref={this.headerRef} />
        <table className="hex-editor-table">
          <tbody>
            <tr>
              <td className="editor-row-offset hex-editor-nopadding">
                <EditorRowOffset
                  ref={this.rowOffsetRef}
                  dataLength={dataLength}
                  radix={this.radix}
                />
              </td>
              <td className="editor-hex-input-output hex-editor-nopadding">
                <EditorHexInputOutput
                  ref={this.hexRef}
                  datasource={this.props.datasource}
                  callback={this.hexCallback}
                />
              </td>
              <td className="hex-editor-nopadding">
                <HexEditorAscii
                  ref={this.asciiRef}
                  datasource={this.props.datasource}
                  radix={this.radix}
                  callback={this.asciiCallback}
                />
              </td>
            </tr>
          </tbody>
        </table>
        <EditorFooter />
      </div>
    );
  }
}

export default EditorBody;
