/**
 * Provides toolbar controller hook and supporting types for RevealToolbar.
 *
 * @remarks
 * Extracted from Toolbar.tsx to keep the component under the function-length limit.
 */
import type { ItemModel as SplitItemModel } from "@syncfusion/ej2-splitbuttons";
import type { RefObject } from "react";
import { useCallback, useEffect, useState } from "react";
import type { GdbAny } from "../../common/gdb-common";
import type { WhileConnectingDialogHandle } from "../Dialogs/ConnectionDialog";
import type { ConnectionManagerHandle } from "../Dialogs/ConnectionManager";
import type { SettingsHandle } from "../Dialogs/Settings";
import { dockMenuConnector } from "../utilities/dock-menu-state";
import { TOGGLE_WINDOW, UPDATE_WINDOW_LIST } from "../utilities/renderer-events";

/** Props for RevealToolbar component */
export type RevealToolbarProps = {
  /** Reference to connection manager dialog for imperative access */
  connectionsRef?: RefObject<ConnectionManagerHandle> | null;
  /** Reference to while-connecting dialog for imperative access */
  whileConnectingRef?: RefObject<WhileConnectingDialogHandle> | null;
  /** Reference to settings dialog for imperative access */
  settingsRef?: RefObject<SettingsHandle> | null;
};

/** All handlers and state returned by useToolbarController */
export type ToolbarController = {
  items: SplitItemModel[];
  disconnectAvailable: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onContinue: () => void;
  onPause: () => void;
  onStop: () => void;
  onStepOver: () => void;
  onStepIn: () => void;
  onStepOut: () => void;
  onConnectionManager: () => void;
  onSettings: () => void;
  onSelectWindow: (args: GdbAny) => void;
  onOpenWindow: () => void;
};

function createToolbarHandlers({
  connectionsRef,
  whileConnectingRef,
  settingsRef,
}: RevealToolbarProps) {
  return {
    onConnect: () => whileConnectingRef?.current?.ShowDialog(),
    onDisconnect: () => window.ipcToMain.commands.app.notifyMain({ command: "cancel-connection" }),
    onContinue: () => window.ipcToMain.commands.debugger.sendGdbCommand("continue"),
    onPause: () => window.ipcToMain.commands.debugger.sendGdbCommand("signal SIGINT"),
    onStop: () => window.ipcToMain.commands.debugger.sendGdbCommand("kill"),
    onStepOver: () => window.ipcToMain.commands.debugger.sendGdbCommand("next"),
    onStepIn: () => window.ipcToMain.commands.debugger.sendGdbCommand("step"),
    onStepOut: () => window.ipcToMain.commands.debugger.sendGdbCommand("finish"),
    onConnectionManager: () => connectionsRef?.current?.ShowDialog(),
    onSettings: () => settingsRef?.current?.ShowDialog(),
    onSelectWindow: (args: GdbAny) =>
      window.dispatchEvent(new CustomEvent(TOGGLE_WINDOW, { detail: args.item.properties.text })),
    onOpenWindow: () => dockMenuConnector?.reconsilePanels(),
  };
}

export function useToolbarController({
  connectionsRef,
  whileConnectingRef,
  settingsRef,
}: RevealToolbarProps): ToolbarController {
  const [disconnectAvailable, setDisconnectAvailable] = useState(false);

  const buildWindowItems = useCallback((): SplitItemModel[] => {
    dockMenuConnector?.reconsilePanels();
    const winList = dockMenuConnector?.getPanelList();
    const menuItems: SplitItemModel[] = [];
    winList?.forEach((win) => {
      menuItems.push({
        text: win.displayName,
        iconCss: `${win.iconCss} wm-icon ${!win.panel?.isDialog ? "wm-icon-visible" : "wm-icon-hidden"}`,
      });
    });
    return menuItems;
  }, []);

  useEffect(() => {
    window.ipcToMain.notifications.render((msg: GdbAny) => {
      switch (msg.command) {
        case "connection-started":
        case "connection-success":
          setDisconnectAvailable(true);
          break;
        case "connection-failed":
        case "cancel-connection":
          setDisconnectAvailable(false);
          break;
      }
    });
  }, []);

  const [items, setItems] = useState<SplitItemModel[]>(() => buildWindowItems());

  const fillWindowList = useCallback((): void => {
    setItems(buildWindowItems());
  }, [buildWindowItems]);

  useEffect(() => {
    const handleUpdateWindowList = () => {
      fillWindowList();
    };
    window.addEventListener(UPDATE_WINDOW_LIST, handleUpdateWindowList);
    return () => {
      window.removeEventListener(UPDATE_WINDOW_LIST, handleUpdateWindowList);
    };
  }, [fillWindowList]);

  return {
    items,
    disconnectAvailable,
    ...createToolbarHandlers({ connectionsRef, whileConnectingRef, settingsRef }),
  };
}
