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

  ipc.consoleMessage = () => () => undefined;
  ipc.logMessage = () => () => undefined;
  ipc.errorMessage = () => () => undefined;
  ipc.debugMessage = () => () => undefined;
  ipc.notifyRender = () => () => undefined;
  ipc.dataRegisters = () => () => undefined;
  ipc.stackFrames = () => () => undefined;
  ipc.sourceFile = () => () => undefined;
  ipc.dataLocals = () => () => undefined;
  ipc.dataThreads = () => () => undefined;
  ipc.dataBrkPts = () => () => undefined;
  ipc.dataMemory = () => () => undefined;
  ipc.dataDisasm = () => () => undefined;
  ipc.getSystemFonts = () => Promise.resolve([]);
  ipc.getVersionInfo = () => Promise.resolve(new Map());
  const notifyMainCalls: Array<{ command?: string; data?: unknown }> = [];

  ipc.notifyMain = (message) => {
    notifyMainCalls.push({
      command: message?.command,
      data: message?.data,
    });
  };

  ipc.getSettings = () => {
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

  ipc.getWslDistrobutions = () => {
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
