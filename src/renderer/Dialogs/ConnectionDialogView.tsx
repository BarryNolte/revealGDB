/**
 * Implements connection dialog view dialog state and interaction workflows in the renderer.
 *
 * @remarks
 * Exported symbols include `ConnectionDialogView`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { Column } from "@syncfusion/ej2-grids";
import { ButtonComponent } from "@syncfusion/ej2-react-buttons";
import { ComboBoxComponent } from "@syncfusion/ej2-react-dropdowns";
import { ColumnDirective, ColumnsDirective, GridComponent } from "@syncfusion/ej2-react-grids";
import { DialogComponent } from "@syncfusion/ej2-react-popups";
import { JSX, RefObject } from "react";
import { StepAndState } from "../../common/gdb-common";

import completedIcon from "../icons/icons8-complete-48.png";
import failedIcon from "../icons/icons8-failed-48.png";
import pendingIcon from "../icons/icons8-pending-48.png";
import inProcessIcon from "../icons/icons8-process.gif";

export type ConnectionOption = {
  name: string;
};

export type ConnectionDialogViewProps = {
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

/**
 * Performs column header template as part of this module's internal workflow.
 *
 * @param header - Value for `header` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
/**
 * Performs columnHeaderTemplate as part of this module's internal workflow.
 *
 * @param header - header parameter.
 * @returns The computed result produced by this operation.
 */
function columnHeaderTemplate(header: Column): JSX.Element {
  return <div className="column-header-template">{header.headerText}</div>;
}

/**
 * Performs state cell template as part of this module's internal workflow.
 *
 * @param props - Value for `props` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
type StateCellProps = { state: StepAndState["state"] };
/**
 * Performs stateCellTemplate as part of this module's internal workflow.
 *
 * @param props - props parameter.
 * @returns The computed result produced by this operation.
 */

function stateCellTemplate(props: StateCellProps): JSX.Element {
  const state = props.state;
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
    // istanbul ignore next
    default:
      break;
  }

  return (
    <div>
      <img className="statusIcon" src={src} alt={state} />
    </div>
  );
}

/**
 * Performs header template as part of this module's internal workflow.
 *
 * @returns The computed result produced by this operation.
 */
function headerTemplate(): JSX.Element {
  return (
    <div className="dialogHeader" id="connectingDialogHeader">
      Connecting...
    </div>
  );
}

type ConnectionComboBoxProps = Pick<
  ConnectionDialogViewProps,
  "definedConnections" | "selectedConnectionName" | "onSelectedConnectionChange"
>;
/**
 * Performs ConnectionComboBox as part of this module's internal workflow.
 *
 * @param {
  definedConnections - {
  definedConnections parameter.
 * @param selectedConnectionName - selectedConnectionName parameter.
 * @param onSelectedConnectionChange - onSelectedConnectionChange parameter.
 * @param } - } parameter.
 * @returns The computed result produced by this operation.
 */

function ConnectionComboBox({
  definedConnections,
  selectedConnectionName,
  onSelectedConnectionChange,
}: ConnectionComboBoxProps): JSX.Element {
  return (
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
    </div>
  );
}
/**
 * Performs connectionDialogFooter as part of this module's internal workflow.
 *
 * @param onConnectClick - onConnectClick parameter.
 * @returns The computed result produced by this operation.
 */

function connectionDialogFooter(
  onConnectClick: () => void,
  onCancelConnectionClick: () => void,
  disconnectAvailable: boolean,
): JSX.Element {
  return (
    <div className="connectionDialogFooter">
      <ButtonComponent id="connectionsButton" type="button">
        Connections
      </ButtonComponent>
      <div className="connectionDialogFooterActions">
        <ButtonComponent onClick={onConnectClick} disabled={disconnectAvailable}>
          Connect
        </ButtonComponent>
        <ButtonComponent onClick={onCancelConnectionClick} disabled={!disconnectAvailable}>
          Cancel Connection
        </ButtonComponent>
      </div>
    </div>
  );
}

/**
 * Performs connection dialog view as part of this module's public API.
 *
 * @param props - Value for `props` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
export default function ConnectionDialogView(props: ConnectionDialogViewProps): JSX.Element {
  const {
    connDlgRef,
    gridRef,
    outputRef,
    connectionStateRows,
    disconnectAvailable,
    onDialogClose,
    onConnectClick,
    onCancelConnectionClick,
  } = props;

  return (
    <div>
      <DialogComponent
        className="dialogHeaderContainer"
        ref={connDlgRef}
        title="Connecting..."
        width="500px"
        height="800px"
        position={{ X: "center", Y: "center" }}
        showCloseIcon={true}
        close={onDialogClose}
        closeOnEscape={false}
        header={headerTemplate}
        footerTemplate={() =>
          connectionDialogFooter(onConnectClick, onCancelConnectionClick, disconnectAvailable)
        }
        isModal={true}
      >
        <div className="connectionContainer">
          <label className="connectionLabel" htmlFor="definedConnections">
            Select a connection
          </label>
          <ConnectionComboBox {...props} />
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
