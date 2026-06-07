/**
 * Implements use connection dialog controller dialog state and interaction workflows in the renderer.
 *
 * @remarks
 * Exported symbols include `DefinedConnection`, `useConnectionDialogController`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { DialogComponent } from "@syncfusion/ej2-react-popups";
import {
  Dispatch,
  RefObject,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Step, StepAndState } from "../../common/gdb-common";
import type { NotifyRenderMessage } from "../../common/ipc-contracts";
import type { ConnectionStatusPayload } from "../../common/ipc-data-types";
import type { ConnectionConfig, GdbSettings } from "../../common/settings-types";
import type { NormalizedConnection } from "../../common/connection-types";
import type { ConnectionManagerHandle } from "./ConnectionManager";

const states: Record<Step, StepAndState> = {
  "starting-shell": { step: 0, name: "Starting Shell", state: "pending" },
  "running-commands": { step: 1, name: "Running Commands", state: "pending" },
  "target-running": { step: 2, name: "Target Running", state: "pending" },
};

/**
 * Creates pending states for downstream use.
 *
 * @returns The computed result produced by this operation.
 */
const createPendingStates = (): Record<Step, StepAndState> => ({
  "starting-shell": { ...states["starting-shell"] },
  "running-commands": { ...states["running-commands"] },
  "target-running": { ...states["target-running"] },
});

export type DefinedConnection = ConnectionConfig & { name: string };

export type UseConnectionDialogControllerArgs = {
  connectionsRef?: RefObject<ConnectionManagerHandle>;
  connDlgRef: RefObject<DialogComponent | null>;
  outputRef: RefObject<HTMLDivElement | null>;
};

/**
 * Normalizes connections into a consistent representation.
 *
 * @param settingsConnections - Value for `settingsConnections` consumed by this operation.
 * @returns The resulting collection produced by this operation.
 */
/**
 * Performs normalizeConnections as part of this module's internal workflow.
 *
 * @param settingsConnections - settingsConnections parameter.
 * @returns The computed result produced by this operation.
 */
function normalizeConnections(settingsConnections: unknown): DefinedConnection[] {
  if (!Array.isArray(settingsConnections)) {
    return [];
  }

  return settingsConnections
    .filter((connection) => connection && typeof connection === "object")
    .map((connection, index) => ({
      ...(connection as ConnectionConfig),
      name: String((connection as ConnectionConfig).name ?? `Connection ${index + 1}`),
    }));
}

async function fetchConnectionSettings(
  setDefinedConnections: Dispatch<SetStateAction<DefinedConnection[]>>,
  setSelectedConnection: Dispatch<SetStateAction<DefinedConnection | null>>,
): Promise<void> {
  try {
    const settings = (await window.ipcToMain.queries.app.getSettings()) as GdbSettings;
    const normalizedConnections = normalizeConnections(settings?.connections);
    const lastUsedConnectionName =
      typeof settings?.lastUsedConnection === "string" ? settings.lastUsedConnection : undefined;
    const restoredConnection = lastUsedConnectionName
      ? (normalizedConnections.find((connection) => connection.name === lastUsedConnectionName) ??
        null)
      : null;
    setDefinedConnections(normalizedConnections);
    setSelectedConnection(restoredConnection);
  } catch {
    setDefinedConnections([]);
    setSelectedConnection(null);
  }
}
/**
 * Performs handleConnectionStatusUpdate as part of this module's internal workflow.
 *
 * @param status - status parameter.
 * @param outputRef - outputRef parameter.
 * @param connDlgRef - connDlgRef parameter.
 * @param setConnectionState - setConnectionState parameter.
 * @param StepAndState>>> - StepAndState>>> parameter.
 * @returns The computed result produced by this operation.
 */

function handleConnectionStatusUpdate(
  status: ConnectionStatusPayload,
  outputRef: RefObject<HTMLDivElement | null>,
  connDlgRef: RefObject<DialogComponent | null>,
  setConnectionState: Dispatch<SetStateAction<Record<Step, StepAndState>>>,
): void {
  switch (status[0]) {
    case "console-capture": {
      const { error, line } = status[1];
      const div = document.createElement("div");
      div.textContent = line;
      div.className = error ? "consoleError" : "consoleOutput";
      outputRef.current?.appendChild(div);
      div.scrollIntoView({ behavior: "smooth", block: "end" });
      break;
    }
    case "gdb-startup": {
      const step = status[1] as Step;
      const stepState = status[2] as StepAndState["state"];
      setConnectionState((prev) => {
        const newState = { ...prev };
        newState[step] = { ...newState[step], state: stepState };
        return newState;
      });
      if (step === "target-running" && stepState === "completed") {
        setTimeout(() => {
          connDlgRef.current?.hide();
        }, 500);
      }
      break;
    }
    default:
      break;
  }
}
/**
 * Performs useConnectionSubscriptions as part of this module's internal workflow.
 *
 * @param connDlgRef - connDlgRef parameter.
 * @param connectionsRef - connectionsRef parameter.
 * @param outputRef - outputRef parameter.
 * @param loadConnectionsFromSettings - loadConnectionsFromSettings parameter.
 * @returns The computed result produced by this operation.
 */

