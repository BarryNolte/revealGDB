// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GdbRegistersWindow from "../../../../src/renderer/ToolWindows/GdbRegistersWindow";

vi.mock("@syncfusion/ej2-react-grids", () => ({
  GridComponent: ({ id, children }: { id: string; children: React.ReactNode }) => (
    <div id={id}>{children}</div>
  ),
  ColumnsDirective: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ColumnDirective: () => null,
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
type RegistersTestWindow = Window & {
  ipcToMain: {
    debuggerData: {
      registers: ReturnType<typeof vi.fn>;
    };
  };
};

beforeEach(() => {
  (window as unknown as Record<string, unknown>).ipcToMain = {
    debuggerData: {
      registers: vi.fn(() => mockUnsubscribe),
    },
    commands: {
      debugger: { sendGdbCommand: vi.fn() },
    },
  };
});

describe("GdbRegistersWindow smoke test", () => {
  it("renders without crashing", () => {
    render(<GdbRegistersWindow />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("mounts the registers grid container", () => {
    render(<GdbRegistersWindow />);
    expect(document.getElementById("registers-grid")).toBeTruthy();
  });

  it("subscribes to register data on mount", () => {
    render(<GdbRegistersWindow />);
    const testWindow = window as unknown as RegistersTestWindow;
    expect(testWindow.ipcToMain.debuggerData.registers).toHaveBeenCalledTimes(1);
  });
});


/**
 * @file GdbRegistersWindow.test.tsx
 * @description Source module for GdbRegistersWindow.test.
 */


/**
 * GdbRegistersWindow.test module.
 *
 * @remarks
 * Source module for GdbRegistersWindow.test.
 */
