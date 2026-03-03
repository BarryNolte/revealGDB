/**
 * Application toolbar component for RevealGDB.
 *
 * Provides the main toolbar with:
 * - GDB connection/disconnection controls
 * - Debug execution controls (Continue, Pause, Stop)
 * - Step controls (Step In, Over, Out)
 * - Settings and connection management buttons
 * - Window visibility toggle dropdown
 *
 * The toolbar integrates with the dock manager to show/hide debugger windows
 * and communicates with the main process to send GDB commands.
 */

import { ItemDirective, ItemsDirective, ToolbarComponent } from "@syncfusion/ej2-react-navigations";
import { ItemModel, SplitButtonComponent } from "@syncfusion/ej2-react-splitbuttons";
import { Component, JSX, RefObject } from "react";
import type { ConnectionManagerHandle } from "../Dialogs/ConnectionManager";
import type { SettingsHandle } from "../Dialogs/Settings";

import { GdbAny } from "../../common/gdb-common";
import { dockMenuConnector } from "../App";
import "./ToolBar.css";

/** Props for RevealToolbar component */
type RevealToolbarProps = {
  /** Reference to connection manager dialog for imperative access */
  connectionsRef?: RefObject<ConnectionManagerHandle> | null;
  /** Reference to settings dialog for imperative access */
  settingsRef?: RefObject<SettingsHandle> | null;
};

/** State for RevealToolbar component */
type RevealToolbarState = {
  connectionsRef?: RefObject<ConnectionManagerHandle> | null;
  settingsRef?: RefObject<SettingsHandle> | null;
  /** List of window menu items with visibility state */
  items: ItemModel[];
};

/**
 * Main toolbar component.
 * Class-based component that manages toolbar state and handles user interactions.
 */
export default class RevealToolbar extends Component<RevealToolbarProps, RevealToolbarState> {
  constructor(props: RevealToolbarProps) {
    super(props);
    this.state = {
      connectionsRef: props.connectionsRef,
      settingsRef: props.settingsRef,
      items: [],
    };
  }

  // ========================================================================
  // GDB Control Commands
  // ========================================================================

  /** Initiates GDB connection (placeholder) */
  private onConnect = () => {};

  /** Terminates GDB connection (placeholder) */
  private onDisconnect = () => {};

  /**
   * Resumes program execution.
   * Sends GDB 'continue' command to resume all threads.
   */
  private onContinue = () => {
    window.ipcToMain.sendGdbCommand("continue");
  };

  /**
   * Pauses program execution.
   * Sends SIGINT signal to interrupt the running program.
   */
  private onPause = () => {
    window.ipcToMain.sendGdbCommand("signal SIGINT");
  };

  /**
   * Stops program execution.
   * Sends GDB 'kill' command to terminate the inferior process.
   */
  private onStop = () => {
    window.ipcToMain.sendGdbCommand("kill");
  };

  /**
   * Steps over the current line.
   * Executes the current source line, stepping over function calls.
   */
  private onStepOver = () => {
    window.ipcToMain.sendGdbCommand("next");
  };

  /**
   * Steps into the current line.
   * Enters function calls if present, otherwise behaves like step over.
   */
  private onStepIn = () => {
    window.ipcToMain.sendGdbCommand("step");
  };

  /**
   * Steps out of the current function.
   * Continues execution until the current function returns.
   */
  private onStepOut = () => {
    window.ipcToMain.sendGdbCommand("finish");
  };

  // ========================================================================
  // Dialog Display Handlers
  // ========================================================================

  /**
   * Opens the connection manager dialog.
   * Allows user to configure and manage GDB connections.
   */
  private onConnectionManager = () => {
    this.state.connectionsRef?.current?.ShowDialog();
  };

  /**
   * Opens the settings dialog.
   * Allows user to configure application settings and preferences.
   */
  private onSettings = () => {
    this.state.settingsRef?.current?.ShowDialog();
  };

  // ========================================================================
  // Lifecycle and Window Management
  // ========================================================================

  /**
   * Component lifecycle: Setup event listeners after mount.
   * Listens for window list updates triggered by dock layout changes.
   */
  override componentDidMount(): void {
    window.addEventListener("update-window-list", () => {
      this.FillWindowList();
    });
  }

  /**
   * Populates the window dropdown menu with current dock panels.
   * Updates visibility icons based on whether panels are docked or hidden.
   * Called on layout changes and when windows are toggled.
   */
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

  /**
   * Handles window selection from the dropdown menu.
   * Toggles the visibility of the selected panel.
   */
  private onSelectWindow = (args: GdbAny) => {
    // Dispatch custom event to toggle window visibility
    window.dispatchEvent(new CustomEvent("toggle-window", { detail: args.item.properties.text }));
  };

  /**
   * Refreshes panel state when window dropdown is opened.
   * Ensures the menu reflects current dock layout state.
   */
  private onOpenWindow = () => {
    dockMenuConnector?.reconsilePanels();
  };

  override render(): JSX.Element {
    return (
      <div className="flex-container-row">
        <ToolbarComponent id="toolbar" className="flex-item-grow">
          <ItemsDirective>
            <ItemDirective
              click={this.onConnect}
              prefixIcon="tb-icon tb-connected"
              tooltipText="Connect"
              text="Connect"
            />
            <ItemDirective
              click={this.onDisconnect}
              prefixIcon="tb-icon tb-disconnected"
              tooltipText="Disconnect"
              text="Disconnect"
            />
            <ItemDirective type="Separator" />
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
            {/* <ItemDirective type="Separator" /> */}
            {/* <ItemDirective
              prefixIcon="tb-icon tb-python"
              tooltipText="Python Editor"
              text="Python"
            /> */}
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
