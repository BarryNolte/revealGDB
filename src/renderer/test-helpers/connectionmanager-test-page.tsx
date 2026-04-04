import type { JSX } from "react";
import { useEffect, useRef } from "react";
import { ConnectionManager, type ConnectionManagerHandle } from "../Dialogs/ConnectionManager";
import "./connectionmanager-test-page.css";

type TestConnection = {
  name: string;
  shell: string;
  commands: string[];
  wslDistribution?: string;
};

type TestSettings = {
  connections: TestConnection[];
  wslDistros: string[];
};

type WindowWithConnectionManagerTest = Window & {
  __CONNECTION_MANAGER_TEST_SETTINGS__?: TestSettings;
  __CONNECTION_MANAGER_TEST_API__?: {
    getNotifyMainCalls: () => Array<{ command?: string; data?: unknown }>;
    reset: () => void;
  };
};

export function setupConnectionManagerTestApi(): void {
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
  ipc.getSystemFonts = ipc.queries.app.getSystemFonts;
  ipc.getVersionInfo = ipc.queries.app.getVersionInfo;
  const notifyMainCalls: Array<{ command?: string; data?: unknown }> = [];

  ipc.commands.app.notifyMain = (message) => {
    notifyMainCalls.push({
      command: message?.command,
      data: message?.data,
    });
  };
  ipc.notifyMain = ipc.commands.app.notifyMain;

  ipc.queries.app.getSettings = () => {
    const settings = (window as WindowWithConnectionManagerTest)
      .__CONNECTION_MANAGER_TEST_SETTINGS__;
    const defaultConnections: TestConnection[] = [
      { name: "Bash Session", shell: "bash", commands: ["gdb"] },
      { name: "WSL Session", shell: "wsl", commands: ["gdb"], wslDistribution: "Ubuntu" },
    ];

    return Promise.resolve({
      connections: settings?.connections ?? defaultConnections,
    });
  };
  ipc.getSettings = ipc.queries.app.getSettings;

  ipc.queries.environment.getWslDistrobutions = () => {
    const settings = (window as WindowWithConnectionManagerTest)
      .__CONNECTION_MANAGER_TEST_SETTINGS__;
    const distros = settings?.wslDistros ?? ["Ubuntu", "Debian"];

    return Promise.resolve(
      distros.map((name, idx) => ({
        name,
        version: "2",
        state: "Running",
        default: idx === 0,
      })),
    );
  };
  ipc.getWslDistrobutions = ipc.queries.environment.getWslDistrobutions;

  (window as WindowWithConnectionManagerTest).__CONNECTION_MANAGER_TEST_API__ = {
    getNotifyMainCalls: () => notifyMainCalls.slice(),
    reset: () => {
      notifyMainCalls.length = 0;
    },
  };
}

export function ConnectionManagerTestPage(): JSX.Element {
  const connectionManagerRef = useRef<ConnectionManagerHandle>(null);

  useEffect(() => {
    connectionManagerRef.current?.ShowDialog();
  }, []);

  return (
    <div className="connection-manager-test-container" data-testid="connection-manager-test-page">
      <ConnectionManager ref={connectionManagerRef} />
    </div>
  );
}
