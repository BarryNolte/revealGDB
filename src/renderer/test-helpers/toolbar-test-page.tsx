/**
 * Implements toolbar-test-page for revealGDB.
 *
 * @remarks
 * Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import type { JSX, RefObject } from "react";
import type { NotifyRenderMessage } from "../../common/ipc-contracts";
import RevealToolbar from "../Components/Toolbar";
import type { WhileConnectingDialogHandle } from "../Dialogs/ConnectionDialog";
import type { ConnectionManagerHandle } from "../Dialogs/ConnectionManager";
import type { SettingsHandle } from "../Dialogs/Settings";
import { setDockMenuConnector } from "../utilities/dock-menu-state";
import { DockMenuConnector } from "../utilities/DockMenuConnector";
import { UPDATE_WINDOW_LIST } from "../utilities/renderer-events";
import { initIpcMock, setIpcFullLegacyAliases } from "./ipc-test-setup";
import "./toolbar-test-page.css";

type ToolbarWindowSettings = {
  displayName: string;
  iconCss: string;
  hidden?: boolean;
};

type ToolbarTestSettings = {
  windows: ToolbarWindowSettings[];
};

type ToolbarTestApi = {
  emitNotifyRender: (message: { command: string }) => void;
  getDialogCalls: () => { connections: number; whileConnecting: number; settings: number };
  getNotifyMainCalls: () => Array<{ command?: string; data?: unknown }>;
  getReconcileCount: () => number;
  getSentCommands: () => string[];
  getToggleWindowEvents: () => string[];
  setWindows: (windows: ToolbarWindowSettings[]) => void;
  dispatchWindowListUpdate: () => void;
  reset: () => void;
};

type WindowWithToolbarTestApi = Window & {
  __TOOLBAR_TEST_SETTINGS__?: ToolbarTestSettings;
  __TOOLBAR_TEST_API__?: ToolbarTestApi;
};

const dialogCalls = {
  connections: 0,
  whileConnecting: 0,
  settings: 0,
};

const toolbarRefs: {
  connectionsRef: RefObject<ConnectionManagerHandle>;
  whileConnectingRef: RefObject<WhileConnectingDialogHandle>;
  settingsRef: RefObject<SettingsHandle>;
} = {
  connectionsRef: {
    current: {
      ShowDialog: () => {
        dialogCalls.connections += 1;
      },
    } as ConnectionManagerHandle,
  },
  whileConnectingRef: {
    current: {
      ShowDialog: () => {
        dialogCalls.whileConnecting += 1;
      },
    } as WhileConnectingDialogHandle,
  },
  settingsRef: {
    current: {
      ShowDialog: () => {
        dialogCalls.settings += 1;
      },
    } as SettingsHandle,
  },
};
/**
 * Performs getConfiguredWindows as part of this module's internal workflow.
 *
 * @returns The computed result produced by this operation.
 */

function getConfiguredWindows(): ToolbarWindowSettings[] {
  const settings = (window as WindowWithToolbarTestApi).__TOOLBAR_TEST_SETTINGS__;

  return (
    settings?.windows ?? [
      { displayName: "Source", iconCss: "wm-source" },
      { displayName: "Command", iconCss: "wm-command", hidden: true },
    ]
  );
}
/**
 * Performs setupToolbarTestApi as part of this module's internal workflow.
 *
 * @returns The computed result produced by this operation.
 */

export function setupToolbarTestApi(): void {
  let notifyRenderHandler: ((message: NotifyRenderMessage) => void) | undefined;
  let windows = getConfiguredWindows();
  let reconcileCount = 0;
  const sentCommands: string[] = [];
  const toggleWindowEvents: string[] = [];
  const notifyMainCalls: Array<{ command?: string; data?: unknown }> = [];

  const ipc = initIpcMock();

  ipc.notifications.render = (callback) => {
    notifyRenderHandler = callback;
    return () => {
      notifyRenderHandler = undefined;
    };
  };
  ipc.commands.debugger.sendGdbCommand = (command) => {
    if (typeof command === "string") sentCommands.push(command);
    return Promise.resolve();
  };
  ipc.commands.app.notifyMain = (message) => {
    notifyMainCalls.push({
      command: message?.command,
      data: message?.data,
    });
  };

  setIpcFullLegacyAliases(ipc);

  setDockMenuConnector({
    reconsilePanels: () => {
      reconcileCount += 1;
    },
    getPanelList: () =>
      windows.map((windowItem) => ({
        displayName: windowItem.displayName,
        iconCss: windowItem.iconCss,
        panel: { isDialog: windowItem.hidden ?? false },
      })),
  } as unknown as DockMenuConnector);

  window.addEventListener("toggle-window", (event: Event) => {
    toggleWindowEvents.push((event as CustomEvent<string>).detail);
  });

  (window as WindowWithToolbarTestApi).__TOOLBAR_TEST_API__ = {
    emitNotifyRender: (message) => notifyRenderHandler?.(message as NotifyRenderMessage),
    getDialogCalls: () => ({ ...dialogCalls }),
    getNotifyMainCalls: () => notifyMainCalls.slice(),
    getReconcileCount: () => reconcileCount,
    getSentCommands: () => sentCommands.slice(),
    getToggleWindowEvents: () => toggleWindowEvents.slice(),
    setWindows: (nextWindows) => {
      windows = nextWindows.slice();
      (window as WindowWithToolbarTestApi).__TOOLBAR_TEST_SETTINGS__ = { windows };
    },
    dispatchWindowListUpdate: () => {
      window.dispatchEvent(new Event(UPDATE_WINDOW_LIST));
    },
    reset: () => {
      sentCommands.length = 0;
      toggleWindowEvents.length = 0;
      notifyMainCalls.length = 0;
      reconcileCount = 0;
      dialogCalls.connections = 0;
      dialogCalls.whileConnecting = 0;
      dialogCalls.settings = 0;
      windows = getConfiguredWindows();
      (window as WindowWithToolbarTestApi).__TOOLBAR_TEST_SETTINGS__ = { windows };
    },
  };
}
/**
 * Performs ToolbarTestPage as part of this module's internal workflow.
 *
 * @returns The computed result produced by this operation.
 */

export function ToolbarTestPage(): JSX.Element {
  return (
    <div className="toolbar-test-container" data-testid="toolbar-test-page">
      <RevealToolbar
        connectionsRef={toolbarRefs.connectionsRef}
        whileConnectingRef={toolbarRefs.whileConnectingRef}
        settingsRef={toolbarRefs.settingsRef}
      />
    </div>
  );
}
