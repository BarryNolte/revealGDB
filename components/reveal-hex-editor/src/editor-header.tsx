import { Component } from "react";
import { colAscOffsetIdPrefix, colHexOffsetIdPrefix } from "./editor-input-objects";

class EditorHeader extends Component<{ radix: number }> {
  private readonly colOffsetHighlight = "col-offset-highlight";
  private previousHexHighlightElement: HTMLElement | null = null;
  private previousAscHighlightElement: HTMLElement | null = null;

  public highlightAtIdx(idx: number) {
    if (this.previousHexHighlightElement) {
      this.previousHexHighlightElement?.classList.remove(this.colOffsetHighlight);
    }
    if (this.previousAscHighlightElement) {
      this.previousAscHighlightElement?.classList.remove(this.colOffsetHighlight);
    }

    const id = idx % this.props.radix;
    this.previousHexHighlightElement = document.getElementById(
      colHexOffsetIdPrefix + id.toString(),
    );
    this.previousAscHighlightElement = document.getElementById(
      colAscOffsetIdPrefix + id.toString(),
    );

    this.previousHexHighlightElement?.classList.add(this.colOffsetHighlight);
    this.previousAscHighlightElement?.classList.add(this.colOffsetHighlight);
  }

  public clearHighlights() {
    this.previousHexHighlightElement?.classList.remove(this.colOffsetHighlight);
    this.previousAscHighlightElement?.classList.remove(this.colOffsetHighlight);
  }

  override render() {
    return (
      <div className="editor-header editor-font">
        <table className="hex-editor-table">
          <tbody>
            <tr>
              <td className="edHeadFrontPadding hex-editor-nopadding">&#8203;</td>
              <td className="edHeadHTD hex-editor-nopadding">
                <span className="edHeadH" id="edHeadH-0">
                  00
                </span>
                <span className="edHeadH" id="edHeadH-1">
                  01
                </span>
                <span className="edHeadH" id="edHeadH-2">
                  02
                </span>
                <span className="edHeadH" id="edHeadH-3">
                  03
                </span>
                <span className="edHeadH" id="edHeadH-4">
                  04
                </span>
                <span className="edHeadH" id="edHeadH-5">
                  05
                </span>
                <span className="edHeadH" id="edHeadH-6">
                  06
                </span>
                <span className="edHeadH" id="edHeadH-7">
                  07
                </span>
                <span className="edHeadH" id="edHeadH-8">
                  08
                </span>
                <span className="edHeadH" id="edHeadH-9">
                  09
                </span>
                <span className="edHeadH" id="edHeadH-10">
                  0A
                </span>
                <span className="edHeadH" id="edHeadH-11">
                  0B
                </span>
                <span className="edHeadH" id="edHeadH-12">
                  0C
                </span>
                <span className="edHeadH" id="edHeadH-13">
                  0D
                </span>
                <span className="edHeadH" id="edHeadH-14">
                  0E
                </span>
                <span className="edHeadH" id="edHeadH-15">
                  0F
                </span>
              </td>
              <td className="edHeadMiddlePadding hex-editor-nopadding">&#8203;</td>
              <td className="edHeadATD hex-editor-nopadding">
                <span className="edHeadA" id="edHeadA-0">
                  0
                </span>
                <span className="edHeadA" id="edHeadA-1">
                  1
                </span>
                <span className="edHeadA" id="edHeadA-2">
                  2
                </span>
                <span className="edHeadA" id="edHeadA-3">
                  3
                </span>
                <span className="edHeadA" id="edHeadA-4">
                  4
                </span>
                <span className="edHeadA" id="edHeadA-5">
                  5
                </span>
                <span className="edHeadA" id="edHeadA-6">
                  6
                </span>
                <span className="edHeadA" id="edHeadA-7">
                  7
                </span>
                <span className="edHeadA" id="edHeadA-8">
                  8
                </span>
                <span className="edHeadA" id="edHeadA-9">
                  9
                </span>
                <span className="edHeadA" id="edHeadA-10">
                  A
                </span>
                <span className="edHeadA" id="edHeadA-11">
                  B
                </span>
                <span className="edHeadA" id="edHeadA-12">
                  C
                </span>
                <span className="edHeadA" id="edHeadA-13">
                  D
                </span>
                <span className="edHeadA" id="edHeadA-14">
                  E
                </span>
                <span className="edHeadA" id="edHeadA-15">
                  F
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
}

export default EditorHeader;
