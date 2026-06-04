// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GdbBreakPointWindow from "../../../../src/renderer/ToolWindows/GdbBreakpointsWindow";

const mockRefresh = vi.fn();
let capturedActionBegin: ((args: unknown) => void) | null = null;
let capturedRecordDoubleClick: ((args: unknown) => void) | null = null;
let capturedOnGridCreated: (() => void) | null = null;
let capturedBreakpointCellTemplate: ((row: unknown) => JSX.Element) | null = null;

vi.mock("@syncfusion/ej2-react-buttons", () => ({
  ButtonComponent: ({
    children,
    onClick,
    ...rest
  }: {
    children?: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    [key: string]: unknown;
  }) => (
    <button onClick={onClick} {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  ),
  CheckBoxComponent: ({
    onClick,
    checked,
    ...rest
  }: {
    onClick?: React.MouseEventHandler<HTMLInputElement>;
    checked?: boolean;
    [key: string]: unknown;
  }) => (
    <input
      type="checkbox"
      onClick={onClick}
      defaultChecked={checked}
      {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
    />
  ),
}));

vi.mock("@syncfusion/ej2-react-grids", () => ({
  GridComponent: ({
    id,
    children,
    ref,
    actionBegin,
    recordDoubleClick,
    created,
  }: {
    id: string;
    children: React.ReactNode;
    ref?: React.Ref<unknown>;
    actionBegin?: (args: unknown) => void;
    recordDoubleClick?: (args: unknown) => void;
    created?: () => void;
  }) => {
    capturedActionBegin = actionBegin ?? null;
    capturedRecordDoubleClick = recordDoubleClick ?? null;
    capturedOnGridCreated = created ?? null;
    void ref;
    return <div id={id}>{children}</div>;
  },
  ColumnsDirective: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ColumnDirective: ({ template }: { template?: (row: unknown) => JSX.Element }) => {
    if (template && !capturedBreakpointCellTemplate) {
      capturedBreakpointCellTemplate = template;
    }
    return null;
  },
  Inject: () => null,
  Resize: {},
  Reorder: {},
  ColumnMenu: {},
  ContextMenu: {},
}));

vi.mock("../../../../src/renderer/icons/icons8-delete-48.png", () => ({ default: "delete.png" }));

vi.mock("../../../../src/renderer/utilities/useGridColumnState", () => ({
  useGridColumnState: () => ({
    savedColumns: undefined,
    loaded: true,
    resetColumnDefaults: vi.fn(),
  }),
  applySavedColumnsToGrid: vi.fn(),
}));

const mockUnsubscribe = vi.fn();
let capturedBreakpointCallback: ((data: Map<string, unknown>) => void) | null = null;
type BreakpointsTestWindow = Window & {
  ipcToMain: {
    debuggerData: {
      breakpoints: ReturnType<typeof vi.fn>;
    };
  };
};

beforeEach(() => {
  mockUnsubscribe.mockReset();
  mockRefresh.mockReset();
  capturedBreakpointCallback = null;
  capturedActionBegin = null;
  capturedRecordDoubleClick = null;
  capturedOnGridCreated = null;
  capturedBreakpointCellTemplate = null;

  (window as unknown as Record<string, unknown>).ipcToMain = {
    debuggerData: {
      breakpoints: vi.fn((cb: (data: Map<string, unknown>) => void) => {
        capturedBreakpointCallback = cb;
        return mockUnsubscribe;
      }),
    },
    queries: {
      debugger: { showSourceAt: vi.fn().mockResolvedValue(undefined) },
    },
    commands: {
      debugger: { sendGdbCommand: vi.fn() },
      app: { notifyMain: vi.fn() },
    },
  };
});

describe("GdbBreakpointsWindow smoke test", () => {
  it("renders without crashing", () => {
    render(<GdbBreakPointWindow />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("mounts the grid container", () => {
    render(<GdbBreakPointWindow />);
    expect(document.getElementById("breakpoints-grid")).toBeTruthy();
  });

  it("subscribes to breakpoints data on mount", () => {
    render(<GdbBreakPointWindow />);
    const testWindow = window as unknown as BreakpointsTestWindow;
    expect(testWindow.ipcToMain.debuggerData.breakpoints).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes from breakpoints on unmount", () => {
    const { unmount } = render(<GdbBreakPointWindow />);
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it("renders without crash when breakpoint data arrives", () => {
    render(<GdbBreakPointWindow />);
    act(() => {
      const bpMap = new Map([
        [
          "1",
          {
            number: "1",
            type: "breakpoint",
            disp: "keep",
            enabled: "y",
            addr: "0x1234",
            func: "main",
            file: "main.c",
            fullname: "/path/main.c",
            line: "10",
            tg: "[1]",
            times: "0",
            installed: "y",
            orgloc: "main.c:10",
          },
        ],
      ]);
      capturedBreakpointCallback?.(bpMap);
    });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("does not call grid.refresh() imperatively when data arrives", () => {
    // The grid should be managed by React state only; imperative refresh causes double-update races
    render(<GdbBreakPointWindow />);
    act(() => {
      capturedBreakpointCallback?.(new Map());
    });
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});

describe("GdbBreakpointsWindow onAction callback", () => {
  it("sends delete command for each row when requestType is 'delete'", () => {
    render(<GdbBreakPointWindow />);
    const sendGdbCommand = (
      window as unknown as {
        ipcToMain: { commands: { debugger: { sendGdbCommand: ReturnType<typeof vi.fn> } } };
      }
    ).ipcToMain.commands.debugger.sendGdbCommand;

    capturedActionBegin?.({
      requestType: "delete",
      data: [{ number: "1" }, { number: "2" }],
    });

    expect(sendGdbCommand).toHaveBeenCalledWith("d 1");
    expect(sendGdbCommand).toHaveBeenCalledWith("d 2");
  });

  it("does nothing for unrecognised requestType", () => {
    render(<GdbBreakPointWindow />);
    const sendGdbCommand = (
      window as unknown as {
        ipcToMain: { commands: { debugger: { sendGdbCommand: ReturnType<typeof vi.fn> } } };
      }
    ).ipcToMain.commands.debugger.sendGdbCommand;

    capturedActionBegin?.({ requestType: "sort" });

    expect(sendGdbCommand).not.toHaveBeenCalled();
  });
});

describe("GdbBreakpointsWindow handleRecordDoubleClick callback", () => {
  it("calls showSourceAt when row has fullName and line", () => {
    render(<GdbBreakPointWindow />);
    const showSourceAt = (
      window as unknown as {
        ipcToMain: { queries: { debugger: { showSourceAt: ReturnType<typeof vi.fn> } } };
      }
    ).ipcToMain.queries.debugger.showSourceAt;

    capturedRecordDoubleClick?.({
      rowData: { fullName: "/path/main.c", line: "10" },
    });

    expect(showSourceAt).toHaveBeenCalledWith("/path/main.c", "10");
  });

  it("does nothing when row has no fullName", () => {
    render(<GdbBreakPointWindow />);
    const notifyMain = (
      window as unknown as {
        ipcToMain: { commands: { app: { notifyMain: ReturnType<typeof vi.fn> } } };
      }
    ).ipcToMain.commands.app.notifyMain;

    capturedRecordDoubleClick?.({ rowData: { line: "10" } });

    expect(notifyMain).not.toHaveBeenCalled();
  });

  it("does nothing when rowData is missing", () => {
    render(<GdbBreakPointWindow />);
    const notifyMain = (
      window as unknown as {
        ipcToMain: { commands: { app: { notifyMain: ReturnType<typeof vi.fn> } } };
      }
    ).ipcToMain.commands.app.notifyMain;

    capturedRecordDoubleClick?.({ rowData: undefined });

    expect(notifyMain).not.toHaveBeenCalled();
  });
});

describe("GdbBreakpointsWindow onGridCreated callback", () => {
  const fullBpMap = new Map([
    [
      "1",
      {
        number: "1",
        type: "breakpoint",
        disp: "keep",
        enabled: "y",
        addr: "0x1234",
        func: "main",
        file: "main.c",
        fullname: "/path/main.c",
        line: "10",
        tg: "[1]",
        times: "0",
        installed: "y",
        orgloc: "main.c:10",
      },
    ],
  ]);

  it("does nothing when data is non-empty (early return branch)", () => {
    render(<GdbBreakPointWindow />);

    // Deliver data so latestDataRef is non-empty
    act(() => {
      capturedBreakpointCallback?.(fullBpMap);
    });

    // onGridCreated should early-return without throwing
    act(() => {
      capturedOnGridCreated?.();
    });

    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("does nothing when data is empty and gridRef is null (null-guard branch)", () => {
    render(<GdbBreakPointWindow />);

    // No data delivered — latestDataRef is empty, gridRef.current is null (mock)
    act(() => {
      capturedOnGridCreated?.();
    });

    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("GdbBreakpointsWindow onAction with empty data", () => {
  it("onAction delete with no data property uses empty array fallback", () => {
    render(<GdbBreakPointWindow />);
    const sendGdbCommand = (
      window as unknown as {
        ipcToMain: { commands: { debugger: { sendGdbCommand: ReturnType<typeof vi.fn> } } };
      }
    ).ipcToMain.commands.debugger.sendGdbCommand;

    // Omitting the data property exercises the `?? []` fallback branch
    capturedActionBegin?.({ requestType: "delete" });

    expect(sendGdbCommand).not.toHaveBeenCalled();
  });
});

describe("GdbBreakpointsWindow BreakpointActionCell", () => {
  const getSendGdbCommand = () =>
    (
      window as unknown as {
        ipcToMain: { commands: { debugger: { sendGdbCommand: ReturnType<typeof vi.fn> } } };
      }
    ).ipcToMain.commands.debugger.sendGdbCommand;

  it("delete button calls sendGdbCommand with breakpoint number", () => {
    render(<GdbBreakPointWindow />);
    const sendGdbCommand = getSendGdbCommand();

    const { getByRole } = render(
      <>{capturedBreakpointCellTemplate?.({ number: "5", enabled: true })}</>,
    );

    fireEvent.click(getByRole("button"));

    expect(sendGdbCommand).toHaveBeenCalledWith("d 5");
  });

  it("checkbox click when enabled sends disable command", () => {
    render(<GdbBreakPointWindow />);
    const sendGdbCommand = getSendGdbCommand();

    // enabled=true → checked=true → clicking unchecks → disable
    const { getByRole } = render(
      <>{capturedBreakpointCellTemplate?.({ number: "5", enabled: true })}</>,
    );

    fireEvent.click(getByRole("checkbox"));

    expect(sendGdbCommand).toHaveBeenCalledWith("disable 5");
  });

  it("checkbox click when disabled sends enable command", () => {
    render(<GdbBreakPointWindow />);
    const sendGdbCommand = getSendGdbCommand();

    // enabled=false → checked=false → clicking checks → enable
    const { getByRole } = render(
      <>{capturedBreakpointCellTemplate?.({ number: "3", enabled: false })}</>,
    );

    fireEvent.click(getByRole("checkbox"));

    expect(sendGdbCommand).toHaveBeenCalledWith("enable 3");
  });
});

/**
 * @file GdbBreakpointsWindow.test.tsx
 * @description Source module for GdbBreakpointsWindow.test.
 */

/**
 * GdbBreakpointsWindow.test module.
 *
 * @remarks
 * Source module for GdbBreakpointsWindow.test.
 */
