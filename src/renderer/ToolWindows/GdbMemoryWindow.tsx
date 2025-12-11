import { Component } from "react";
import RevealHexEditor from "../../../components/reveal-hex-editor/reveal-hex-editor";

interface GdbMemoryWindowState {
  datasource: Uint8Array;
}

export default class GdbMemoryWindow extends Component<
  Record<string, never>,
  GdbMemoryWindowState
> {
  constructor(props: Record<string, never>) {
    super(props);
    this.state = {
      datasource: window.crypto.getRandomValues(new Uint8Array(257)),
    };
  }

  override render() {
    return <RevealHexEditor datasource={this.state.datasource} />;
  }
}
