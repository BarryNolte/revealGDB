import { ButtonComponent } from "@syncfusion/ej2-react-buttons";
import { ComboBoxComponent } from "@syncfusion/ej2-react-dropdowns";
import { ColumnDirective, ColumnsDirective, GridComponent } from "@syncfusion/ej2-react-grids";
import { DialogComponent } from "@syncfusion/ej2-react-popups";
import { JSX, RefObject } from "react";
import { GdbAny, StepAndState } from "../../common/gdb-common";

import completedIcon from "../icons/icons8-complete-48.png";
import failedIcon from "../icons/icons8-failed-48.png";
import pendingIcon from "../icons/icons8-pending-48.png";
import inProcessIcon from "../icons/icons8-process.gif";

type ConnectionOption = {
  name: string;
};

type ConnectionDialogViewProps = {
  connDlgRef: RefObject<DialogComponent | null>;
  gridRef: RefObject<GridComponent | null>;
  outputRef: RefObject<HTMLDivElement | null>;
  connectionStateRows: StepAndState[];
  definedConnections: ConnectionOption[];
  selectedConnectionName?: string;
  disconnectAvailable: boolean;
  onDialogClose: () => void;
  onConnectClick: () => void;
  onCancelConnectionClick: () => void;
  onSelectedConnectionChange: (itemData: unknown) => void;
};

function columnHeaderTemplate(header: GdbAny): JSX.Element {
  return <div className="column-header-template">{header.headerText}</div>;
}

function stateCellTemplate(props: GdbAny): JSX.Element {
  const state = props.state as StepAndState["state"];
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
}

function headerTemplate(): JSX.Element {
  return (
    <div className="dialogHeader" id="connectingDialogHeader">
      Connecting...
    </div>
  );
}

export default function ConnectionDialogView(props: ConnectionDialogViewProps): JSX.Element {
  const {
    connDlgRef,
    gridRef,
    outputRef,
    connectionStateRows,
    definedConnections,
    selectedConnectionName,
    disconnectAvailable,
    onDialogClose,
    onConnectClick,
    onCancelConnectionClick,
    onSelectedConnectionChange,
  } = props;

  const footerTemplate = (): JSX.Element => {
    return (
      <div>
        <ButtonComponent onClick={onConnectClick} disabled={disconnectAvailable}>
          Connect
        </ButtonComponent>
        <ButtonComponent onClick={onCancelConnectionClick} disabled={!disconnectAvailable}>
          Cancel Connection
        </ButtonComponent>
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
        close={onDialogClose}
        closeOnEscape={false}
        header={headerTemplate}
        footerTemplate={footerTemplate}
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
                value={selectedConnectionName}
                change={(args) => onSelectedConnectionChange(args.itemData)}
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
            dataSource={connectionStateRows}
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
}
