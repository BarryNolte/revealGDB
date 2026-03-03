import { ButtonComponent } from "@syncfusion/ej2-react-buttons";
import { DialogComponent } from "@syncfusion/ej2-react-popups";
import { forwardRef, JSX, useEffect, useImperativeHandle, useRef, useState } from "react";
import "./ConnectingDialog.css";
import { ComboBoxComponent } from "@syncfusion/ej2-react-dropdowns";
import { ColumnDirective, ColumnsDirective, GridComponent } from "@syncfusion/ej2-react-grids";
import { GdbAny, Step, StepAndState } from "../../common/gdb-common";

import pendingIcon from "../icons/icons8-pending-48.png";
import inProcessIcon from "../icons/icons8-process.gif";
import completedIcon from "../icons/icons8-complete-48.png";
import failedIcon from "../icons/icons8-failed-48.png";

const testConnections: string[] = [
  "Connection 1",
  "Connection 2",
  "Connection 3",
  "Connection 4",
  "Connection 5",
  "Connection 6",
  "Connection 7",
  "Connection 8",
  "Connection 9",
  "Connection 10",
];

const states: Record<Step, StepAndState> = {
  "starting-shell": { step: 0, name: "Starting Shell", state: "pending" },
  "running-commands": { step: 1, name: "Running Commands", state: "pending" },
  "target-running": { step: 2, name: "Target Running", state: "pending" },
};

export type WhileConnectingDialogHandle = {
  ShowDialog: () => void;
  HideDialog: () => void;
};

export const WhileConnectingDialog = forwardRef<WhileConnectingDialogHandle>((_props, ref) => {
  const connDlgRef = useRef<DialogComponent>(null);
  const gridRef = useRef<GridComponent>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const [connectionState, setConnectionState] = useState(states);

  useEffect(() => {
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
      connDlgRef.current?.show();
    },
    HideDialog: () => {
      connDlgRef.current?.hide();
    },
  }));

  function dialogCloseFunc() {
    connDlgRef.current?.hide();
  }

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
        <ButtonComponent
          onClick={() => {
            dialogCloseFunc();
          }}
          disabled={false}
        >
          Connect
        </ButtonComponent>
        <ButtonComponent onClick={dialogCloseFunc} disabled={true}>
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
          <div className="connectionItem">
            <ComboBoxComponent
              id="definedConnections"
              name="definedConnections"
              readOnly={true}
              placeholder="Select a connection..."
              disabled={false}
              dataSource={testConnections}
            />
          </div>
          <GridComponent
            ref={gridRef}
            className="connectionItem"
            rowHeight={16}
            dataSource={Object.values(connectionState)}
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
});

WhileConnectingDialog.displayName = "Connection Status";
