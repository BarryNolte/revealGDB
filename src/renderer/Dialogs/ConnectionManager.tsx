/**
 * Implements connection manager dialog state and interaction workflows in the renderer.
 *
 * @remarks
 * Exported symbols include `ConnectionManagerHandle`, `ConnectionManager`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { forwardRef, useImperativeHandle, useRef } from "react";
import "./ConnectionManager.css";
import ConnectionManagerView from "./ConnectionManagerView";
import {
  useConnectionManagerController,
  type ConnectionGridRow,
} from "./useConnectionManagerController";

export interface ConnectionManagerHandle {
  /** Opens the manager dialog and optionally invokes callback when closed. */
  ShowDialog: (onClose?: () => void) => void;
}

// If there are no props, keep this as an empty object type.
export type ConnectionManagerProps = Record<never, never>;

export const ConnectionManager = forwardRef<ConnectionManagerHandle, ConnectionManagerProps>(
  function ConnectionManager(_props, ref) {
    const onCloseCallbackRef = useRef<(() => void) | null>(null);

    const controller = useConnectionManagerController({
      onCloseCallbackRef,
    });

    useImperativeHandle(ref, () => ({
      /**
       * Performs show dialog as part of this module's public API.
       *
       * @param onClose - Callback invoked when the associated event occurs.
       */
      ShowDialog(onClose?: () => void) {
        controller.showDialog(onClose);
      },
    }));

    return (
      <ConnectionManagerView
        hideDialog={controller.hideDialog}
        shellOptions={controller.shellOptions}
        isWslShellSelected={controller.isWslShellSelected}
        commandsList={controller.commandsList}
        commandsListKey={controller.commandsListKey}
        connectionName={controller.connectionName}
        selectedShellLabel={controller.selectedShellLabel}
        wslDistros={controller.wslDistros}
        selectedWslDistro={controller.selectedWslDistro}
        isAddingConnection={controller.isAddingConnection}
        connections={controller.connections as ConnectionGridRow[]}
        connectionsGridRef={controller.connectionsGridRef}
        connectionNameInputRef={controller.connectionNameInputRef}
        shellSelectRef={controller.shellSelectRef}
        addConnectionButtonRef={controller.addConnectionButtonRef}
        handleOnReorder={controller.handleOnReorder}
        shellChangeHandler={controller.shellChangeHandler}
        wslDistroChangeHandler={controller.wslDistroChangeHandler}
        connectionNameChangeHandler={controller.connectionNameChangeHandler}
        handleConnectionRowSelected={controller.handleConnectionRowSelected}
        handleDeleteConnection={(index) => {
          void controller.handleDeleteConnection(index);
        }}
        dialogCloseFunc={controller.dialogCloseFunc}
        dialogOpenFunc={controller.dialogOpenFunc}
      />
    );
  },
);

ConnectionManager.displayName = "ConnectionManager";
