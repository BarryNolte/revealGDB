// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import React, { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import ConnectionDialogView from "../../../../src/renderer/Dialogs/ConnectionDialogView";

vi.mock("@syncfusion/ej2-react-buttons", () => ({
  ButtonComponent: ({
    onClick,
    disabled,
    children,
    id,
  }: {
    onClick?: () => void;
    disabled?: boolean;
    children?: React.ReactNode;
    id?: string;
  }) => (
    <button type="button" id={id} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock("@syncfusion/ej2-react-dropdowns", () => ({
  ComboBoxComponent: ({
    dataSource,
    value,
    change,
  }: {
    dataSource: Array<{ name: string }>;
    value?: string;
    change?: (args: { itemData: { name: string } }) => void;
  }) => (
    <select
      aria-label="defined-connections"
      value={value}
      onChange={(event) => {
        const item = dataSource.find((entry) => entry.name === event.target.value);
        if (item) {
          change?.({ itemData: item });
        }
      }}
    >
      {dataSource.map((entry) => (
        <option key={entry.name} value={entry.name}>
          {entry.name}
        </option>
      ))}
    </select>
  ),
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
      <div data-testid="connection-state-grid">
        <div data-testid="grid-headers">
          {columns.map((column, columnIndex) => {
            if (typeof column.props.headerTemplate === "function") {
              return (
                <span key={`header-${columnIndex}`}>
                  {column.props.headerTemplate({ headerText: column.props.headerText ?? "" })}
                </span>
              );
            }
            return null;
          })}
        </div>
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
}));

vi.mock("@syncfusion/ej2-react-popups", () => ({
  DialogComponent: ({
    header,
    footerTemplate,
    children,
  }: {
    header?: React.ReactNode | (() => React.ReactNode);
    footerTemplate?: React.ReactNode | (() => React.ReactNode);
    children?: React.ReactNode;
  }) => (
    <div role="dialog">
      <div>{typeof header === "function" ? header() : header}</div>
      <div>{children}</div>
      <div>{typeof footerTemplate === "function" ? footerTemplate() : footerTemplate}</div>
    </div>
  ),
}));

describe("ConnectionDialogView", () => {
  it("renders connection state rows, toggles connect/cancel buttons, and emits connection selection changes", () => {
    const onDialogClose = vi.fn();
    const onConnectClick = vi.fn();
    const onCancelConnectionClick = vi.fn();
    const onSelectedConnectionChange = vi.fn();

    const { rerender } = render(
      <ConnectionDialogView
        connDlgRef={createRef()}
        gridRef={createRef()}
        outputRef={createRef()}
        connectionStateRows={[
          { step: 0, name: "Pending", state: "pending" },
          { step: 1, name: "Running", state: "in-progress" },
          { step: 2, name: "Complete", state: "completed" },
          { step: 3, name: "Failed", state: "failed" },
        ]}
        definedConnections={[{ name: "Primary" }, { name: "Backup" }]}
        selectedConnectionName="Primary"
        disconnectAvailable={false}
        onDialogClose={onDialogClose}
        onConnectClick={onConnectClick}
        onCancelConnectionClick={onCancelConnectionClick}
        onSelectedConnectionChange={onSelectedConnectionChange}
      />,
    );

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Connecting...")).toBeTruthy();
    expect(screen.getByAltText("pending")).toBeTruthy();
    expect(screen.getByAltText("in-progress")).toBeTruthy();
    expect(screen.getByAltText("completed")).toBeTruthy();
    expect(screen.getByAltText("failed")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("defined-connections"), {
      target: { value: "Backup" },
    });
    expect(onSelectedConnectionChange).toHaveBeenCalledWith({ name: "Backup" });

    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    expect(onConnectClick).toHaveBeenCalledTimes(1);
    expect(
      (screen.getByRole("button", { name: "Cancel Connection" }) as HTMLButtonElement).disabled,
    ).toBe(true);

    rerender(
      <ConnectionDialogView
        connDlgRef={createRef()}
        gridRef={createRef()}
        outputRef={createRef()}
        connectionStateRows={[{ step: 0, name: "Pending", state: "pending" }]}
        definedConnections={[{ name: "Primary" }]}
        selectedConnectionName="Primary"
        disconnectAvailable={true}
        onDialogClose={onDialogClose}
        onConnectClick={onConnectClick}
        onCancelConnectionClick={onCancelConnectionClick}
        onSelectedConnectionChange={onSelectedConnectionChange}
      />,
    );

    expect((screen.getByRole("button", { name: "Connect" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel Connection" }));
    expect(onCancelConnectionClick).toHaveBeenCalledTimes(1);
  });
});
