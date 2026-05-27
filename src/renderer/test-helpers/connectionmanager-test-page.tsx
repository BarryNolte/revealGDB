/**
 * Provides connectionmanager test page helpers that power renderer integration harness pages.
 *
 * @remarks
 * Exported symbols include `setupConnectionManagerTestApi`, `ConnectionManagerTestPage`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import type { JSX } from "react";
import { useEffect, useRef } from "react";
import { ConnectionManager, type ConnectionManagerHandle } from "../Dialogs/ConnectionManager";
import "./connectionmanager-test-page.css";
import { initIpcMock, setIpcFullLegacyAliases } from "./ipc-test-setup";

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

/**
 * Performs setup connection manager test api as part of this module's public API.
 */
export function setupConnectionManagerTestApi(): void {
  const ipc = initIpcMock();
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
  setIpcFullLegacyAliases(ipc);

  (window as WindowWithConnectionManagerTest).__CONNECTION_MANAGER_TEST_API__ = {
    getNotifyMainCalls: () => notifyMainCalls.slice(),
    reset: () => {
      notifyMainCalls.length = 0;
    },
  };
}

/**
 * Performs connection manager test page as part of this module's public API.
 *
 * @returns The computed result produced by this operation.
 */
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
