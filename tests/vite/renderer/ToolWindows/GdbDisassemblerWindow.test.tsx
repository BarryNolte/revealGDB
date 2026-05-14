// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
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

vi.mock("@syncfusion/ej2-react-dropdowns", async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { forwardRef, useImperativeHandle, createElement } = await import("react");
  const ComboBoxComponent = forwardRef((_props: any, ref: any) => {
    useImperativeHandle(ref, () => ({ value: "" }), []);
    return createElement("div", { "data-testid": "function-combobox" });
  });
  return { ComboBoxComponent };
});

vi.mock("@syncfusion/ej2-react-buttons", () => ({
  ButtonComponent: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
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
const mockUnsubRegisters = vi.fn();
type DisasmTestWindow = Window & {
  ipcToMain: {
    debuggerData: {
      disassembly: ReturnType<typeof vi.fn>;
      functions: ReturnType<typeof vi.fn>;
      registers: ReturnType<typeof vi.fn>;
    };
    commands: {
      debugger: { sendGdbCommand: ReturnType<typeof vi.fn> };
    };
  };
};

beforeEach(() => {
  mockUnsubDisasm.mockReset();
  mockUnsubFunctions.mockReset();
  mockUnsubRegisters.mockReset();

  (window as unknown as Record<string, unknown>).ipcToMain = {
    debuggerData: {
      disassembly: vi.fn(() => mockUnsubDisasm),
      functions: vi.fn(() => mockUnsubFunctions),
      registers: vi.fn(() => mockUnsubRegisters),
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

describe("GdbDisassemblerWindow branch coverage", () => {
  it("sends GDB command when DISASM_FUNCTION fires with non-empty function name", () => {
    render(<GdbDisassemblerWindow />);
    const ipc = (window as unknown as DisasmTestWindow).ipcToMain;
    act(() => {
      window.dispatchEvent(new CustomEvent("disasm-function", { detail: "main" }));
    });
    expect(ipc.commands.debugger.sendGdbCommand).toHaveBeenCalledWith(
      "-data-disassemble -a main --opcodes bytes",
    );
  });

  it("does NOT send GDB command when DISASM_FUNCTION fires with empty function name", () => {
    render(<GdbDisassemblerWindow />);
    const ipc = (window as unknown as DisasmTestWindow).ipcToMain;
    act(() => {
      window.dispatchEvent(new CustomEvent("disasm-function", { detail: "" }));
    });
    expect(ipc.commands.debugger.sendGdbCommand).not.toHaveBeenCalled();
  });

  it("clicks Disassemble Function button but does NOT send GDB command when combo box is empty", () => {
    render(<GdbDisassemblerWindow />);
    const ipc = (window as unknown as DisasmTestWindow).ipcToMain;
    fireEvent.click(screen.getByText("Disassemble Function"));
    expect(ipc.commands.debugger.sendGdbCommand).not.toHaveBeenCalled();
  });

  it("does NOT send GDB command when Disassemble Address clicked with empty inputs", () => {
    render(<GdbDisassemblerWindow />);
    const ipc = (window as unknown as DisasmTestWindow).ipcToMain;
    fireEvent.click(screen.getByText("Disassemble Address"));
    expect(ipc.commands.debugger.sendGdbCommand).not.toHaveBeenCalled();
  });

  it("does NOT send GDB command when start is valid but length is empty", () => {
    render(<GdbDisassemblerWindow />);
    const ipc = (window as unknown as DisasmTestWindow).ipcToMain;
    const startInput = document.getElementById("asm-start") as HTMLInputElement;
    fireEvent.change(startInput, { target: { value: "0x1000" } });
    fireEvent.click(screen.getByText("Disassemble Address"));
    expect(ipc.commands.debugger.sendGdbCommand).not.toHaveBeenCalled();
  });

  it("sends GDB disassemble-by-address command for valid hex start and length", () => {
    render(<GdbDisassemblerWindow />);
    const ipc = (window as unknown as DisasmTestWindow).ipcToMain;
    const startInput = document.getElementById("asm-start") as HTMLInputElement;
    const lengthInput = document.getElementById("asm-length") as HTMLInputElement;
    fireEvent.change(startInput, { target: { value: "0x1000" } });
    fireEvent.change(lengthInput, { target: { value: "0x10" } });
    fireEvent.click(screen.getByText("Disassemble Address"));
    expect(ipc.commands.debugger.sendGdbCommand).toHaveBeenCalledWith(
      expect.stringContaining("-data-disassemble -s 0x1000"),
    );
  });

  it("sends GDB command using dollar-prefix start address as symbol", () => {
    render(<GdbDisassemblerWindow />);
    const ipc = (window as unknown as DisasmTestWindow).ipcToMain;
    const startInput = document.getElementById("asm-start") as HTMLInputElement;
    const lengthInput = document.getElementById("asm-length") as HTMLInputElement;
    fireEvent.change(startInput, { target: { value: "$main" } });
    fireEvent.change(lengthInput, { target: { value: "0x10" } });
    fireEvent.click(screen.getByText("Disassemble Address"));
    expect(ipc.commands.debugger.sendGdbCommand).toHaveBeenCalledWith(
      expect.stringContaining("-data-disassemble -s $main"),
    );
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
