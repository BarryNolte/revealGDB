import type { JSX } from "react";
import { useEffect, useRef } from "react";
import { ConnectionDialog, type WhileConnectingDialogHandle } from "../Dialogs/ConnectionDialog";
import "./connectiondialog-test-page.css";

type TestConnection = {
  name: string;
  shell: string;
  commands: string[];
  wslDistribution?: string;
};

type ConnectionDialogSettings = {
  connections: TestConnection[];
  lastUsedConnection?: string | null;
};

type NotifyMainCall = {
  command?: string;
  data?: unknown;
};

type ConnectionDialogTestApi = {
  getNotifyMainCalls: () => NotifyMainCall[];
  reset: () => void;
  showDialog: () => void;
  hideDialog: () => void;
  selectConnection: (name: string) => void;
};

type WindowWithConnectionDialogTest = Window & {
  __CONNECTION_DIALOG_TEST_SETTINGS__?: ConnectionDialogSettings;
  __CONNECTION_DIALOG_TEST_API__?: ConnectionDialogTestApi;
};

const defaultSettings: ConnectionDialogSettings = {
  connections: [
    { name: "Bash Session", shell: "bash", commands: ["gdb"] },
    { name: "WSL Session", shell: "wsl", commands: ["gdb"], wslDistribution: "Ubuntu" },
  ],
};

let showDialogImpl: () => void = () => undefined;
let hideDialogImpl: () => void = () => undefined;

export function setupConnectionDialogTestApi(): void {
  const ipc = window.ipcToMain ?? ({} as Window["ipcToMain"]);
  if (!window.ipcToMain) {
    Object.defineProperty(window, "ipcToMain", {
      value: ipc,
      configurable: true,
      writable: true,
    });
  }

  const notifyMainCalls: NotifyMainCall[] = [];

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
      getSettings: () => Promise.resolve(defaultSettings),
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

  ipc.queries.app.getSettings = () => {
    const settings = (window as WindowWithConnectionDialogTest).__CONNECTION_DIALOG_TEST_SETTINGS__;
    return Promise.resolve({
      ...defaultSettings,
      ...(settings ?? {}),
      connections: settings?.connections ?? defaultSettings.connections,
    });
  };
  ipc.getSettings = ipc.queries.app.getSettings;

  ipc.commands.app.notifyMain = (message) => {
    notifyMainCalls.push({
      command: message?.command,
      data: message?.data,
    });

    if (message?.command === "save-last-used-connection") {
      const currentSettings = (window as WindowWithConnectionDialogTest)
        .__CONNECTION_DIALOG_TEST_SETTINGS__;
      (window as WindowWithConnectionDialogTest).__CONNECTION_DIALOG_TEST_SETTINGS__ = {
        ...defaultSettings,
        ...(currentSettings ?? {}),
        connections: currentSettings?.connections ?? defaultSettings.connections,
        lastUsedConnection: (message.data as string | null | undefined) ?? undefined,
      };
    }
  };
  ipc.notifyMain = ipc.commands.app.notifyMain;
  ipc.sendGdbCommand = ipc.commands.debugger.sendGdbCommand;

  (window as WindowWithConnectionDialogTest).__CONNECTION_DIALOG_TEST_API__ = {
    getNotifyMainCalls: () => notifyMainCalls.slice(),
    reset: () => {
      notifyMainCalls.length = 0;
    },
    showDialog: () => {
      showDialogImpl();
    },
    hideDialog: () => {
      hideDialogImpl();
    },
    selectConnection: (name: string) => {
      const comboElement = document.getElementById("definedConnections") as
        | (HTMLElement & {
            ej2_instances?: Array<{
              value: string;
              dataBind: () => void;
              trigger: (eventName: string, args: unknown) => void;
            }>;
          })
        | null;
      const combo = comboElement?.ej2_instances?.[0];
      if (!combo) {
        return;
      }

      const settings = (window as WindowWithConnectionDialogTest)
        .__CONNECTION_DIALOG_TEST_SETTINGS__;
      const availableConnections = settings?.connections ?? defaultSettings.connections;
      const selectedConnection = availableConnections.find(
        (connection) => connection.name === name,
      );

      combo.value = name;
      combo.dataBind();
      combo.trigger("change", {
        itemData: selectedConnection,
      });
    },
  };
}

export function ConnectionDialogTestPage(): JSX.Element {
  const dialogRef = useRef<WhileConnectingDialogHandle>(null);

  useEffect(() => {
    showDialogImpl = () => {
      dialogRef.current?.ShowDialog();
    };
    hideDialogImpl = () => {
      dialogRef.current?.HideDialog();
    };

    dialogRef.current?.ShowDialog();
  }, []);

  return (
    <div className="connection-dialog-test-container" data-testid="connection-dialog-test-page">
      <ConnectionDialog ref={dialogRef} />
    </div>
  );
}
