// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { act, createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  ConnectionManager,
  type ConnectionManagerHandle,
} from "../../../../src/renderer/Dialogs/ConnectionManager";

const connectionManagerMocks = vi.hoisted(() => ({
  showDialog: vi.fn(),
  deleteConnection: vi.fn(),
  hideDialog: false,
  viewProps: null as Record<string, unknown> | null,
}));

vi.mock("../../../../src/renderer/Dialogs/useConnectionManagerController", () => ({
  useConnectionManagerController: () => ({
    hideDialog: connectionManagerMocks.hideDialog,
    shellOptions: [{ key: "wsl", label: "WSL" }],
    isWslShellSelected: true,
    commandsList: [{ text: "gdb", id: "one" }],
    commandsListKey: "gdb",
    connectionName: "Primary",
    selectedShellLabel: "WSL",
    wslDistros: ["default", "Ubuntu"],
    selectedWslDistro: "Ubuntu",
    isAddingConnection: false,
    connections: [{ connectionIndex: 0, name: "Primary", shell: "WSL", commands: "gdb" }],
    connectionsGridRef: { current: null },
    connectionNameInputRef: { current: null },
    shellSelectRef: { current: null },
    addConnectionButtonRef: { current: null },
    handleOnReorder: vi.fn(),
    shellChangeHandler: vi.fn(),
    wslDistroChangeHandler: vi.fn(),
    connectionNameChangeHandler: vi.fn(),
    handleConnectionRowSelected: vi.fn(),
    handleDeleteConnection: connectionManagerMocks.deleteConnection,
    dialogCloseFunc: vi.fn(),
    dialogOpenFunc: vi.fn(),
    showDialog: connectionManagerMocks.showDialog,
  }),
}));

vi.mock("../../../../src/renderer/Dialogs/ConnectionManagerView", () => ({
  default: (props: Record<string, unknown>) => {
    connectionManagerMocks.viewProps = props;
    return <div data-testid="connection-manager-view">{String(props.connectionName)}</div>;
  },
}));

describe("ConnectionManager", () => {
  it("wires the imperative ShowDialog handle into the controller and passes controller state to the view", () => {
    const ref = createRef<ConnectionManagerHandle>();
    const onClose = vi.fn();

    render(<ConnectionManager ref={ref} />);

    expect(screen.getByTestId("connection-manager-view").textContent).toBe("Primary");
    expect(connectionManagerMocks.viewProps?.selectedShellLabel).toBe("WSL");
    expect(connectionManagerMocks.viewProps?.selectedWslDistro).toBe("Ubuntu");

    act(() => {
      ref.current?.ShowDialog(onClose);
    });

    expect(connectionManagerMocks.showDialog).toHaveBeenCalledWith(onClose);
  });

  it("handleDeleteConnection wrapper calls the controller delete handler", () => {
    render(<ConnectionManager />);

    act(() => {
      (connectionManagerMocks.viewProps?.handleDeleteConnection as (i: number) => void)(2);
    });

    expect(connectionManagerMocks.deleteConnection).toHaveBeenCalledWith(2);
  });
});
