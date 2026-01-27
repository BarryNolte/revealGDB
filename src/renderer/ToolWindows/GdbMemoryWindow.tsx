import { Component } from "react";

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
    return (
      <>
        <div>Memory Window</div>
      </>
    );
  }
}
