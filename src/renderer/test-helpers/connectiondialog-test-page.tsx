/**
 * Provides connectiondialog test page helpers that power renderer integration harness pages.
 *
 * @remarks
 * Exported symbols include `setupConnectionDialogTestApi`, `ConnectionDialogTestPage`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import type { JSX } from "react";
import { useEffect, useRef } from "react";
import { ConnectionDialog, type WhileConnectingDialogHandle } from "../Dialogs/ConnectionDialog";
import "./connectiondialog-test-page.css";
import { initIpcMock, setIpcFullLegacyAliases } from "./ipc-test-setup";

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

/**
 * Performs show dialog impl as part of this module's internal workflow.
 *
 * @returns The computed result produced by this operation.
 */
let showDialogImpl: () => void = () => undefined;
/**
 * Performs hide dialog impl as part of this module's internal workflow.
 *
 * @returns The computed result produced by this operation.
 */
let hideDialogImpl: () => void = () => undefined;

/**
 * Performs setup connection dialog test api as part of this module's public API.
 */
export function setupConnectionDialogTestApi(): void {
  const ipc = initIpcMock();
  const notifyMainCalls: NotifyMainCall[] = [];

  ipc.queries.app.getSettings = () => {
    const settings = (window as WindowWithConnectionDialogTest).__CONNECTION_DIALOG_TEST_SETTINGS__;
    return Promise.resolve({
      ...defaultSettings,
      ...(settings ?? {}),
      connections: settings?.connections ?? defaultSettings.connections,
    });
  };
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
  setIpcFullLegacyAliases(ipc);

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

/**
 * Performs connection dialog test page as part of this module's public API.
 *
 * @returns The computed result produced by this operation.
 */
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
