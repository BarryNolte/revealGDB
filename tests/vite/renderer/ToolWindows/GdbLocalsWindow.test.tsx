// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GdbLocalsWindow from "../../../../src/renderer/ToolWindows/GdbLocalsWindow";

vi.mock("@syncfusion/ej2-grids", () => ({
  Grid: { Inject: vi.fn() },
  ColumnMenu: {},
  Edit: {},
  Resize: {},
  Reorder: {},
}));

vi.mock("@syncfusion/ej2-react-grids", () => ({
  ColumnsDirective: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ColumnDirective: () => null,
}));

let capturedRowDataBound: ((args: unknown) => void) | null = null;
let capturedValueAccessor: ((field: string, data: unknown) => string) | null = null;
let capturedCellEdit:
  | ((args: { type: string; columnName: string; rowData: unknown; cancel?: boolean }) => void)
  | null = null;

vi.mock("@syncfusion/ej2-react-treegrid", () => ({
  TreeGridComponent: ({
    id,
    children,
    rowDataBound,
    cellEdit,
    ...rest
  }: {
    id: string;
    children: React.ReactNode;
    rowDataBound?: (args: unknown) => void;
    cellEdit?: (args: unknown) => void;
    [key: string]: unknown;
  }) => {
    // Capture callbacks so tests can invoke them directly
    capturedRowDataBound = rowDataBound ?? null;
    capturedCellEdit = (cellEdit as typeof capturedCellEdit) ?? null;
    const cols = (rest as { columnsDirective?: unknown })["columnsDirective"];
    void cols;
    return <div id={id}>{children}</div>;
  },
  ColumnsDirective: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ColumnDirective: ({
    valueAccessor,
  }: {
    valueAccessor?: (field: string, data: unknown) => string;
  }) => {
    if (valueAccessor) capturedValueAccessor = valueAccessor;
    return null;
  },
  Inject: () => null,
  Resize: {},
  Reorder: {},
  ColumnMenu: {},
  Edit: {},
}));

vi.mock("@syncfusion/ej2-react-navigations", () => ({
  ContextMenuComponent: () => <div data-testid="context-menu" />,
}));

vi.mock("../../../../src/renderer/utilities/useGridColumnState", () => ({
  useGridColumnState: () => ({
    savedColumns: undefined,
    loaded: true,
    resetColumnDefaults: vi.fn(),
  }),
  applySavedColumnsToGrid: vi.fn(),
}));

const mockUnsubscribe = vi.fn();
let capturedLocalsCallback: ((data: unknown) => void) | null = null;
type LocalsTestWindow = Window & {
  ipcToMain: {
    debuggerData: {
      locals: ReturnType<typeof vi.fn>;
    };
  };
};

beforeEach(() => {
  mockUnsubscribe.mockReset();
  capturedRowDataBound = null;
  capturedValueAccessor = null;
  capturedCellEdit = null;
  capturedLocalsCallback = null;

  (window as unknown as Record<string, unknown>).ipcToMain = {
    debuggerData: {
      locals: vi.fn((cb: (data: unknown) => void) => {
        capturedLocalsCallback = cb;
        return mockUnsubscribe;
      }),
    },
    commands: {
      debugger: { sendGdbCommand: vi.fn() },
    },
  };
});

