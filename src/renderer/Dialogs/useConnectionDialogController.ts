import { DialogComponent } from "@syncfusion/ej2-react-popups";
import { RefObject, useCallback, useEffect, useMemo, useState } from "react";
import { GdbAny, Step, StepAndState } from "../../common/gdb-common";
import type { ConnectionManagerHandle } from "./ConnectionManager";

const states: Record<Step, StepAndState> = {
  "starting-shell": { step: 0, name: "Starting Shell", state: "pending" },
  "running-commands": { step: 1, name: "Running Commands", state: "pending" },
  "target-running": { step: 2, name: "Target Running", state: "pending" },
};

const createPendingStates = (): Record<Step, StepAndState> => ({
  "starting-shell": { ...states["starting-shell"] },
  "running-commands": { ...states["running-commands"] },
  "target-running": { ...states["target-running"] },
});

export type DefinedConnection = {
  name: string;
} & GdbAny;

type UseConnectionDialogControllerArgs = {
  connectionsRef?: RefObject<ConnectionManagerHandle>;
  connDlgRef: RefObject<DialogComponent | null>;
  outputRef: RefObject<HTMLDivElement | null>;
};

function normalizeConnections(settingsConnections: unknown): DefinedConnection[] {
  if (!Array.isArray(settingsConnections)) {
    return [];
  }

  return settingsConnections
    .filter((connection) => connection && typeof connection === "object")
    .map((connection, index) => ({
      ...(connection as GdbAny),
      name: String((connection as GdbAny).name ?? `Connection ${index + 1}`),
    }));
}

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

  const loadConnectionsFromSettings = useCallback(async (): Promise<void> => {
    try {
      const settings = (await window.ipcToMain.getSettings()) as GdbAny;
      const normalizedConnections = normalizeConnections(settings?.connections);
      setDefinedConnections(normalizedConnections);
      setSelectedConnection(normalizedConnections[0] ?? null);
    } catch (error) {
      console.error("Failed to load connections from settings", error);
      setDefinedConnections([]);
      setSelectedConnection(null);
    }
  }, []);

  useEffect(() => {
    const initialLoadTimer = window.setTimeout(() => {
      void loadConnectionsFromSettings();
    }, 0);

    const unsubscribeNotify = window.ipcToMain.notifyRender((msg: GdbAny) => {
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

    const unsubscribeConnectionStatus = window.ipcToMain.connectionStatus((status: GdbAny) => {
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
          console.error(`Unknown status: ${status}`);
          break;
      }
    });

    connDlgRef.current?.show();

    return () => {
      window.clearTimeout(initialLoadTimer);
      unsubscribeNotify();
      unsubscribeConnectionStatus();
    };
  }, [connDlgRef, loadConnectionsFromSettings, outputRef]);

  const onDialogClose = useCallback(() => {
    connDlgRef.current?.hide();
  }, [connDlgRef]);

  const onConnectClick = useCallback((): void => {
    if (!selectedConnection) {
      return;
    }

    window.ipcToMain.notifyMain({
      command: "connect-selected-connection",
      data: { connection: selectedConnection },
    });
  }, [selectedConnection]);

  const onCancelConnectionClick = useCallback((): void => {
    window.ipcToMain.notifyMain({
      command: "cancel-connection",
    });
    onDialogClose();
  }, [onDialogClose]);

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
    const onDocumentClickCapture = (event: MouseEvent): void => {
      const eventTarget = event.target;
      if (!(eventTarget instanceof Element)) {
        return;
      }

      if (!eventTarget.closest("#connectionsButton")) {
        return;
      }

      event.preventDefault();
      openConnectionManagerClickHandler();
    };

    document.addEventListener("click", onDocumentClickCapture, true);
    return () => {
      document.removeEventListener("click", onDocumentClickCapture, true);
    };
  }, [openConnectionManagerClickHandler]);

  const onSelectedConnectionChange = useCallback((itemData: unknown): void => {
    setSelectedConnection((itemData as DefinedConnection | undefined) ?? null);
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
