import { Component, createRef, MouseEvent } from "react";
import { asciiClass, asciiIdPrefix, InputObjects } from "./editor-input-objects";
import { HexEditorAsciiActionCallback } from "./editor-body";

export default class HexEditorAscii extends Component<{
  datasource?: Uint8Array;
  radix?: number;
  callback: HexEditorAsciiActionCallback;
}> {
  private readonly ascHighlight = "ascii-char-highlight";

  private asciiRef = createRef<HTMLDivElement>();
  private inputObj: InputObjects = new InputObjects();
  private _cb: HexEditorAsciiActionCallback = () => {};

  private previousHighlightElement: HTMLElement | null = null;

  public highlightAtIdx(idx: number) {
    if (this.previousHighlightElement) {
      this.previousHighlightElement?.classList.remove(this.ascHighlight);
    }
    this.previousHighlightElement = document.getElementById(asciiIdPrefix + idx.toString());
    this.previousHighlightElement?.classList.add(this.ascHighlight);
  }

  public clearHighlights() {
    this.previousHighlightElement?.classList.remove(this.ascHighlight);
  }

  /**
   *
   */
  override componentDidMount() {
    this.inputObj.arraySize = this.props.datasource?.length || 0;
    this._cb = this.props.callback;
    this.renderAscii();
    this.inputObj.onChange = (key: string, idx: number) => {
      console.log(`OnChange: ${key} -> ${idx}`);
    };
  }

  /**
   *
   */
  override componentDidUpdate(prevProps: { datasource?: Uint8Array }) {
    if (prevProps.datasource !== this.props.datasource) {
      this.inputObj.arraySize = this.props.datasource?.length || 0;
      this.renderAscii();
    }
  }

  /*
   *
   */
  private renderAscii() {
    const asciiDiv = this.asciiRef.current;
    if (!asciiDiv) return;

    asciiDiv.innerHTML = "";
    const datasource = this.props.datasource || new Uint8Array();

    datasource.forEach((byte: number, index: number) => {
      const char = byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : ".";
      const span = document.createElement("span");
      span.textContent = char;
      span.className = asciiClass;
      span.id = `${asciiIdPrefix}${index.toString()}`;
      asciiDiv.appendChild(span);
      if ((index + 1) % 16 === 0) {
        const br = document.createElement("br");
        asciiDiv.appendChild(br);
      }
    });
  }

  private handleClick = (event: MouseEvent<HTMLDivElement>) => {
    this.inputObj.GoToClickedInputControl(event.clientX, event.clientY);
  };

  private handleHover = (event: MouseEvent<HTMLDivElement>) => {
    const element = document.elementFromPoint(event.clientX, event.clientY);
    if (element) {
      const id = element.id.replace(asciiIdPrefix, "");
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
        ref={this.asciiRef}
        className="editor-ascii-column"
        onMouseOver={this.handleHover}
        onMouseLeave={this.handleMouseLeave}
        onClick={this.handleClick}
      ></div>
    );
  }
}
