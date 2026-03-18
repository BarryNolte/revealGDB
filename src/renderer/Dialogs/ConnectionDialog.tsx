/**
 * Connection progress dialog for RevealGDB.
 *
 * Displays and controls an active connection attempt:
 * - Selects a saved connection profile
 * - Starts/cancels connection from the renderer
 * - Shows startup step status with icons
 * - Streams console output while connecting
 *
 * The dialog coordinates with the Connection Manager modal so users can edit
 * profiles without losing the current connection flow context.
 */

import { GridComponent } from "@syncfusion/ej2-react-grids";
import { DialogComponent } from "@syncfusion/ej2-react-popups";
import {
  forwardRef,
  RefObject,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { GdbAny, Step, StepAndState } from "../../common/gdb-common";
import "./ConnectionDialog.css";
import ConnectionDialogView from "./ConnectionDialogView";
import type { ConnectionManagerHandle } from "./ConnectionManager";

const states: Record<Step, StepAndState> = {
  "starting-shell": { step: 0, name: "Starting Shell", state: "pending" },
  "running-commands": { step: 1, name: "Running Commands", state: "pending" },
  "target-running": { step: 2, name: "Target Running", state: "pending" },
};

// Returns a fresh copy so state transitions do not mutate shared constants.
const createPendingStates = (): Record<Step, StepAndState> => ({
  "starting-shell": { ...states["starting-shell"] },
  "running-commands": { ...states["running-commands"] },
  "target-running": { ...states["target-running"] },
});

type DefinedConnection = {
  name: string;
} & GdbAny;

export type WhileConnectingDialogHandle = {
  /** Shows the dialog and resets in-progress status/output. */
  ShowDialog: () => void;

  /** Hides the dialog immediately. */
  HideDialog: () => void;
};

type ConnectionDialogProps = {
  connectionsRef?: RefObject<ConnectionManagerHandle>;
};

export const ConnectionDialog = forwardRef<WhileConnectingDialogHandle, ConnectionDialogProps>(
  ({ connectionsRef }, ref) => {
    const connDlgRef = useRef<DialogComponent>(null);
    const gridRef = useRef<GridComponent>(null);
    const outputRef = useRef<HTMLDivElement>(null);
    const [connectionState, setConnectionState] = useState(createPendingStates());
    const [definedConnections, setDefinedConnections] = useState<DefinedConnection[]>([]);
    const [selectedConnection, setSelectedConnection] = useState<DefinedConnection | null>(null);
    const [disconnectAvailable, setDisconnectAvailable] = useState<boolean>(false);

    // Reset transient UI state each time the dialog is shown.
    const resetDialogState = useCallback((): void => {
      setConnectionState(createPendingStates());
      if (outputRef.current) {
        outputRef.current.innerHTML = "";
      }
    }, []);

    // Load connection profiles from settings and normalize names for the combobox.
    const loadConnectionsFromSettings = useCallback(async (): Promise<void> => {
      try {
        const settings = (await window.ipcToMain.getSettings()) as GdbAny;
        const settingsConnections = settings?.connections;
        if (!Array.isArray(settingsConnections)) {
          setDefinedConnections([]);
          setSelectedConnection(null);
          return;
        }

        const normalizedConnections = settingsConnections
          .filter((connection) => connection && typeof connection === "object")
          .map((connection, index) => ({
            ...(connection as GdbAny),
            name: String((connection as GdbAny).name ?? `Connection ${index + 1}`),
          }));

        setDefinedConnections(normalizedConnections);
        setSelectedConnection(normalizedConnections[0] ?? null);
      } catch (error) {
        console.error("Failed to load connections from settings", error);
        setDefinedConnections([]);
        setSelectedConnection(null);
      }
    }, []);

    // Subscribe once to connection status channels and initialize dialog state.
    useEffect(() => {
      window.ipcToMain
        .getSettings()
        .then((settings: GdbAny): void => {
          const settingsConnections = settings?.connections;
          if (!Array.isArray(settingsConnections)) {
            setDefinedConnections([]);
            setSelectedConnection(null);
            return;
          }

          const normalizedConnections = settingsConnections
            .filter((connection) => connection && typeof connection === "object")
            .map((connection, index) => ({
              ...(connection as GdbAny),
              name: String((connection as GdbAny).name ?? `Connection ${index + 1}`),
            }));

          setDefinedConnections(normalizedConnections);
          setSelectedConnection(normalizedConnections[0] ?? null);
        })
        .catch((error: unknown) => {
          console.error("Failed to load connections from settings", error);
          setDefinedConnections([]);
          setSelectedConnection(null);
        });

      window.ipcToMain.notifyRender((msg: GdbAny) => {
        switch (msg.command) {
          case "connection-started":
            {
              setDisconnectAvailable(true);
            }
            break;
          case "connection-success":
            {
              setDisconnectAvailable(true);
            }
            break;
          case "connection-failed":
            {
              setDisconnectAvailable(false);
            }
            break;
          case "cancel-connection": {
            setDisconnectAvailable(false);
          }
        }
      });

      connDlgRef.current?.show();

      window.ipcToMain.connectionStatus((status: GdbAny) => {
        //console.log(`Connection status: ${JSON.stringify(status)}`);
        switch (status[0]) {
          case "console-capture":
            {
              const { error, line } = status[1];
              const div = document.createElement("div");
              div.textContent = line;
              div.className = error ? "consoleError" : "consoleOutput";
              outputRef.current?.appendChild(div);
              div.scrollIntoView({ behavior: "smooth", block: "end" });
            }
            break;
          case "gdb-startup":
            {
              // Map startup step notifications into row-level status updates.
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
            }
            break;
          default:
            {
              console.error(`Unknown status: ${status}`);
            }
            break;
        }
      });
    }, []);

    useImperativeHandle(ref, () => ({
      ShowDialog: () => {
        resetDialogState();
        void loadConnectionsFromSettings();
        connDlgRef.current?.show();
      },
      HideDialog: () => {
        connDlgRef.current?.hide();
      },
    }));

    function dialogCloseFunc() {
      connDlgRef.current?.hide();
    }

    const connectClickHandler = useCallback((): void => {
      if (!selectedConnection) {
        return;
      }

      window.ipcToMain.notifyMain({
        command: "connect-selected-connection",
        data: { connection: selectedConnection },
      });
    }, [selectedConnection]);

    const cancelConnectionClickHandler = useCallback((): void => {
      window.ipcToMain.notifyMain({
        command: "cancel-connection",
      });
      dialogCloseFunc();
    }, []);

    // Temporarily close this modal, open manager, then restore this dialog.
    const openConnectionManagerClickHandler = useCallback((): void => {
      connDlgRef.current?.hide();

      // Open on next tick so the current modal fully tears down first.
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
    }, [connectionsRef, loadConnectionsFromSettings]);

    useEffect(() => {
      // Capture phase guarantees this handler runs even if a child blocks bubbling.
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

    return (
      <ConnectionDialogView
        connDlgRef={connDlgRef}
        gridRef={gridRef}
        outputRef={outputRef}
        connectionStateRows={Object.values(connectionState)}
        definedConnections={definedConnections}
        selectedConnectionName={selectedConnection?.name}
        disconnectAvailable={disconnectAvailable}
        onDialogClose={dialogCloseFunc}
        onConnectClick={connectClickHandler}
        onCancelConnectionClick={cancelConnectionClickHandler}
        onSelectedConnectionChange={(itemData: unknown) => {
          setSelectedConnection((itemData as DefinedConnection | undefined) ?? null);
        }}
      />
    );
  },
);

ConnectionDialog.displayName = "Connection Status";
