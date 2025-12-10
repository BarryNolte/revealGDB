import { Component, createRef, MouseEvent } from "react";
import { hexClass, hexIdPrefix } from "./editor-input-objects";
import { HexEditorAsciiActionCallback } from "./editor-body";

class EditorHexInputOutput extends Component<{
  datasource: Uint8Array;
  callback: HexEditorAsciiActionCallback;
}> {
  private readonly hexArray = "0123456789ABCDEF";
  private readonly hexHighlight = "hex-char-highlight";

  private _cb: HexEditorAsciiActionCallback = () => {};

  private hexRef = createRef<HTMLDivElement>();
  private previousHighlightElement: HTMLElement | null = null;

  public highlightAtIdx(idx: number) {
    if (this.previousHighlightElement) {
      this.previousHighlightElement?.classList.remove(this.hexHighlight);
    }
    this.previousHighlightElement = document.getElementById(hexIdPrefix + idx.toString());
    this.previousHighlightElement?.classList.add(this.hexHighlight);
  }

  public clearHighlights() {
    this.previousHighlightElement?.classList.remove(this.hexHighlight);
  }

  override componentDidMount() {
    this._cb = this.props.callback;
    this.renderHex();
  }

  override componentDidUpdate(prevProps: { datasource: Uint8Array }) {
    if (prevProps.datasource !== this.props.datasource) {
      this.renderHex();
    }
  }

  private hexAsChar(n: number): string {
    console.assert(n < this.hexArray.length);
    return this.hexArray[n];
  }

  private renderHex() {
    const hexDiv = this.hexRef.current;
    if (!hexDiv) return;
    const datasource = this.props.datasource || new Uint8Array();
    hexDiv.innerHTML = "";
    datasource.forEach((byte: number, index: number) => {
      const hiByte = (byte & 0xf0) >> 4;
      const loByte = byte & 0x0f;

      const span = document.createElement("span");
      span.textContent = this.hexAsChar(hiByte) + this.hexAsChar(loByte);
      span.className = hexClass;
      span.id = `${hexIdPrefix}${index.toString()}`;
      hexDiv.appendChild(span);
      if ((index + 1) % 16 === 0) {
        const br = document.createElement("br");
        hexDiv.appendChild(br);
      }
    });
  }

  private handleClick = (_event: MouseEvent<HTMLDivElement>) => {
    //this.inputObj.GoToClickedInputControl(event.clientX, event.clientY);
  };

  private handleHover = (event: MouseEvent<HTMLDivElement>) => {
    const element = document.elementFromPoint(event.clientX, event.clientY);
    if (element) {
      const id = element.id.replace(hexIdPrefix, "");
      if (id) {
        this._cb("hover", id);
      }
    }
  };

  private handleMouseLeave = (_event: MouseEvent<HTMLDivElement>) => {
    this._cb("end-hover", "");
  };

  override render() {
    return (
      <div
        ref={this.hexRef}
        className="editor-hex-column"
        onMouseOver={this.handleHover}
        onMouseLeave={this.handleMouseLeave}
        onClick={this.handleClick}
      ></div>
    );
  }
}

export default EditorHexInputOutput;
