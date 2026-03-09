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
import { JSX, RefObject, useCallback, useEffect, useMemo, useState } from "react";
import type { WhileConnectingDialogHandle } from "../Dialogs/ConnectionDialog";
import type { ConnectionManagerHandle } from "../Dialogs/ConnectionManager";
import type { SettingsHandle } from "../Dialogs/Settings";

import { GdbAny } from "../../common/gdb-common";
import { dockMenuConnector } from "../App";
import "./ToolBar.css";

/** Props for RevealToolbar component */
type RevealToolbarProps = {
  /** Reference to connection manager dialog for imperative access */
  connectionsRef?: RefObject<ConnectionManagerHandle> | null;
  /** Reference to while-connecting dialog for imperative access */
  whileConnectingRef?: RefObject<WhileConnectingDialogHandle> | null;
  /** Reference to settings dialog for imperative access */
  settingsRef?: RefObject<SettingsHandle> | null;
};

/**
 * Main toolbar component.
 * Function-based component that manages toolbar state and handles user interactions.
 */
export default function RevealToolbar({
  connectionsRef,
  whileConnectingRef,
  settingsRef,
}: RevealToolbarProps): JSX.Element {
  const [disconnectAvailable, setDisconnectAvailable] = useState(false);

  const buildWindowItems = useCallback((): ItemModel[] => {
    dockMenuConnector?.reconsilePanels();
    const winList = dockMenuConnector?.getPanelList();
    const menuItems: ItemModel[] = [];
    winList?.forEach((win) => {
      menuItems.push({
        text: win.displayName,
        iconCss: `${win.iconCss} wm-icon ${
          !win.panel?.isDialog ? "wm-icon-visible" : "wm-icon-hidden"
        }`,
      });
    });
    return menuItems;
  }, []);

  useMemo(() => {
    window.ipcToMain.notifyRender((msg: GdbAny) => {
      switch (msg.command) {
        case "connection-started":
          {
            setDisconnectAvailable(true);
          }
          break;
        case "connection-success":
          {
            setDisconnectAvailable(true);
          }
          break;
        case "connection-failed":
          {
            setDisconnectAvailable(false);
          }
          break;
        case "cancel-connection": {
          setDisconnectAvailable(false);
        }
      }
    });
  }, []);

  const [items, setItems] = useState<ItemModel[]>(() => buildWindowItems());

  // ========================================================================
  // GDB Control Commands
  // ========================================================================

  /** Initiates GDB connection and shows connection progress dialog */
  const onConnect = () => {
    whileConnectingRef?.current?.ShowDialog();
  };

  /** Terminates GDB connection (placeholder) */
  const onDisconnect = () => {
    window.ipcToMain.notifyMain({
      command: "cancel-connection",
    });
  };

  /**
   * Resumes program execution.
   * Sends GDB 'continue' command to resume all threads.
   */
  const onContinue = () => {
    window.ipcToMain.sendGdbCommand("continue");
  };

  /**
   * Pauses program execution.
   * Sends SIGINT signal to interrupt the running program.
   */
  const onPause = () => {
    window.ipcToMain.sendGdbCommand("signal SIGINT");
  };

  /**
   * Stops program execution.
   * Sends GDB 'kill' command to terminate the inferior process.
   */
  const onStop = () => {
    window.ipcToMain.sendGdbCommand("kill");
  };

  /**
   * Steps over the current line.
   * Executes the current source line, stepping over function calls.
   */
  const onStepOver = () => {
    window.ipcToMain.sendGdbCommand("next");
  };

  /**
   * Steps into the current line.
   * Enters function calls if present, otherwise behaves like step over.
   */
  const onStepIn = () => {
    window.ipcToMain.sendGdbCommand("step");
  };

  /**
   * Steps out of the current function.
   * Continues execution until the current function returns.
   */
  const onStepOut = () => {
    window.ipcToMain.sendGdbCommand("finish");
  };

  // ========================================================================
  // Dialog Display Handlers
  // ========================================================================

  /**
   * Opens the connection manager dialog.
   * Allows user to configure and manage GDB connections.
   */
  const onConnectionManager = () => {
    connectionsRef?.current?.ShowDialog();
  };

  /**
   * Opens the settings dialog.
   * Allows user to configure application settings and preferences.
   */
  const onSettings = () => {
    settingsRef?.current?.ShowDialog();
  };

  // ========================================================================
  // Lifecycle and Window Management
  // ========================================================================

  /**
   * Component lifecycle: Setup event listeners after mount.
   * Listens for window list updates triggered by dock layout changes.
   */
  const fillWindowList = useCallback((): void => {
    setItems(buildWindowItems());
  }, [buildWindowItems]);

  /**
   * Populates the window dropdown menu with current dock panels.
   * Updates visibility icons based on whether panels are docked or hidden.
   * Called on layout changes and when windows are toggled.
   */
  useEffect(() => {
    const handleUpdateWindowList = () => {
      fillWindowList();
    };

    window.addEventListener("update-window-list", handleUpdateWindowList);
    return () => {
      window.removeEventListener("update-window-list", handleUpdateWindowList);
    };
  }, [fillWindowList]);

  /**
   * Handles window selection from the dropdown menu.
   * Toggles the visibility of the selected panel.
   */
  const onSelectWindow = (args: GdbAny) => {
    // Dispatch custom event to toggle window visibility
    window.dispatchEvent(new CustomEvent("toggle-window", { detail: args.item.properties.text }));
  };

  /**
   * Refreshes panel state when window dropdown is opened.
   * Ensures the menu reflects current dock layout state.
   */
  const onOpenWindow = () => {
    dockMenuConnector?.reconsilePanels();
  };

  return (
    <div className="flex-container-row">
      <ToolbarComponent id="toolbar" className="flex-item-grow">
        <ItemsDirective>
          <ItemDirective
            click={onConnect}
            prefixIcon="tb-icon tb-connected"
            tooltipText="Connect"
            text="Connect"
            disabled={disconnectAvailable}
          />
          <ItemDirective
            click={onDisconnect}
            prefixIcon="tb-icon tb-disconnected"
            tooltipText="Disconnect"
            text="Disconnect"
            disabled={!disconnectAvailable}
          />
          <ItemDirective type="Separator" />
          <ItemDirective
            click={onContinue}
            prefixIcon="tb-icon tb-go"
            tooltipText="Continue"
            text="Continue"
            disabled={!disconnectAvailable}
          />
          <ItemDirective
            click={onPause}
            prefixIcon="tb-icon tb-pause"
            tooltipText="Pause"
            text="Pause"
            disabled={!disconnectAvailable}
          />
          <ItemDirective
            click={onStop}
            prefixIcon="tb-icon tb-stop"
            tooltipText="Stop"
            text="Stop"
            disabled={!disconnectAvailable}
          />
          <ItemDirective type="Separator" />
          <ItemDirective
            click={onStepOver}
            prefixIcon="tb-icon tb-step-over"
            tooltipText="Step Over"
            text="Step Over"
            disabled={!disconnectAvailable}
          />
          <ItemDirective
            click={onStepIn}
            prefixIcon="tb-icon tb-step-in"
            tooltipText="Step In"
            text="Step In"
            disabled={!disconnectAvailable}
          />
          <ItemDirective
            click={onStepOut}
            prefixIcon="tb-icon tb-step-out"
            tooltipText="Step Out"
            text="Step Out"
            disabled={!disconnectAvailable}
          />
          <ItemDirective type="Separator" />
          <ItemDirective
            click={onConnectionManager}
            prefixIcon="tb-icon tb-connect"
            tooltipText="Connection Manager"
            text="Connections"
          />
          <ItemDirective
            click={onSettings}
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
        items={items}
        content="Windows"
        select={onSelectWindow}
        open={onOpenWindow}
      />
    </div>
  );
}
