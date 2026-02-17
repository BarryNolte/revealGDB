import { ButtonComponent } from "@syncfusion/ej2-react-buttons";
import { DialogComponent } from "@syncfusion/ej2-react-popups";
import { forwardRef, JSX, useEffect, useImperativeHandle, useRef } from "react";
import "./ConnectingDialog.css";
import { ComboBoxComponent } from "@syncfusion/ej2-react-dropdowns";
import { ProgressBarComponent } from "@syncfusion/ej2-react-progressbar";
import { ColumnDirective, ColumnsDirective, GridComponent } from "@syncfusion/ej2-react-grids";
import { GdbAny } from "../../common/gdb-common";

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

type StepAndState = {
  step: number;
  name: string;
  state: "pending" | "in-progress" | "completed" | "failed";
};

const connectionStates: Record<string, StepAndState> = {
  "starting-shell": { step: 0, name: "Starting Shell", state: "pending" },
  "finding-gdb": { step: 1, name: "Finding GDB", state: "pending" },
  "gdb-starting": { step: 2, name: "GDB Starting", state: "pending" },
  "running-commands": { step: 3, name: "Running Commands", state: "pending" },
  "target-running": { step: 4, name: "Target Running", state: "pending" },
};

export type WhileConnectingDialogHandle = {
  ShowDialog: () => void;
  HideDialog: () => void;
};

export const WhileConnectingDialog = forwardRef<WhileConnectingDialogHandle>((_props, ref) => {
  const connDlgRef = useRef<DialogComponent>(null);
  const gridRef = useRef<GridComponent>(null);
  const progressRef = useRef<ProgressBarComponent>(null);

  useEffect(() => {
    connDlgRef.current?.show();
    window.ipcToMain.connectionStatus((status: string) => {
      switch (status) {
        case "target-running":
          {
            connDlgRef.current?.hide();
          }
          break;
        case "finding-gdb":
          {
            console.log(`Finding GDB: ${Date.now()}`);
          }
          break;
        case "gdb-found":
          {
            console.log(`GDB Found: ${Date.now()}`);
          }
          break;
        case "gdb-not-found":
          {
            console.log(`GDB Not Found: ${Date.now()}`);
          }
          break;
        case "gdb-starting":
          {
            console.log(`GDB Starting: ${Date.now()}`);
          }
          break;
        case "gdb-started":
          {
            console.log(`GDB Started: ${Date.now()}`);
          }
          break;
        case "gdb-start-failed":
          {
            console.log(`GDB Start Failed: ${Date.now()}`);
          }
          break;
        default:
          {
            console.log(`Unknown status: ${status}`);
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

  function enableProgressBar(b: boolean): void {
    if (progressRef.current) {
      if (b) {
        progressRef.current.isIndeterminate = true;
        progressRef.current.value = 40;
      } else {
        progressRef.current.isIndeterminate = false;
        progressRef.current.value = 0;
      }
    }
  }

  function dialogCloseFunc() {
    connDlgRef.current?.hide();
  }

  const header = (): JSX.Element => {
    return <div className="dialogHeader">Connecting...</div>;
  };

  const footer = (): JSX.Element => {
    return (
      <div>
        <ButtonComponent onClick={() => enableProgressBar(true)} disabled={false}>
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

  return (
    <div>
      <DialogComponent
        className="dialogHeaderContainer"
        ref={connDlgRef}
        title="Connecting..."
        width={500}
        height={700}
        position={{ X: "center", Y: "center" }}
        showCloseIcon={true}
        close={dialogCloseFunc}
        header={header}
        footerTemplate={footer}
        isModal={true}
      >
        <div id="connectionLabel">
          <label className="connectionLabel" htmlFor="definedConnections">
            Select a connection
          </label>
          <ComboBoxComponent
            id="definedConnections"
            name="definedConnections"
            readOnly={true}
            placeholder="Select a connection..."
            disabled={false}
            dataSource={testConnections}
          />
        </div>
        <div className="state-container">
          <GridComponent ref={gridRef} id="stepsTable" dataSource={Object.values(connectionStates)}>
            <ColumnsDirective>
              <ColumnDirective field="step" visible={false} />
              <ColumnDirective
                field="state"
                headerText="State"
                autoFit={true}
                headerTemplate={columnHeaderTemplate}
              />
              <ColumnDirective
                field="name"
                headerText="Step"
                textAlign="Left"
                headerTemplate={columnHeaderTemplate}
              />
            </ColumnsDirective>
          </GridComponent>
          <ProgressBarComponent
            ref={progressRef}
            id="connectionProgress"
            type="Linear"
            trackThickness={20}
            progressThickness={20}
            height="40"
            width="500"
            value={0}
            animation={{ enable: true, duration: 2000, delay: 0 }}
          />
        </div>
      </DialogComponent>
    </div>
  );
});

WhileConnectingDialog.displayName = "Connection Status";
