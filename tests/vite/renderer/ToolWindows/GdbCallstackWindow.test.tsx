// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GdbCallStackWindow from "../../../../src/renderer/ToolWindows/GdbCallstackWindow";

const mockAutoFitColumns = vi.fn();

vi.mock("@syncfusion/ej2-react-grids", () => ({
  GridComponent: React.forwardRef(
    ({ id, children }: { id: string; children: React.ReactNode }, ref: React.Ref<unknown>) => {
      React.useImperativeHandle(ref, () => ({
        autoFitColumns: mockAutoFitColumns,
        copy: vi.fn(),
      }));
      return <div id={id}>{children}</div>;
    },
  ),
  ColumnsDirective: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ColumnDirective: () => null,
  Inject: () => null,
  Resize: {},
  ColumnMenu: {},
}));

vi.mock("@syncfusion/ej2-react-navigations", () => ({
  ContextMenuComponent: () => <div data-testid="context-menu" />,
}));

const mockUnsubscribe = vi.fn();
let capturedStackCallback: ((data: unknown[]) => void) | null = null;

beforeEach(() => {
  mockAutoFitColumns.mockReset();
  mockUnsubscribe.mockReset();
  capturedStackCallback = null;

  (window as unknown as Record<string, unknown>).ipcToMain = {
    debuggerData: {
      stackFrames: vi.fn((cb: (data: unknown[]) => void) => {
        capturedStackCallback = cb;
        return mockUnsubscribe;
      }),
    },
    commands: {
      debugger: { sendGdbCommand: vi.fn() },
    },
  };
});

describe("GdbCallstackWindow smoke test", () => {
  it("renders without crashing", () => {
    render(<GdbCallStackWindow />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("mounts the callstack grid container", () => {
    render(<GdbCallStackWindow />);
    expect(document.getElementById("callstack-grid")).toBeTruthy();
  });

  it("subscribes to stack frame data on mount", () => {
    render(<GdbCallStackWindow />);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((window as any).ipcToMain.debuggerData.stackFrames).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes from stack frames on unmount", () => {
    const { unmount } = render(<GdbCallStackWindow />);
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it("does not call autoFitColumns when grid data is empty", () => {
    render(<GdbCallStackWindow />);
    expect(mockAutoFitColumns).not.toHaveBeenCalled();
  });

  it("calls autoFitColumns after stack frame data arrives", () => {
    render(<GdbCallStackWindow />);
    act(() => {
      capturedStackCallback?.([
        {
          active: true,
          level: 0,
          func: "main",
          addr: "0x1234",
          args: [],
          file: "main.c",
          fullName: "/path/main.c",
          line: "10",
          from: "",
          arch: "i386:x86-64",
        },
      ]);
    });
    expect(mockAutoFitColumns).toHaveBeenCalledTimes(1);
  });

  it("survives when autoFitColumns throws on empty grid (Syncfusion v33+ behavior)", () => {
    mockAutoFitColumns.mockImplementation(() => {
      throw new Error("autoFitColumns: grid not initialized");
    });
    // Guard prevents the call with empty data, so no throw
    expect(() => render(<GdbCallStackWindow />)).not.toThrow();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
