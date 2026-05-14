// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GdbBreakPointWindow from "../../../../src/renderer/ToolWindows/GdbBreakpointsWindow";

const mockRefresh = vi.fn();
let capturedActionBegin: ((args: unknown) => void) | null = null;
let capturedRecordDoubleClick: ((args: unknown) => void) | null = null;

vi.mock("@syncfusion/ej2-react-grids", () => ({
  GridComponent: ({
    id,
    children,
    ref,
    actionBegin,
    recordDoubleClick,
  }: {
    id: string;
    children: React.ReactNode;
    ref?: React.Ref<unknown>;
    actionBegin?: (args: unknown) => void;
    recordDoubleClick?: (args: unknown) => void;
  }) => {
    capturedActionBegin = actionBegin ?? null;
    capturedRecordDoubleClick = recordDoubleClick ?? null;
    void ref;
    return (
      <div id={id} data-refresh={mockRefresh as unknown as string}>
        {children}
      </div>
    );
  },
  ColumnsDirective: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ColumnDirective: () => null,
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

  (window as unknown as Record<string, unknown>).ipcToMain = {
    debuggerData: {
      breakpoints: vi.fn((cb: (data: Map<string, unknown>) => void) => {
        capturedBreakpointCallback = cb;
        return mockUnsubscribe;
      }),
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
  it("sends show-source-at notification when row has fullName and line", () => {
    render(<GdbBreakPointWindow />);
    const notifyMain = (
      window as unknown as {
        ipcToMain: { commands: { app: { notifyMain: ReturnType<typeof vi.fn> } } };
      }
    ).ipcToMain.commands.app.notifyMain;

    capturedRecordDoubleClick?.({
      rowData: { fullName: "/path/main.c", line: "10" },
    });

    expect(notifyMain).toHaveBeenCalledWith({
      command: "show-source-at",
      data: { fileName: "/path/main.c", line: "10" },
    });
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
