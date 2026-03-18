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
import { forwardRef, RefObject, useImperativeHandle, useRef } from "react";
import "./ConnectionDialog.css";
import ConnectionDialogView from "./ConnectionDialogView";
import type { ConnectionManagerHandle } from "./ConnectionManager";
import { useConnectionDialogController } from "./useConnectionDialogController";

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
    const {
      connectionStateRows,
      definedConnections,
      selectedConnectionName,
      disconnectAvailable,
      onDialogClose,
      onConnectClick,
      onCancelConnectionClick,
      onSelectedConnectionChange,
      showDialog,
      hideDialog,
    } = useConnectionDialogController({
      connectionsRef,
      connDlgRef,
      outputRef,
    });

    useImperativeHandle(ref, () => ({
      ShowDialog: showDialog,
      HideDialog: hideDialog,
    }));

    return (
      <ConnectionDialogView
        connDlgRef={connDlgRef}
        gridRef={gridRef}
        outputRef={outputRef}
        connectionStateRows={connectionStateRows}
        definedConnections={definedConnections}
        selectedConnectionName={selectedConnectionName}
        disconnectAvailable={disconnectAvailable}
        onDialogClose={onDialogClose}
        onConnectClick={onConnectClick}
        onCancelConnectionClick={onCancelConnectionClick}
        onSelectedConnectionChange={onSelectedConnectionChange}
      />
    );
  },
);

ConnectionDialog.displayName = "Connection Dialog";
