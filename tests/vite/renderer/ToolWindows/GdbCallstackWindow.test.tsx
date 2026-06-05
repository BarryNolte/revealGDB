/**
 * Implements GdbCallstackWindow.test for revealGDB.
 *
 * @remarks
 * Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GdbCallStackWindow from "../../../../src/renderer/ToolWindows/GdbCallstackWindow";

const mockAutoFitColumns = vi.fn();
let capturedRecordDoubleClick: ((args: unknown) => void) | null = null;

vi.mock("@syncfusion/ej2-react-grids", () => ({
  GridComponent: React.forwardRef(
    (
      {
        id,
        children,
        recordDoubleClick,
      }: {
        id: string;
        children: React.ReactNode;
        recordDoubleClick?: (args: unknown) => void;
      },
      ref: React.Ref<unknown>,
    ) => {
      capturedRecordDoubleClick = recordDoubleClick ?? null;
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
  Reorder: {},
  ColumnMenu: {},
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
type CallstackTestWindow = Window & {
  ipcToMain: {
    debuggerData: {
      stackFrames: ReturnType<typeof vi.fn>;
    };
  };
};

beforeEach(() => {
  mockAutoFitColumns.mockReset();
  capturedRecordDoubleClick = null;
  mockUnsubscribe.mockReset();

  (window as unknown as Record<string, unknown>).ipcToMain = {
    debuggerData: {
      stackFrames: vi.fn(() => {
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
    const testWindow = window as unknown as CallstackTestWindow;
    expect(testWindow.ipcToMain.debuggerData.stackFrames).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes from stack frames on unmount", () => {
    const { unmount } = render(<GdbCallStackWindow />);
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it("double-click forwards the selected stack frame to the debugger bridge", () => {
    render(<GdbCallStackWindow />);
    const sendGdbCommand = (window as unknown as CallstackTestWindow).ipcToMain.commands.debugger
      .sendGdbCommand;

    act(() => {
      capturedRecordDoubleClick?.({ rowData: { level: "3" } });
    });

    expect(sendGdbCommand).toHaveBeenCalledWith({
      kind: "select-stack-frame",
      frameLevel: "3",
    });
  });
});

/**
 * @file GdbCallstackWindow.test.tsx
 * @description Source module for GdbCallstackWindow.test.
 */

/**
 * GdbCallstackWindow.test module.
 *
 * @remarks
 * Source module for GdbCallstackWindow.test.
 */
