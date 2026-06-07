/**
 * Implements GdbThreadsWindow.test for revealGDB.
 *
 * @remarks
 * Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GdbThreadsWindow from "../../../../src/renderer/ToolWindows/GdbThreadsWindow";

let capturedRecordDoubleClick: ((args: unknown) => void) | null = null;

vi.mock("@syncfusion/ej2-react-grids", () => ({
  GridComponent: ({
    id,
    children,
    recordDoubleClick,
  }: {
    id: string;
    children: React.ReactNode;
    recordDoubleClick?: (args: unknown) => void;
  }) => {
    capturedRecordDoubleClick = recordDoubleClick ?? null;
    return <div id={id}>{children}</div>;
  },
  ColumnsDirective: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ColumnDirective: () => null,
  Inject: () => null,
  Resize: {},
  ColumnMenu: {},
  Group: {},
}));

vi.mock("@syncfusion/ej2-react-navigations", () => ({
  ContextMenuComponent: () => <div data-testid="context-menu" />,
}));

const mockUnsubscribe = vi.fn();
let capturedThreadsCallback: ((data: unknown) => void) | null = null;

type ThreadsTestWindow = Window & {
  ipcToMain: {
    debuggerData: {
      threads: ReturnType<typeof vi.fn>;
    };
    commands: {
      debugger: { sendGdbCommand: ReturnType<typeof vi.fn> };
    };
  };
};

beforeEach(() => {
  capturedThreadsCallback = null;
  capturedRecordDoubleClick = null;
  mockUnsubscribe.mockReset();

  (window as unknown as Record<string, unknown>).ipcToMain = {
    debuggerData: {
      threads: vi.fn((cb: (data: unknown) => void) => {
        capturedThreadsCallback = cb;
        return mockUnsubscribe;
      }),
    },
    commands: {
      debugger: { sendGdbCommand: vi.fn() },
    },
  };
});

describe("GdbThreadsWindow smoke test", () => {
  it("renders without crashing", () => {
    render(<GdbThreadsWindow />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("mounts the threads grid container", () => {
    render(<GdbThreadsWindow />);
    expect(document.getElementById("threads-grid")).toBeTruthy();
  });

  it("subscribes to thread data on mount", () => {
    render(<GdbThreadsWindow />);
    const testWindow = window as unknown as ThreadsTestWindow;
    expect(testWindow.ipcToMain.debuggerData.threads).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes from thread data on unmount", () => {
    const { unmount } = render(<GdbThreadsWindow />);
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});

describe("GdbThreadsWindow IPC data and interactions", () => {
  it("renders without error when IPC callback fires with thread data", () => {
    render(<GdbThreadsWindow />);
    act(() => {
      capturedThreadsCallback?.({
        th: [{ id: "1", "target-id": "Thread 1", state: "stopped", frame: {} }],
        grp: [{ id: "i1", type: "process", pid: "123" }],
      });
    });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders without error when IPC callback fires with empty thread data", () => {
    render(<GdbThreadsWindow />);
    act(() => {
      capturedThreadsCallback?.({ th: [], grp: [] });
    });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("handleRowDoubleClick with row id sends thread-select command", () => {
    render(<GdbThreadsWindow />);
    const sendGdbCommand = (window as unknown as ThreadsTestWindow).ipcToMain.commands.debugger
      .sendGdbCommand;

    act(() => {
      capturedRecordDoubleClick?.({ rowData: { id: "3" } });
    });

    expect(sendGdbCommand).toHaveBeenCalledWith("-thread-select 3");
  });

  it("handleRowDoubleClick without row id does nothing", () => {
    render(<GdbThreadsWindow />);
    const sendGdbCommand = (window as unknown as ThreadsTestWindow).ipcToMain.commands.debugger
      .sendGdbCommand;

    act(() => {
      capturedRecordDoubleClick?.({ rowData: { id: "" } });
    });

    expect(sendGdbCommand).not.toHaveBeenCalled();
  });

  it("handleRowDoubleClick with no rowData does nothing", () => {
    render(<GdbThreadsWindow />);
    const sendGdbCommand = (window as unknown as ThreadsTestWindow).ipcToMain.commands.debugger
      .sendGdbCommand;

    act(() => {
      capturedRecordDoubleClick?.({ rowData: undefined });
    });

    expect(sendGdbCommand).not.toHaveBeenCalled();
  });
});

/**
 * @file GdbThreadsWindow.test.tsx
 * @description Source module for GdbThreadsWindow.test.
 */

/**
 * GdbThreadsWindow.test module.
 *
 * @remarks
 * Source module for GdbThreadsWindow.test.
 */
