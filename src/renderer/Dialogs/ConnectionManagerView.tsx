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
import { ConnectionGridRow } from "./useConnectionManagerController";

type ShellOptionView = {
  key: string;
  label: string;
};

type ConnectionManagerViewProps = {
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

function header(): ReactElement {
  return <div className="dialogHeader">Connections</div>;
}

export default function ConnectionManagerView(props: ConnectionManagerViewProps): ReactElement {
  const {
    hideDialog,
    shellOptions,
    isWslShellSelected,
    commandsList,
    commandsListKey,
    connectionName,
    selectedShellLabel,
    wslDistros,
    selectedWslDistro,
    isAddingConnection,
    connections,
    connectionsGridRef,
    connectionNameInputRef,
    shellSelectRef,
    addConnectionButtonRef,
    handleOnReorder,
    shellChangeHandler,
    wslDistroChangeHandler,
    connectionNameChangeHandler,
    handleConnectionRowSelected,
    handleDeleteConnection,
    dialogCloseFunc,
    dialogOpenFunc,
  } = props;

  const footer = (): ReactElement => {
    return (
      <div>
        <button type="button" onClick={dialogCloseFunc}>
          OK
        </button>
      </div>
    );
  };

  return (
    <div>
      <DialogComponent
        className="dialogHeaderContainer"
        height="500px"
        width="600px"
        position={{ X: "center", Y: "center" }}
        visible={hideDialog}
        header={header}
        footerTemplate={footer}
        closeOnEscape={true}
        showCloseIcon={true}
        open={dialogOpenFunc}
        close={dialogCloseFunc}
        isModal={true}
      >
        <div className="connectionManagerContainer">
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
          <button
            ref={addConnectionButtonRef}
            id="addConnectionButton"
            type="button"
            className="connectionManagerItem connectionAddButton"
            disabled={isAddingConnection || !connectionName.trim()}
          >
            Add Connection
          </button>
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
        </div>
      </DialogComponent>
    </div>
  );
}
