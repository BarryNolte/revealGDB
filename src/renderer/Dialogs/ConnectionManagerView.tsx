/**
 * Implements connection manager view dialog state and interaction workflows in the renderer.
 *
 * @remarks
 * Exported symbols include `ConnectionManagerView`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import {
  ColumnDirective,
  ColumnsDirective,
  GridComponent,
  Inject,
  Resize,
} from "@syncfusion/ej2-react-grids";
import { DialogComponent } from "@syncfusion/ej2-react-popups";
import type { ChangeEvent, ReactElement, RefObject } from "react";
import DragAndDropList, {
  DragAndDropListItem,
} from "../Components/DragAndDropList/DragAndDropList";
import { ConnectionGridRow } from "./connectionManagerModel";

export type ShellOptionView = {
  key: string;
  label: string;
};

export type ConnectionManagerViewProps = {
  hideDialog: boolean;
  shellOptions: ShellOptionView[];
  isWslShellSelected: boolean;
  commandsList: DragAndDropListItem[];
  commandsListKey: string;
  connectionName: string;
  selectedShellLabel: string;
  wslDistros: string[];
  selectedWslDistro: string;
  isAddingConnection: boolean;
  connections: ConnectionGridRow[];
  connectionsGridRef: RefObject<GridComponent | null>;
  connectionNameInputRef: RefObject<HTMLInputElement | null>;
  shellSelectRef: RefObject<HTMLSelectElement | null>;
  addConnectionButtonRef: RefObject<HTMLButtonElement | null>;
  handleOnReorder: (items: DragAndDropListItem[]) => void;
  shellChangeHandler: (e: ChangeEvent<HTMLSelectElement>) => void;
  wslDistroChangeHandler: (e: ChangeEvent<HTMLSelectElement>) => void;
  connectionNameChangeHandler: (e: ChangeEvent<HTMLInputElement>) => void;
  handleConnectionRowSelected: (args: { data?: ConnectionGridRow }) => void;
  handleDeleteConnection: (index: number) => void;
  dialogCloseFunc: () => void;
  dialogOpenFunc: () => void;
};

/**
 * Performs header as part of this module's internal workflow.
 *
 * @returns The computed result produced by this operation.
 */
function header(): ReactElement {
  return <div className="dialogHeader">Connections</div>;
}
/**
 * Performs connectionManagerFooter as part of this module's internal workflow.
 *
 * @param onClose - onClose parameter.
 * @returns The computed result produced by this operation.
 */

function connectionManagerFooter(onClose: () => void): ReactElement {
  return (
    <div>
      <button type="button" onClick={onClose}>
        OK
      </button>
    </div>
  );
}

type ConnectionFormControlsProps = Pick<
  ConnectionManagerViewProps,
  | "connectionName"
  | "connectionNameInputRef"
  | "connectionNameChangeHandler"
  | "shellOptions"
  | "selectedShellLabel"
  | "shellSelectRef"
  | "shellChangeHandler"
  | "wslDistros"
  | "selectedWslDistro"
  | "wslDistroChangeHandler"
  | "isWslShellSelected"
  | "commandsList"
  | "commandsListKey"
  | "handleOnReorder"
  | "addConnectionButtonRef"
  | "isAddingConnection"
>;

type ShellAndCommandsControlsProps = Pick<
  ConnectionFormControlsProps,
  | "shellOptions"
  | "selectedShellLabel"
  | "shellSelectRef"
  | "shellChangeHandler"
  | "wslDistros"
  | "selectedWslDistro"
  | "wslDistroChangeHandler"
  | "isWslShellSelected"
  | "commandsList"
  | "commandsListKey"
  | "handleOnReorder"
