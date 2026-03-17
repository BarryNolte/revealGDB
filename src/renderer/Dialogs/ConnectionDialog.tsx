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

import { ButtonComponent } from "@syncfusion/ej2-react-buttons";
import { ComboBoxComponent } from "@syncfusion/ej2-react-dropdowns";
import { ColumnDirective, ColumnsDirective, GridComponent } from "@syncfusion/ej2-react-grids";
import { DialogComponent } from "@syncfusion/ej2-react-popups";
import {
  forwardRef,
  JSX,
  RefObject,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { GdbAny, Step, StepAndState } from "../../common/gdb-common";
import "./ConnectionDialog.css";
import type { ConnectionManagerHandle } from "./ConnectionManager";

import completedIcon from "../icons/icons8-complete-48.png";
import failedIcon from "../icons/icons8-failed-48.png";
import pendingIcon from "../icons/icons8-pending-48.png";
import inProcessIcon from "../icons/icons8-process.gif";

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

    const header = (): JSX.Element => {
      return (
        <div className="dialogHeader" id="connectingDialogHeader">
          Connecting...
        </div>
      );
    };

    const footer = (): JSX.Element => {
      return (
        <div>
          <ButtonComponent onClick={connectClickHandler} disabled={disconnectAvailable}>
            Connect
          </ButtonComponent>
          <ButtonComponent onClick={cancelConnectionClickHandler} disabled={!disconnectAvailable}>
            Cancel Connection
          </ButtonComponent>
        </div>
      );
    };

    const columnHeaderTemplate = (h: GdbAny): JSX.Element => {
      return <div className="column-header-template">{h.headerText}</div>;
    };

    const stateCellTemplate = (props: GdbAny): JSX.Element => {
      const state = props!.state as StepAndState["state"];
      let src = "";
      switch (state) {
        case "pending":
          src = pendingIcon;
          break;
        case "in-progress":
          src = inProcessIcon;
          break;
        case "completed":
          src = completedIcon;
          break;
        case "failed":
          src = failedIcon;
          break;
        default:
          break;
      }
      return (
        <div>
          <img className="statusIcon" src={src} alt={state} />
        </div>
      );
    };

    return (
      <div>
        <DialogComponent
          className="dialogHeaderContainer"
          ref={connDlgRef}
          title="Connecting..."
          width="500px"
          height="185%"
          position={{ X: "center", Y: "center" }}
          showCloseIcon={true}
          close={dialogCloseFunc}
          closeOnEscape={false}
          header={header}
          footerTemplate={footer}
          isModal={true}
        >
          <div className="connectionContainer">
            <label className="connectionLabel" htmlFor="definedConnections">
              Select a connection
            </label>
            <div className="connectionItem connectionSelectRow">
              <div className="connectionComboHost">
                <ComboBoxComponent
                  id="definedConnections"
                  name="definedConnections"
                  readOnly={true}
                  placeholder="Select a connection..."
                  disabled={false}
                  dataSource={definedConnections}
                  fields={{ text: "name", value: "name" }}
                  value={selectedConnection?.name}
                  change={(args) => {
                    setSelectedConnection((args.itemData as DefinedConnection | undefined) ?? null);
                  }}
                />
              </div>
              <button id="connectionsButton" type="button">
                Connections
              </button>
            </div>
            <GridComponent
              ref={gridRef}
              className="connectionItem"
              rowHeight={16}
              dataSource={Object.values(connectionState)}
              allowSelection={false}
              enableHover={false}
            >
              <ColumnsDirective>
                <ColumnDirective field="step" visible={false} />
                <ColumnDirective
                  field="state"
                  headerText="State"
                  autoFit={true}
                  headerTemplate={columnHeaderTemplate}
                  template={stateCellTemplate}
                />
                <ColumnDirective
                  field="name"
                  headerText="Step"
                  textAlign="Left"
                  headerTemplate={columnHeaderTemplate}
                />
              </ColumnsDirective>
            </GridComponent>
            <label className="connectionLabel connectionItem" htmlFor="connectionOutputContainer">
              Connection Output:
            </label>
            <div ref={outputRef} className="connectionItem2" id="connectionOutputContainer" />
          </div>
        </DialogComponent>
      </div>
    );
  },
);

ConnectionDialog.displayName = "Connection Status";
