// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { act, createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  ConnectionDialog,
  type WhileConnectingDialogHandle,
} from "../../../../src/renderer/Dialogs/ConnectionDialog";

const connectionDialogMocks = vi.hoisted(() => ({
  showDialog: vi.fn(),
  hideDialog: vi.fn(),
  onDialogClose: vi.fn(),
  onConnectClick: vi.fn(),
  onCancelConnectionClick: vi.fn(),
  onSelectedConnectionChange: vi.fn(),
  viewProps: null as Record<string, unknown> | null,
}));

vi.mock("../../../../src/renderer/Dialogs/useConnectionDialogController", () => ({
  useConnectionDialogController: () => ({
    connectionStateRows: [{ step: 0, name: "Starting Shell", state: "pending" }],
    definedConnections: [{ name: "Primary" }],
    selectedConnectionName: "Primary",
    disconnectAvailable: false,
    onDialogClose: connectionDialogMocks.onDialogClose,
    onConnectClick: connectionDialogMocks.onConnectClick,
    onCancelConnectionClick: connectionDialogMocks.onCancelConnectionClick,
    onSelectedConnectionChange: connectionDialogMocks.onSelectedConnectionChange,
    showDialog: connectionDialogMocks.showDialog,
    hideDialog: connectionDialogMocks.hideDialog,
  }),
}));

vi.mock("../../../../src/renderer/Dialogs/ConnectionDialogView", () => ({
  default: (props: Record<string, unknown>) => {
    connectionDialogMocks.viewProps = props;
    return <div data-testid="connection-dialog-view">{String(props.selectedConnectionName)}</div>;
  },
}));

describe("ConnectionDialog", () => {
  it("wires the imperative handle to controller actions and passes controller state to the view", () => {
    const ref = createRef<WhileConnectingDialogHandle>();

    render(<ConnectionDialog ref={ref} />);

    expect(screen.getByTestId("connection-dialog-view").textContent).toBe("Primary");
    expect(connectionDialogMocks.viewProps?.disconnectAvailable).toBe(false);
    expect(connectionDialogMocks.viewProps?.definedConnections).toEqual([{ name: "Primary" }]);

    act(() => {
      ref.current?.ShowDialog();
      ref.current?.HideDialog();
    });

    expect(connectionDialogMocks.showDialog).toHaveBeenCalledTimes(1);
    expect(connectionDialogMocks.hideDialog).toHaveBeenCalledTimes(1);
  });
});
