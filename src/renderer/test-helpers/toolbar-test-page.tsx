import type { JSX, RefObject } from "react";
import type { GdbAny } from "../../common/gdb-common";
import type { WhileConnectingDialogHandle } from "../Dialogs/ConnectionDialog";
import type { ConnectionManagerHandle } from "../Dialogs/ConnectionManager";
import type { SettingsHandle } from "../Dialogs/Settings";
import RevealToolbar from "../Components/Toolbar";
import { setDockMenuConnector } from "../utilities/dock-menu-state";
import type { DockMenuConnector } from "../utilities/DockMenuConnector";
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

function getConfiguredWindows(): ToolbarWindowSettings[] {
  const settings = (window as WindowWithToolbarTestApi).__TOOLBAR_TEST_SETTINGS__;

  return (
    settings?.windows ?? [
      { displayName: "Source", iconCss: "wm-source" },
      { displayName: "Command", iconCss: "wm-command", hidden: true },
    ]
  );
}

export function setupToolbarTestApi(): void {
  let notifyRenderHandler: ((message: GdbAny) => void) | undefined;
  let windows = getConfiguredWindows();
  let reconcileCount = 0;
  const sentCommands: string[] = [];
  const toggleWindowEvents: string[] = [];
  const notifyMainCalls: Array<{ command?: string; data?: unknown }> = [];

  const ipc = window.ipcToMain ?? ({} as Window["ipcToMain"]);
  if (!window.ipcToMain) {
    Object.defineProperty(window, "ipcToMain", {
      value: ipc,
      configurable: true,
      writable: true,
    });
  }

  ipc.messages = {
    console: () => () => undefined,
    log: () => () => undefined,
    error: () => () => undefined,
    debug: () => () => undefined,
  };
  ipc.notifications = {
    connectionStatus: () => () => undefined,
    render: () => () => undefined,
    themeChanged: () => () => undefined,
  };
  ipc.debuggerData = {
    registers: () => () => undefined,
    stackFrames: () => () => undefined,
    sourceFile: () => () => undefined,
    locals: () => () => undefined,
    threads: () => () => undefined,
    breakpoints: () => () => undefined,
    memory: () => () => undefined,
    disassembly: () => () => undefined,
    functions: () => () => undefined,
  };
  ipc.queries = {
    app: {
      getSettings: () => Promise.resolve({}),
      getSystemFonts: () => Promise.resolve([]),
      getVersionInfo: () => Promise.resolve(new Map()),
    },
    environment: {
      getWslDistrobutions: () => Promise.resolve([]),
    },
    debugger: {
      getFunctionNames: () => Promise.resolve([]),
    },
  };
  ipc.commands = {
    debugger: {
      sendGdbCommand: () => undefined,
    },
    app: {
      notifyMain: () => undefined,
    },
  };

  ipc.notifications.render = (callback) => {
    notifyRenderHandler = callback;
    return () => {
      notifyRenderHandler = undefined;
    };
  };
  ipc.commands.debugger.sendGdbCommand = (command: string) => {
    sentCommands.push(command);
  };
  ipc.commands.app.notifyMain = (message) => {
    notifyMainCalls.push({
      command: message?.command,
      data: message?.data,
    });
  };

  ipc.consoleMessage = ipc.messages.console;
  ipc.logMessage = ipc.messages.log;
  ipc.errorMessage = ipc.messages.error;
  ipc.debugMessage = ipc.messages.debug;
  ipc.connectionStatus = ipc.notifications.connectionStatus;
  ipc.notifyRender = ipc.notifications.render;
  ipc.dataRegisters = ipc.debuggerData.registers;
  ipc.stackFrames = ipc.debuggerData.stackFrames;
  ipc.sourceFile = ipc.debuggerData.sourceFile;
  ipc.dataLocals = ipc.debuggerData.locals;
  ipc.dataThreads = ipc.debuggerData.threads;
  ipc.dataBrkPts = ipc.debuggerData.breakpoints;
  ipc.dataMemory = ipc.debuggerData.memory;
  ipc.dataDisasm = ipc.debuggerData.disassembly;
  ipc.dataFunctions = ipc.debuggerData.functions;
  ipc.getSettings = ipc.queries.app.getSettings;
  ipc.getSystemFonts = ipc.queries.app.getSystemFonts;
  ipc.getVersionInfo = ipc.queries.app.getVersionInfo;
  ipc.getWslDistrobutions = ipc.queries.environment.getWslDistrobutions;
  ipc.getFunctionNames = ipc.queries.debugger.getFunctionNames;
  ipc.sendGdbCommand = ipc.commands.debugger.sendGdbCommand;
  ipc.notifyMain = ipc.commands.app.notifyMain;

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
    emitNotifyRender: (message) => notifyRenderHandler?.(message),
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
      window.dispatchEvent(new Event("update-window-list"));
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
