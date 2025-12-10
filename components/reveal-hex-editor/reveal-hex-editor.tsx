import EditorEntry from "./src/editor-entry-form";
import EditorBody from "./src/editor-body";

import "./reveal-hex-editor.css";
import { Component } from "react";

interface IHexEditorProps {
  datasource: Uint8Array;
  radix?: number;
  showAscii?: boolean;
  showRowCount?: boolean;
  showColCount?: boolean;
}

interface IState {
  datasource?: Uint8Array;
  radix?: number;
}

class RevealHexEditor extends Component<IHexEditorProps, IState> {
  constructor(props: IHexEditorProps) {
    super(props);
    this.state = {
      datasource: props.datasource,
      radix: props.radix,
    };
  }

  formEntryCallback(radix: number): void {
    console.error(`Function not implemented. ${radix}`);
  }

  override render() {
    return (
      <div className="editor-container">
        <EditorEntry datalength={this.props.datasource.length} callback={this.formEntryCallback} />
        <EditorBody datasource={this.props.datasource} radix={this.props.radix || 16} />
      </div>
    );
  }
}

export default RevealHexEditor;
