/**
 * Implements GdbRegistersWindow.test for revealGDB.
 *
 * @remarks
 * Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GdbRegistersWindow from "../../../../src/renderer/ToolWindows/GdbRegistersWindow";

let capturedQueryCellInfo: ((args: unknown) => void) | null = null;
let capturedValidationRules: Record<string, unknown> | null = null;

vi.mock("@syncfusion/ej2-react-grids", () => ({
  GridComponent: ({
    id,
    children,
    queryCellInfo,
  }: {
    id: string;
    children: React.ReactNode;
    queryCellInfo?: (args: unknown) => void;
  }) => {
    capturedQueryCellInfo = queryCellInfo ?? null;
    return <div id={id}>{children}</div>;
  },
  ColumnsDirective: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ColumnDirective: ({ validationRules }: { validationRules?: Record<string, unknown> }) => {
    if (validationRules) capturedValidationRules = validationRules;
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
type RegistersTestWindow = Window & {
  ipcToMain: {
    debuggerData: {
      registers: ReturnType<typeof vi.fn>;
    };
  };
};

beforeEach(() => {
  capturedQueryCellInfo = null;
  capturedValidationRules = null;
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

describe("GdbRegistersWindow queryCellInfo callback", () => {
  it("adds changed-cell class when field is 'value' and changed is true", () => {
    render(<GdbRegistersWindow />);
    const mockAdd = vi.fn();
    capturedQueryCellInfo?.({
      column: { field: "value" },
      data: { changed: true },
      cell: { classList: { add: mockAdd } },
    });
    expect(mockAdd).toHaveBeenCalledWith("register-changed-cell");
  });

  it("does not add class when changed is false", () => {
    render(<GdbRegistersWindow />);
    const mockAdd = vi.fn();
    capturedQueryCellInfo?.({
      column: { field: "value" },
      data: { changed: false },
      cell: { classList: { add: mockAdd } },
    });
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("does not add class when field is not 'value'", () => {
    render(<GdbRegistersWindow />);
    const mockAdd = vi.fn();
    capturedQueryCellInfo?.({
      column: { field: "name" },
      data: { changed: true },
      cell: { classList: { add: mockAdd } },
    });
    expect(mockAdd).not.toHaveBeenCalled();
  });
});

describe("GdbRegistersWindow hexCheck validation", () => {
  it("returns true for a valid hex value with 0x prefix", () => {
    render(<GdbRegistersWindow />);
    const hexCheck = (capturedValidationRules?.hexFormat as unknown[])?.[0] as (e: {
      element: Element;
      value: string;
    }) => boolean;
    expect(hexCheck?.({ element: document.createElement("input"), value: "0x1A2B" })).toBe(true);
  });

  it("returns true for a valid hex value without prefix", () => {
    render(<GdbRegistersWindow />);
    const hexCheck = (capturedValidationRules?.hexFormat as unknown[])?.[0] as (e: {
      element: Element;
      value: string;
    }) => boolean;
    expect(hexCheck?.({ element: document.createElement("input"), value: "DEADBEEF" })).toBe(true);
  });

  it("returns false for an invalid non-hex value", () => {
    render(<GdbRegistersWindow />);
    const hexCheck = (capturedValidationRules?.hexFormat as unknown[])?.[0] as (e: {
      element: Element;
      value: string;
    }) => boolean;
    expect(hexCheck?.({ element: document.createElement("input"), value: "xyz" })).toBe(false);
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
