// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import React, { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import ConnectionManagerView from "../../../../src/renderer/Dialogs/ConnectionManagerView";

vi.mock("../../../../src/renderer/Components/DragAndDropList/DragAndDropList", () => ({
  __esModule: true,
  default: ({ items }: { items: Array<{ text: string }> }) => (
    <div data-testid="drag-and-drop-list">{items.map((item) => item.text).join(",")}</div>
  ),
  DragAndDropListItem: class {},
}));

vi.mock("@syncfusion/ej2-react-popups", () => ({
  DialogComponent: ({
    visible,
    header,
    footerTemplate,
    children,
  }: {
    visible?: boolean;
    header?: React.ReactNode | (() => React.ReactNode);
    footerTemplate?: React.ReactNode | (() => React.ReactNode);
    children?: React.ReactNode;
  }) =>
    visible ? (
      <div role="dialog">
        <div>{typeof header === "function" ? header() : header}</div>
        <div>{children}</div>
        <div>{typeof footerTemplate === "function" ? footerTemplate() : footerTemplate}</div>
      </div>
    ) : null,
}));

vi.mock("@syncfusion/ej2-react-grids", () => ({
  GridComponent: ({
    dataSource,
    children,
  }: {
    dataSource: Array<Record<string, unknown>>;
    children?: React.ReactNode;
  }) => {
    const flatten = (nodes: React.ReactNode): React.ReactElement[] =>
      React.Children.toArray(nodes).flatMap((child) => {
        if (!React.isValidElement(child)) {
          return [];
        }

        const nestedChildren = child.props?.children;
        return nestedChildren ? flatten(nestedChildren) : [child];
      }) as React.ReactElement[];

    const columns = flatten(children);

    return (
      <div data-testid="connections-grid">
        {dataSource.map((row, index) => (
          <div key={`row-${index}`}>
            {columns.map((column, columnIndex) => {
              if (typeof column.props.template === "function") {
                return <div key={`template-${columnIndex}`}>{column.props.template(row)}</div>;
              }

              const field = column.props.field as string | undefined;
              return field ? (
                <span key={`field-${columnIndex}`}>{String(row[field] ?? "")}</span>
              ) : null;
            })}
          </div>
        ))}
      </div>
    );
  },
  ColumnsDirective: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  ColumnDirective: () => null,
  Inject: () => null,
  Resize: class {},
}));

describe("ConnectionManagerView", () => {
  it("renders shell and WSL controls, disables add when needed, and wires delete and close actions", () => {
    const dialogCloseFunc = vi.fn();
    const handleDeleteConnection = vi.fn();

    const { rerender } = render(
      <ConnectionManagerView
        hideDialog={true}
        shellOptions={[
          { key: "wsl", label: "WSL" },
          { key: "bash", label: "Bash" },
        ]}
        isWslShellSelected={false}
        commandsList={[{ text: "gdb", id: "1" }]}
        commandsListKey="gdb"
        connectionName=""
        selectedShellLabel="WSL"
        wslDistros={["default", "Ubuntu"]}
        selectedWslDistro="default"
        isAddingConnection={false}
        connections={[{ connectionIndex: 0, name: "Primary", shell: "WSL", commands: "gdb" }]}
        connectionsGridRef={createRef()}
        connectionNameInputRef={createRef()}
        shellSelectRef={createRef()}
        addConnectionButtonRef={createRef()}
        handleOnReorder={vi.fn()}
        shellChangeHandler={vi.fn()}
        wslDistroChangeHandler={vi.fn()}
        connectionNameChangeHandler={vi.fn()}
        handleConnectionRowSelected={vi.fn()}
        handleDeleteConnection={handleDeleteConnection}
        dialogCloseFunc={dialogCloseFunc}
        dialogOpenFunc={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByLabelText("Shell")).toBeTruthy();
    expect((screen.getByLabelText("WSL Distros") as HTMLSelectElement).disabled).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Add Connection" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(screen.getByTestId("drag-and-drop-list").textContent).toContain("gdb");

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(handleDeleteConnection).toHaveBeenCalledWith(0);

    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(dialogCloseFunc).toHaveBeenCalledTimes(1);

    rerender(
      <ConnectionManagerView
        hideDialog={true}
        shellOptions={[{ key: "wsl", label: "WSL" }]}
        isWslShellSelected={true}
        commandsList={[{ text: "gdb", id: "1" }]}
        commandsListKey="gdb"
        connectionName="Primary"
        selectedShellLabel="WSL"
        wslDistros={["default"]}
        selectedWslDistro="default"
        isAddingConnection={true}
        connections={[]}
        connectionsGridRef={createRef()}
        connectionNameInputRef={createRef()}
        shellSelectRef={createRef()}
        addConnectionButtonRef={createRef()}
        handleOnReorder={vi.fn()}
        shellChangeHandler={vi.fn()}
        wslDistroChangeHandler={vi.fn()}
        connectionNameChangeHandler={vi.fn()}
        handleConnectionRowSelected={vi.fn()}
        handleDeleteConnection={handleDeleteConnection}
        dialogCloseFunc={dialogCloseFunc}
        dialogOpenFunc={vi.fn()}
      />,
    );

    expect((screen.getByLabelText("WSL Distros") as HTMLSelectElement).disabled).toBe(false);
    expect(
      (screen.getByRole("button", { name: "Add Connection" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
