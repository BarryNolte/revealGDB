import { Component, createRef } from "react";

export default class EditorEntry extends Component<{
  datalength: number;
  callback: (radix: number) => void;
}> {
  private radixRef = createRef<HTMLSelectElement>();

  private setRadix = (): void => {
    if (this.props.callback) {
      const radix = parseInt(this.radixRef.current?.value || "16");
      this.props.callback(radix);
    }
  };

  override render() {
    const placeholder = "0x" + this.props.datalength.toString(16).toUpperCase() + " bytes";

    return (
      <div className="editor-entry">
        <input type="text" placeholder="Enter Address..." />
        <button type="button">Refresh...</button>
        <select onChange={this.setRadix} ref={this.radixRef} title="radix" defaultValue="16">
          <option value="16">Hexadecimal</option>
          <option value="10">Decimal</option>
          <option value="8">Octal</option>
          <option value="2">Binary</option>
        </select>
        <br />
        <div>
          Data Length:&nbsp;&nbsp;&nbsp;
          <input
            type="text"
            placeholder={placeholder}
            required
            minLength={4}
            maxLength={8}
            size={10}
          />
        </div>
      </div>
    );
  }
}
