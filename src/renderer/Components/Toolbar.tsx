import { ItemDirective, ItemsDirective, ToolbarComponent } from "@syncfusion/ej2-react-navigations";
import { ItemModel, SplitButtonComponent } from "@syncfusion/ej2-react-splitbuttons";
import { Component, JSX, RefObject } from "react";
import type { ConnectionManagerHandle } from "../Dialogs/ConnectionManager";
import type { SettingsHandle } from "../Dialogs/Settings";

import { GdbAny } from "../../common/gdb-common";
import { dockMenuConnector } from "../App";
import "./ToolBar.css";

type RevealToolbarProps = {
  connectionsRef?: RefObject<ConnectionManagerHandle> | null;
  settingsRef?: RefObject<SettingsHandle> | null;
};

type RevealToolbarState = {
  connectionsRef?: RefObject<ConnectionManagerHandle> | null;
  settingsRef?: RefObject<SettingsHandle> | null;
  items: ItemModel[];
};

export default class RevealToolbar extends Component<RevealToolbarProps, RevealToolbarState> {
  constructor(props: RevealToolbarProps) {
    super(props);
    this.state = {
      connectionsRef: props.connectionsRef,
      settingsRef: props.settingsRef,
      items: [],
    };
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

  override componentDidMount(): void {
    window.addEventListener("update-window-list", () => {
      this.FillWindowList();
    });
  }

  public FillWindowList(): void {
    dockMenuConnector?.reconsilePanels();
    const winList = dockMenuConnector?.getPanelList();
    const menuItems: ItemModel[] = [];
    winList?.forEach((win) => {
      const i = {
        text: win.displayName,
        iconCss: `${win.iconCss} wm-icon ${
          !win.panel?.isDialog ? "wm-icon-visible" : "wm-icon-hidden"
        }`,
      };
      menuItems.push(i);
    });
    this.setState({ items: menuItems });
  }

  private onSelectWindow = (args: GdbAny) => {
    //console.log(`Selected Window: ${args.item.properties.text}`);
    window.dispatchEvent(new CustomEvent("toggle-window", { detail: args.item.properties.text }));
  };

  private onOpenWindow = () => {
    dockMenuConnector?.reconsilePanels();
  };

  override render(): JSX.Element {
    return (
      <div className="flex-container-row">
        <ToolbarComponent id="toolbar" className="flex-item-grow">
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
            <ItemDirective
              prefixIcon="tb-icon tb-python"
              tooltipText="Python Editor"
              text="Python"
            />
          </ItemsDirective>
        </ToolbarComponent>
        <SplitButtonComponent
          className="flex-item-grow"
          items={this.state.items}
          content="Windows"
          select={this.onSelectWindow}
          open={this.onOpenWindow}
        />
      </div>
    );
  }
}
