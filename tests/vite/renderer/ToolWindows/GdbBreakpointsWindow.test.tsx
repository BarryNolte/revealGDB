// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GdbBreakPointWindow from "../../../../src/renderer/ToolWindows/GdbBreakpointsWindow";

const mockRefresh = vi.fn();

vi.mock("@syncfusion/ej2-react-grids", () => ({
  GridComponent: ({
    id,
    children,
    ref,
  }: {
    id: string;
    children: React.ReactNode;
    ref?: React.Ref<unknown>;
  }) => {
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

beforeEach(() => {
  mockUnsubscribe.mockReset();
  mockRefresh.mockReset();
  capturedBreakpointCallback = null;

  (window as unknown as Record<string, unknown>).ipcToMain = {
    debuggerData: {
      breakpoints: vi.fn((cb: (data: Map<string, unknown>) => void) => {
        capturedBreakpointCallback = cb;
        return mockUnsubscribe;
      }),
    },
    commands: {
      debugger: { sendGdbCommand: vi.fn() },
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((window as any).ipcToMain.debuggerData.breakpoints).toHaveBeenCalledTimes(1);
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
