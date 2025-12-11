import { Component, ReactElement } from "react";
import { rowOffsetIdPrefix } from "./editor-input-objects";

export default class EditorRowOffset extends Component<{ dataLength: number; radix: number }> {
  private readonly rowOffsetHighlight = "row-offset-highlight";
  private previousHighlightElement: HTMLElement | null = null;

  public highlightAtIdx(idx: number) {
    if (this.previousHighlightElement) {
      this.previousHighlightElement?.classList.remove(this.rowOffsetHighlight);
    }
    const id = Math.floor(idx / this.props.radix);
    this.previousHighlightElement = document.getElementById(rowOffsetIdPrefix + id.toString());
    this.previousHighlightElement?.classList.add(this.rowOffsetHighlight);
  }

  public clearHighlights() {
    this.previousHighlightElement?.classList.remove(this.rowOffsetHighlight);
  }

  override render() {
    const dataLength = this.props.dataLength;
    const radix = this.props.radix;
    const el: ReactElement[] = [];
    const totalRows = Math.ceil(dataLength / radix);
    for (let i = 0; i < totalRows; i++) {
      const address = (i * radix).toString(radix).toUpperCase().padStart(4, "0");
      el.push(
        <div className="row-offset" id={`${rowOffsetIdPrefix}${i}`} key={`${i}`}>
          {address}
        </div>,
      );
    }

    return <div className="editor-row editor-font">{el}</div>;
  }
}
