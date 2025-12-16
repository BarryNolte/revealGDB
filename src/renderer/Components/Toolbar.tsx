import { ItemDirective, ItemsDirective, ToolbarComponent } from "@syncfusion/ej2-react-navigations";
import { Component, RefObject } from "react";
import { ConnectionManager } from "../Dialogs/ConnectionManager";
import { Settings } from "../Dialogs/Settings";

import "./ToolBar.css";

type RevealToolbarProps = {
  connectionsRef?: RefObject<ConnectionManager> | null;
  settingsRef?: RefObject<Settings> | null;
};

type RevealToolbarState = {
  connectionsRef?: RefObject<ConnectionManager> | null;
  settingsRef?: RefObject<Settings> | null;
};

export default class RevealToolbar extends Component<RevealToolbarProps, RevealToolbarState> {
  constructor(props: RevealToolbarProps) {
    super(props);
    this.state = { connectionsRef: props.connectionsRef, settingsRef: props.settingsRef };
  }

  private onContinue = () => {
    window.ipcToMain.sendGdbCommand("continue");
  };

  private onPause = () => {
    window.ipcToMain.sendGdbCommand("signal SIGINT");
  };

  private onStop = () => {
    window.ipcToMain.sendGdbCommand("kill");
  };

  private onStepOver = () => {
    window.ipcToMain.sendGdbCommand("next");
  };

  private onStepIn = () => {
    window.ipcToMain.sendGdbCommand("step");
  };

  private onStepOut = () => {
    window.ipcToMain.sendGdbCommand("finish");
  };

  private onConnectionManager = () => {
    this.state.connectionsRef?.current?.ShowDialog();
  };

  private onSettings = () => {
    this.state.settingsRef?.current?.ShowDialog();
  };

  override render() {
    return (
      <ToolbarComponent id="toolbar">
        <ItemsDirective>
          <ItemDirective
            click={this.onContinue}
            prefixIcon="tb-icon tb-go"
            tooltipText="Continue"
            text="Continue"
          />
          <ItemDirective
            click={this.onPause}
            prefixIcon="tb-icon tb-pause"
            tooltipText="Pause"
            text="Pause"
          />
          <ItemDirective
            click={this.onStop}
            prefixIcon="tb-icon tb-stop"
            tooltipText="Stop"
            text="Stop"
          />
          <ItemDirective type="Separator" />
          <ItemDirective
            click={this.onStepOver}
            prefixIcon="tb-icon tb-step-over"
            tooltipText="Step Over"
            text="Step Over"
          />
          <ItemDirective
            click={this.onStepIn}
            prefixIcon="tb-icon tb-step-in"
            tooltipText="Step In"
            text="Step In"
          />
          <ItemDirective
            click={this.onStepOut}
            prefixIcon="tb-icon tb-step-out"
            tooltipText="Step Out"
            text="Step Out"
          />
          <ItemDirective type="Separator" />
          <ItemDirective
            click={this.onConnectionManager}
            prefixIcon="tb-icon tb-connect"
            tooltipText="Connection Manager"
            text="Connections"
          />
          <ItemDirective
            click={this.onSettings}
            prefixIcon="tb-icon tb-settings"
            tooltipText="Settings"
            text="Settings"
          />
          <ItemDirective type="Separator" />
          <ItemDirective prefixIcon="tb-icon tb-python" tooltipText="Python Editor" text="Python" />
        </ItemsDirective>
      </ToolbarComponent>
    );
  }
}