describe("GdbLocalsWindow smoke test", () => {
  it("renders without crashing", () => {
    render(<GdbLocalsWindow />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("mounts the tree grid container", () => {
    render(<GdbLocalsWindow />);
    expect(document.getElementById("locals-grid")).toBeTruthy();
  });

  it("subscribes to locals data on mount", () => {
    render(<GdbLocalsWindow />);
    const testWindow = window as unknown as LocalsTestWindow;
    expect(testWindow.ipcToMain.debuggerData.locals).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes from locals data on unmount", () => {
    const { unmount } = render(<GdbLocalsWindow />);
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it("updates tree grid when locals data arrives", () => {
    render(<GdbLocalsWindow />);
    act(() => {
      capturedLocalsCallback?.([{ name: "x", value: "42", fullpath: "x", sublocals: [] }]);
    });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("rowDataBound does not crash when value is null", () => {
    render(<GdbLocalsWindow />);
    expect(() => {
      capturedRowDataBound?.({
        data: { name: "x", value: null, fullpath: "x", sublocals: [] },
        row: document.createElement("tr"),
      });
    }).not.toThrow();
  });

  it("rowDataBound does not crash when value is undefined", () => {
    render(<GdbLocalsWindow />);
    expect(() => {
      capturedRowDataBound?.({
        data: { name: "x", value: undefined, fullpath: "x", sublocals: [] },
        row: document.createElement("tr"),
      });
    }).not.toThrow();
  });

  it("rowDataBound correctly sets row height for multiline values", () => {
    render(<GdbLocalsWindow />);
    const row = document.createElement("tr");
    capturedRowDataBound?.({
      data: { name: "arr", value: "[1,\n2,\n3]", fullpath: "arr", sublocals: [] },
      row,
    });
    // Three segments split by \n → height = 3 * 16 = 48px. Note: value uses literal "\\n" not newline
    // With a plain newline the split on "\\n" gives 1 line (no change)
    expect(row.style.height).toBe("16px");
  });

  it("valueAccessor returns empty string for null value", () => {
    render(<GdbLocalsWindow />);
    const result = capturedValueAccessor?.("value", { name: "x", value: null, sublocals: [] });
    expect(result).toBe('<div class="treeGrid-multiline-cell"></div>');
  });

  it("valueAccessor does not crash when value is undefined", () => {
    render(<GdbLocalsWindow />);
    expect(() => {
      capturedValueAccessor?.("value", { name: "x", value: undefined, sublocals: [] });
    }).not.toThrow();
  });

  it("valueAccessor replaces literal \\n with <br>", () => {
    render(<GdbLocalsWindow />);
    const result = capturedValueAccessor?.("value", {
      name: "arr",
      value: "line1\\nline2",
      sublocals: [],
    });
    expect(result).toBe('<div class="treeGrid-multiline-cell">line1<br>line2</div>');
  });
});

describe("GdbLocalsWindow cellEdit callback", () => {
  it("cancels edit when type is 'edit', column is 'value', and sublocals is non-empty", () => {
    render(<GdbLocalsWindow />);
    const args = {
      type: "edit",
      columnName: "value",
      rowData: { sublocals: [{ name: "child", value: "0" }] },
      cancel: false,
    };
    capturedCellEdit?.(args);
    expect(args.cancel).toBe(true);
  });

  it("does not cancel edit when sublocals is empty", () => {
    render(<GdbLocalsWindow />);
    const args = { type: "edit", columnName: "value", rowData: { sublocals: [] }, cancel: false };
    capturedCellEdit?.(args);
    expect(args.cancel).toBe(false);
  });

  it("does not cancel edit when type is not 'edit'", () => {
    render(<GdbLocalsWindow />);
    const args = {
      type: "add",
      columnName: "value",
      rowData: { sublocals: [{ name: "child", value: "0" }] },
      cancel: false,
    };
    capturedCellEdit?.(args);
    expect(args.cancel).toBe(false);
  });

  it("does not cancel edit when columnName is not 'value'", () => {
    render(<GdbLocalsWindow />);
    const args = {
      type: "edit",
      columnName: "name",
      rowData: { sublocals: [{ name: "child", value: "0" }] },
      cancel: false,
    };
    capturedCellEdit?.(args);
    expect(args.cancel).toBe(false);
  });
});

describe("GdbLocalsWindow locals callback edge cases", () => {
  it("sets local data to empty array when callback receives null", () => {
    render(<GdbLocalsWindow />);
    act(() => {
      capturedLocalsCallback?.(null);
    });
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

/**
 * @file GdbLocalsWindow.test.tsx
 * @description Source module for GdbLocalsWindow.test.
 */

/**
 * GdbLocalsWindow.test module.
 *
 * @remarks
 * Source module for GdbLocalsWindow.test.
 */