function useConnectionSubscriptions(
  connDlgRef: RefObject<DialogComponent | null>,
  connectionsRef: RefObject<ConnectionManagerHandle> | undefined,
  outputRef: RefObject<HTMLDivElement | null>,
  loadConnectionsFromSettings: () => Promise<void>,
  setDisconnectAvailable: Dispatch<SetStateAction<boolean>>,
  setConnectionState: Dispatch<SetStateAction<Record<Step, StepAndState>>>,
): void {
  const openConnectionManagerClickHandler = useCallback((): void => {
    connDlgRef.current?.hide();
    window.setTimeout(() => {
      if (!connectionsRef?.current) {
        connDlgRef.current?.show();
        return;
      }
      connectionsRef.current.ShowDialog(() => {
        void loadConnectionsFromSettings();
        connDlgRef.current?.show();
      });
    }, 0);
  }, [connDlgRef, connectionsRef, loadConnectionsFromSettings]);

  useEffect(() => {
    const initialLoadTimer = window.setTimeout(() => {
      void loadConnectionsFromSettings();
    }, 0);
    const unsubscribeNotify = window.ipcToMain.notifications.render((msg: NotifyRenderMessage) => {
      switch (msg.command) {
        case "connection-started":
        case "connection-success":
          setDisconnectAvailable(true);
          break;
        case "connection-failed":
        case "cancel-connection":
          setDisconnectAvailable(false);
          break;
        default:
          break;
      }
    });
    const unsubscribeConnectionStatus = window.ipcToMain.notifications.connectionStatus(
      (status: ConnectionStatusPayload) => {
        handleConnectionStatusUpdate(status, outputRef, connDlgRef, setConnectionState);
      },
    );
    connDlgRef.current?.show();
    return () => {
      window.clearTimeout(initialLoadTimer);
      unsubscribeNotify();
      unsubscribeConnectionStatus();
    };
  }, [
    connDlgRef,
    loadConnectionsFromSettings,
    outputRef,
    setConnectionState,
    setDisconnectAvailable,
  ]);

  useEffect(() => {
    const onDocumentClickCapture = (event: MouseEvent): void => {
      const eventTarget = event.target;
      if (!(eventTarget instanceof Element)) return;
      if (!eventTarget.closest("#connectionsButton")) return;
      event.preventDefault();
      openConnectionManagerClickHandler();
    };
    document.addEventListener("click", onDocumentClickCapture, true);
    return () => {
      document.removeEventListener("click", onDocumentClickCapture, true);
    };
  }, [openConnectionManagerClickHandler]);
}

/**
 * Creates and returns the `useConnectionDialogController` hook API used by renderer components.
 *
 * @remarks
 * Encapsulates stateful React logic and returns values/callbacks consumed by UI components. Includes explicit error-handling logic for expected failure paths. Performs asynchronous work and should be used with completion ordering in mind.
 *
 * @param param1 - Value for `param1` consumed by this operation.
 */
/**
 * Performs useConnectionDialogController as part of this module's internal workflow.
 *
 * @param {
  connectionsRef - {
  connectionsRef parameter.
 * @param connDlgRef - connDlgRef parameter.
 * @param outputRef - outputRef parameter.
 * @param } - } parameter.
 * @returns The computed result produced by this operation.
 */
export function useConnectionDialogController({
  connectionsRef,
  connDlgRef,
  outputRef,
}: UseConnectionDialogControllerArgs) {
  const [connectionState, setConnectionState] = useState(createPendingStates());
  const [definedConnections, setDefinedConnections] = useState<DefinedConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<DefinedConnection | null>(null);
  const [disconnectAvailable, setDisconnectAvailable] = useState<boolean>(false);

  const resetDialogState = useCallback((): void => {
    setConnectionState(createPendingStates());
    if (outputRef.current) {
      outputRef.current.innerHTML = "";
    }
  }, [outputRef]);

  const loadConnectionsFromSettings = useCallback(
    () => fetchConnectionSettings(setDefinedConnections, setSelectedConnection),
    [],
  );

  useConnectionSubscriptions(
    connDlgRef,
    connectionsRef,
    outputRef,
    loadConnectionsFromSettings,
    setDisconnectAvailable,
    setConnectionState,
  );

  const onDialogClose = useCallback(() => {
    window.ipcToMain.commands.app.notifyMain({
      command: "save-last-used-connection",
      data: selectedConnection?.name ?? null,
    });
    connDlgRef.current?.hide();
  }, [connDlgRef, selectedConnection]);

  const onConnectClick = useCallback((): void => {
    if (!selectedConnection) {
      return;
    }

    window.ipcToMain.commands.app.notifyMain({
      command: "connect-selected-connection",
      data: { connection: selectedConnection as NormalizedConnection },
    });
  }, [selectedConnection]);

  const onCancelConnectionClick = useCallback((): void => {
    window.ipcToMain.commands.app.notifyMain({
      command: "cancel-connection",
    });
    onDialogClose();
  }, [onDialogClose]);

  const onSelectedConnectionChange = useCallback((itemData: unknown): void => {
    const connection = (itemData as DefinedConnection | undefined) ?? null;
    setSelectedConnection(connection);
    window.ipcToMain.commands.app.notifyMain({
      command: "save-last-used-connection",
      data: connection?.name ?? null,
    });
  }, []);

  const showDialog = useCallback((): void => {
    resetDialogState();
    void loadConnectionsFromSettings();
    connDlgRef.current?.show();
  }, [connDlgRef, loadConnectionsFromSettings, resetDialogState]);

  const hideDialog = useCallback((): void => {
    connDlgRef.current?.hide();
  }, [connDlgRef]);
  const connectionStateRows = useMemo(() => Object.values(connectionState), [connectionState]);

  return {
    connectionStateRows,
    definedConnections,
    selectedConnectionName: selectedConnection?.name,
    disconnectAvailable,
    onDialogClose,
    onConnectClick,
    onCancelConnectionClick,
    onSelectedConnectionChange,
    showDialog,
    hideDialog,
  };
}