>;
/**
 * Performs ShellAndCommandsControls as part of this module's internal workflow.
 *
 * @param {
  shellOptions - {
  shellOptions parameter.
 * @param selectedShellLabel - selectedShellLabel parameter.
 * @param shellSelectRef - shellSelectRef parameter.
 * @param shellChangeHandler - shellChangeHandler parameter.
 * @param wslDistros - wslDistros parameter.
 * @param selectedWslDistro - selectedWslDistro parameter.
 * @param wslDistroChangeHandler - wslDistroChangeHandler parameter.
 * @param isWslShellSelected - isWslShellSelected parameter.
 * @param commandsList - commandsList parameter.
 * @param commandsListKey - commandsListKey parameter.
 * @param handleOnReorder - handleOnReorder parameter.
 * @param } - } parameter.
 * @returns The computed result produced by this operation.
 */

function ShellAndCommandsControls({
  shellOptions,
  selectedShellLabel,
  shellSelectRef,
  shellChangeHandler,
  wslDistros,
  selectedWslDistro,
  wslDistroChangeHandler,
  isWslShellSelected,
  commandsList,
  commandsListKey,
  handleOnReorder,
}: ShellAndCommandsControlsProps): ReactElement {
  return (
    <div className="horizontalControls">
      <div className="controlGroup">
        <label htmlFor="shellSelect">Shell</label>
        <select
          ref={shellSelectRef}
          className="controlInput"
          id="shellSelect"
          value={selectedShellLabel}
          onChange={shellChangeHandler}
        >
          {shellOptions.map((shell) => (
            <option key={shell.key} value={shell.label}>
              {shell.label}
            </option>
          ))}
        </select>
      </div>
      <div className="controlGroup">
        <label htmlFor="wslDistros">WSL Distros</label>
        <select
          className="controlInput"
          id="wslDistros"
          value={selectedWslDistro}
          onChange={wslDistroChangeHandler}
          disabled={!isWslShellSelected}
          title={!isWslShellSelected ? "Select WSL in Shell to enable this list" : undefined}
        >
          {wslDistros.map((distro) => (
            <option key={distro} value={distro}>
              {distro}
            </option>
          ))}
        </select>
      </div>
      <div className="controlGroup">
        <label htmlFor="commandsTreeView">Startup Commands</label>
        <DragAndDropList
          key={commandsListKey}
          id="commandsTreeView"
          items={commandsList}
          onReorder={handleOnReorder}
        />
      </div>
    </div>
  );
}
/**
 * Performs ConnectionFormControls as part of this module's internal workflow.
 *
 * @param {
  connectionName - {
  connectionName parameter.
 * @param connectionNameInputRef - connectionNameInputRef parameter.
 * @param connectionNameChangeHandler - connectionNameChangeHandler parameter.
 * @param shellOptions - shellOptions parameter.
 * @param selectedShellLabel - selectedShellLabel parameter.
 * @param shellSelectRef - shellSelectRef parameter.
 * @param shellChangeHandler - shellChangeHandler parameter.
 * @param wslDistros - wslDistros parameter.
 * @param selectedWslDistro - selectedWslDistro parameter.
 * @param wslDistroChangeHandler - wslDistroChangeHandler parameter.
 * @param isWslShellSelected - isWslShellSelected parameter.
 * @param commandsList - commandsList parameter.
 * @param commandsListKey - commandsListKey parameter.
 * @param handleOnReorder - handleOnReorder parameter.
 * @param addConnectionButtonRef - addConnectionButtonRef parameter.
 * @param isAddingConnection - isAddingConnection parameter.
 * @param } - } parameter.
 * @returns The computed result produced by this operation.
 */

