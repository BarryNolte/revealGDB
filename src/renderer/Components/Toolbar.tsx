/**
 * Defines the toolbar renderer component and supporting presentation logic.
 *
 * @remarks
 * Exported symbols include `RevealToolbar`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { ItemDirective, ItemsDirective, ToolbarComponent } from "@syncfusion/ej2-react-navigations";
import { ItemModel, SplitButtonComponent } from "@syncfusion/ej2-react-splitbuttons";
import { JSX, RefObject, useCallback, useEffect, useMemo, useState } from "react";
import type { WhileConnectingDialogHandle } from "../Dialogs/ConnectionDialog";
import type { ConnectionManagerHandle } from "../Dialogs/ConnectionManager";
import type { SettingsHandle } from "../Dialogs/Settings";

import { GdbAny } from "../../common/gdb-common";
import { dockMenuConnector } from "../utilities/dock-menu-state";
import "./Toolbar.css";

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
 * Performs reveal toolbar as part of this module's public API.
 *
 * @param param1 - Value for `param1` consumed by this operation.
 * @returns The computed result produced by this operation.
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
    window.ipcToMain.notifications.render((msg: GdbAny) => {
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

  /**
   * Performs on connect as part of this module's internal workflow.
   */
  const onConnect = () => {
    whileConnectingRef?.current?.ShowDialog();
  };

  /**
   * Performs on disconnect as part of this module's internal workflow.
   */
  const onDisconnect = () => {
    window.ipcToMain.commands.app.notifyMain({
      command: "cancel-connection",
    });
  };

  /**
   * Performs on continue as part of this module's internal workflow.
   */
  const onContinue = () => {
    window.ipcToMain.commands.debugger.sendGdbCommand("continue");
  };

  /**
   * Performs on pause as part of this module's internal workflow.
   */
  const onPause = () => {
    window.ipcToMain.commands.debugger.sendGdbCommand("signal SIGINT");
  };

  /**
   * Performs on stop as part of this module's internal workflow.
   */
  const onStop = () => {
    window.ipcToMain.commands.debugger.sendGdbCommand("kill");
  };

  /**
   * Performs on step over as part of this module's internal workflow.
   */
  const onStepOver = () => {
    window.ipcToMain.commands.debugger.sendGdbCommand("next");
  };

  /**
   * Performs on step in as part of this module's internal workflow.
   */
  const onStepIn = () => {
    window.ipcToMain.commands.debugger.sendGdbCommand("step");
  };

  /**
   * Performs on step out as part of this module's internal workflow.
   */
  const onStepOut = () => {
    window.ipcToMain.commands.debugger.sendGdbCommand("finish");
  };

  // ========================================================================
  // Dialog Display Handlers
  // ========================================================================

  /**
   * Performs on connection manager as part of this module's internal workflow.
   */
  const onConnectionManager = () => {
    connectionsRef?.current?.ShowDialog();
  };

  /**
   * Performs on settings as part of this module's internal workflow.
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
    /**
     * Performs handle update window list as part of this module's internal workflow.
     */
    const handleUpdateWindowList = () => {
      fillWindowList();
    };

    window.addEventListener("update-window-list", handleUpdateWindowList);
    return () => {
      window.removeEventListener("update-window-list", handleUpdateWindowList);
    };
  }, [fillWindowList]);

  /**
   * Performs on select window as part of this module's internal workflow.
   *
   * @param args - Configuration values that control how this operation executes.
   */
  const onSelectWindow = (args: GdbAny) => {
    // Dispatch custom event to toggle window visibility
    window.dispatchEvent(new CustomEvent("toggle-window", { detail: args.item.properties.text }));
  };

  /**
   * Performs on open window as part of this module's internal workflow.
   */
  const onOpenWindow = () => {
    dockMenuConnector?.reconsilePanels();
  };

  return (
    <div className="flex-container-row" data-testid="toolbar-root">
      <ToolbarComponent id="toolbar" className="flex-item-grow">
        <ItemsDirective>
          <ItemDirective
            id="toolbar-connect"
            click={onConnect}
            prefixIcon="tb-icon tb-connected"
            tooltipText="Connect"
            text="Connect"
            disabled={disconnectAvailable}
          />
          <ItemDirective
            id="toolbar-disconnect"
            click={onDisconnect}
            prefixIcon="tb-icon tb-disconnected"
            tooltipText="Disconnect"
            text="Disconnect"
            disabled={!disconnectAvailable}
          />
          <ItemDirective type="Separator" />
          <ItemDirective
            id="toolbar-continue"
            click={onContinue}
            prefixIcon="tb-icon tb-go"
            tooltipText="Continue"
            text="Continue"
            disabled={!disconnectAvailable}
          />
          <ItemDirective
            id="toolbar-pause"
            click={onPause}
            prefixIcon="tb-icon tb-pause"
            tooltipText="Pause"
            text="Pause"
            disabled={!disconnectAvailable}
          />
          <ItemDirective
            id="toolbar-stop"
            click={onStop}
            prefixIcon="tb-icon tb-stop"
            tooltipText="Stop"
            text="Stop"
            disabled={!disconnectAvailable}
          />
          <ItemDirective type="Separator" />
          <ItemDirective
            id="toolbar-step-over"
            click={onStepOver}
            prefixIcon="tb-icon tb-step-over"
            tooltipText="Step Over"
            text="Step Over"
            disabled={!disconnectAvailable}
          />
          <ItemDirective
            id="toolbar-step-in"
            click={onStepIn}
            prefixIcon="tb-icon tb-step-in"
            tooltipText="Step In"
            text="Step In"
            disabled={!disconnectAvailable}
          />
          <ItemDirective
            id="toolbar-step-out"
            click={onStepOut}
            prefixIcon="tb-icon tb-step-out"
            tooltipText="Step Out"
            text="Step Out"
            disabled={!disconnectAvailable}
          />
          <ItemDirective type="Separator" />
          <ItemDirective
            id="toolbar-connections"
            click={onConnectionManager}
            prefixIcon="tb-icon tb-connect"
            tooltipText="Connection Manager"
            text="Connections"
          />
          <ItemDirective
            id="toolbar-settings"
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
        id="toolbar-window-menu"
        className="flex-item-grow"
        items={items}
        content="Windows"
        select={onSelectWindow}
        open={onOpenWindow}
      />
    </div>
  );
}
