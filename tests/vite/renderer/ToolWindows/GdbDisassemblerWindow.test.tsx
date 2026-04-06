// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GdbDisassemblerWindow from "../../../../src/renderer/ToolWindows/GdbDisassemblerWindow";

vi.mock("@syncfusion/ej2-react-grids", () => ({
  GridComponent: ({ id, children }: { id: string; children: React.ReactNode }) => (
    <div id={id}>{children}</div>
  ),
  ColumnsDirective: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ColumnDirective: () => null,
  Inject: () => null,
  Resize: {},
  Reorder: {},
  Column: class {},
  Group: {},
}));

vi.mock("@syncfusion/ej2-react-dropdowns", () => ({
  ComboBoxComponent: () => <div data-testid="function-combobox" />,
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

const mockUnsubDisasm = vi.fn();
const mockUnsubFunctions = vi.fn();
type DisasmTestWindow = Window & {
  ipcToMain: {
    debuggerData: {
      disassembly: ReturnType<typeof vi.fn>;
      functions: ReturnType<typeof vi.fn>;
    };
  };
};

beforeEach(() => {
  mockUnsubDisasm.mockReset();
  mockUnsubFunctions.mockReset();

  (window as unknown as Record<string, unknown>).ipcToMain = {
    debuggerData: {
      disassembly: vi.fn(() => mockUnsubDisasm),
      functions: vi.fn(() => mockUnsubFunctions),
    },
    commands: {
      debugger: { sendGdbCommand: vi.fn() },
    },
  };
});

describe("GdbDisassemblerWindow smoke test", () => {
  it("renders without crashing", () => {
    render(<GdbDisassemblerWindow />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("mounts the disassembly grid container", () => {
    render(<GdbDisassemblerWindow />);
    expect(document.getElementById("disassembly-grid")).toBeTruthy();
  });

  it("renders the address and length inputs", () => {
    render(<GdbDisassemblerWindow />);
    expect(document.getElementById("asm-start")).toBeTruthy();
    expect(document.getElementById("asm-length")).toBeTruthy();
  });

  it("subscribes to disassembly and function data on mount", () => {
    render(<GdbDisassemblerWindow />);
    const ipc = (window as unknown as DisasmTestWindow).ipcToMain;
    expect(ipc.debuggerData.disassembly).toHaveBeenCalledTimes(1);
    expect(ipc.debuggerData.functions).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes from both data streams on unmount", () => {
    const { unmount } = render(<GdbDisassemblerWindow />);
    unmount();
    expect(mockUnsubDisasm).toHaveBeenCalledTimes(1);
    expect(mockUnsubFunctions).toHaveBeenCalledTimes(1);
  });
});


/**
 * @file GdbDisassemblerWindow.test.tsx
 * @description Source module for GdbDisassemblerWindow.test.
 */


/**
 * GdbDisassemblerWindow.test module.
 *
 * @remarks
 * Source module for GdbDisassemblerWindow.test.
 */