function ConnectionFormControls({
  connectionName,
  connectionNameInputRef,
  connectionNameChangeHandler,
  shellOptions,
  selectedShellLabel,
  shellSelectRef,
  shellChangeHandler,
  wslDistros,
  selectedWslDistro,
  wslDistroChangeHandler,
  isWslShellSelected,
  commandsList,
  commandsListKey,
  handleOnReorder,
  addConnectionButtonRef,
  isAddingConnection,
}: ConnectionFormControlsProps): ReactElement {
  return (
    <>
      <div className="controlGroup controlGroupOfOne">
        <label htmlFor="connectionName">Connection Name</label>
        <input
          ref={connectionNameInputRef}
          className="controlInput"
          type="text"
          id="connectionName"
          value={connectionName}
          onChange={connectionNameChangeHandler}
          placeholder="Enter connection name"
        />
      </div>
      <ShellAndCommandsControls
        shellOptions={shellOptions}
        selectedShellLabel={selectedShellLabel}
        shellSelectRef={shellSelectRef}
        shellChangeHandler={shellChangeHandler}
        wslDistros={wslDistros}
        selectedWslDistro={selectedWslDistro}
        wslDistroChangeHandler={wslDistroChangeHandler}
        isWslShellSelected={isWslShellSelected}
        commandsList={commandsList}
        commandsListKey={commandsListKey}
        handleOnReorder={handleOnReorder}
      />
      <button
        ref={addConnectionButtonRef}
        id="addConnectionButton"
        type="button"
        className="connectionManagerItem connectionAddButton"
        disabled={isAddingConnection || !connectionName.trim()}
      >
        Add Connection
      </button>
    </>
  );
}

type ConnectionsDataGridProps = Pick<
  ConnectionManagerViewProps,
  "connections" | "connectionsGridRef" | "handleConnectionRowSelected" | "handleDeleteConnection"
>;
/**
 * Performs ConnectionsDataGrid as part of this module's internal workflow.
 *
 * @param {
  connections - {
  connections parameter.
 * @param connectionsGridRef - connectionsGridRef parameter.
 * @param handleConnectionRowSelected - handleConnectionRowSelected parameter.
 * @param handleDeleteConnection - handleDeleteConnection parameter.
 * @param } - } parameter.
 * @returns The computed result produced by this operation.
 */

function ConnectionsDataGrid({
  connections,
  connectionsGridRef,
  handleConnectionRowSelected,
  handleDeleteConnection,
}: ConnectionsDataGridProps): ReactElement {
  return (
    <>
      <GridComponent
        ref={connectionsGridRef}
        id="connectionsGrid"
        className="connectionManagerItem"
        dataSource={connections}
        rowSelected={handleConnectionRowSelected}
        allowResizing={true}
        rowHeight={22}
      >
        <ColumnsDirective>
          <ColumnDirective
            field="name"
            headerText="Name"
            width="100"
            allowResizing={true}
            clipMode="Ellipsis"
          />
          <ColumnDirective
            field="shell"
            headerText="Shell"
            width="60"
            allowResizing={true}
            clipMode="Ellipsis"
          />
          <ColumnDirective
            field="commands"
            headerText="Commands"
            allowResizing={true}
            clipMode="Ellipsis"
          />
          <ColumnDirective
            headerText="Action"
            width="45"
            allowResizing={false}
            template={(row: ConnectionGridRow): ReactElement => (
              <button
                type="button"
                className="connection-delete-button"
                onClick={() => handleDeleteConnection(row.connectionIndex)}
                title="Delete this connection"
              >
                Delete
              </button>
            )}
          />
        </ColumnsDirective>
      </GridComponent>
      <Inject services={[Resize]} />
    </>
  );
}

/**
 * Performs connection manager view as part of this module's public API.
 *
 * @param props - Value for `props` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
export default function ConnectionManagerView(props: ConnectionManagerViewProps): ReactElement {
  const { hideDialog, dialogCloseFunc, dialogOpenFunc } = props;

  return (
    <div>
      <DialogComponent
        className="dialogHeaderContainer"
        height="500px"
        width="600px"
        position={{ X: "center", Y: "center" }}
        visible={hideDialog}
        header={header}
        footerTemplate={() => connectionManagerFooter(dialogCloseFunc)}
        closeOnEscape={true}
        showCloseIcon={true}
        open={dialogOpenFunc}
        close={dialogCloseFunc}
        isModal={true}
      >
        <div className="connectionManagerContainer">
          <ConnectionFormControls {...props} />
          <ConnectionsDataGrid {...props} />
        </div>
      </DialogComponent>
    </div>
  );
}
