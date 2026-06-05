/**
 * Implements GdbMemoryWindow.test for revealGDB.
 *
 * @remarks
 * Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GdbMemoryWindow from "../../../../src/renderer/ToolWindows/GdbMemoryWindow";

vi.mock("../../../../src/renderer/Components/HexEditor/HexEditor", () => ({
  default: () => <div data-testid="hex-editor" />,
}));

const mockUnsubscribe = vi.fn();
type MemoryTestWindow = Window & {
  ipcToMain: {
    debuggerData: {
      memory: ReturnType<typeof vi.fn>;
    };
    commands: {
      debugger: { sendGdbCommand: ReturnType<typeof vi.fn> };
    };
  };
};

beforeEach(() => {
  mockUnsubscribe.mockReset();

  (window as unknown as Record<string, unknown>).ipcToMain = {
    debuggerData: {
      memory: vi.fn(() => mockUnsubscribe),
    },
    commands: {
      debugger: { sendGdbCommand: vi.fn() },
    },
  };
});

describe("GdbMemoryWindow smoke test", () => {
  it("renders without crashing", () => {
    render(<GdbMemoryWindow />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders the hex editor", () => {
    render(<GdbMemoryWindow />);
    expect(screen.getByTestId("hex-editor")).toBeTruthy();
  });

  it("renders the address and length inputs", () => {
    render(<GdbMemoryWindow />);
    expect(screen.getByPlaceholderText("Memory Address")).toBeTruthy();
    expect(screen.getByPlaceholderText("Length")).toBeTruthy();
  });

  it("subscribes to memory data on mount", () => {
    render(<GdbMemoryWindow />);
    const testWindow = window as unknown as MemoryTestWindow;
    expect(testWindow.ipcToMain.debuggerData.memory).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes from memory data on unmount", () => {
    const { unmount } = render(<GdbMemoryWindow />);
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});

describe("GdbMemoryWindow branch coverage", () => {
  it("does NOT send GDB command when Refresh Data clicked with empty inputs", () => {
    render(<GdbMemoryWindow />);
    const ipc = (window as unknown as MemoryTestWindow).ipcToMain;
    fireEvent.click(screen.getByDisplayValue("Refresh Data"));
    expect(ipc.commands.debugger.sendGdbCommand).not.toHaveBeenCalled();
  });

  it("sends GDB command when Refresh Data clicked with valid hex start and length", () => {
    render(<GdbMemoryWindow />);
    const ipc = (window as unknown as MemoryTestWindow).ipcToMain;
    const startInput = screen.getByPlaceholderText("Memory Address") as HTMLInputElement;
    const lengthInput = screen.getByPlaceholderText("Length") as HTMLInputElement;
    fireEvent.change(startInput, { target: { value: "0x1000" } });
    fireEvent.change(lengthInput, { target: { value: "0x10" } });
    fireEvent.click(screen.getByDisplayValue("Refresh Data"));
    expect(ipc.commands.debugger.sendGdbCommand).toHaveBeenCalledWith(
      expect.stringContaining("-data-read-memory-bytes 0x1000"),
    );
  });

  it("sends GDB command with dollar-prefix start address as symbol", () => {
    render(<GdbMemoryWindow />);
    const ipc = (window as unknown as MemoryTestWindow).ipcToMain;
    const startInput = screen.getByPlaceholderText("Memory Address") as HTMLInputElement;
    const lengthInput = screen.getByPlaceholderText("Length") as HTMLInputElement;
    fireEvent.change(startInput, { target: { value: "$main" } });
    fireEvent.change(lengthInput, { target: { value: "0x10" } });
    fireEvent.click(screen.getByDisplayValue("Refresh Data"));
    expect(ipc.commands.debugger.sendGdbCommand).toHaveBeenCalledWith(
      expect.stringContaining("-data-read-memory-bytes $main"),
    );
  });

  it("triggers validation when Enter is pressed in the start input", () => {
    render(<GdbMemoryWindow />);
    const ipc = (window as unknown as MemoryTestWindow).ipcToMain;
    const startInput = screen.getByPlaceholderText("Memory Address");
    fireEvent.keyDown(startInput, { key: "Enter" });
    expect(ipc.commands.debugger.sendGdbCommand).not.toHaveBeenCalled();
  });

  it("does nothing when a non-Enter key is pressed in the start input", () => {
    render(<GdbMemoryWindow />);
    const ipc = (window as unknown as MemoryTestWindow).ipcToMain;
    const startInput = screen.getByPlaceholderText("Memory Address");
    fireEvent.keyDown(startInput, { key: "a" });
    expect(ipc.commands.debugger.sendGdbCommand).not.toHaveBeenCalled();
  });

  it("triggers validation when Enter is pressed in the length input", () => {
    render(<GdbMemoryWindow />);
    const ipc = (window as unknown as MemoryTestWindow).ipcToMain;
    const lengthInput = screen.getByPlaceholderText("Length");
    fireEvent.keyDown(lengthInput, { key: "Enter" });
    expect(ipc.commands.debugger.sendGdbCommand).not.toHaveBeenCalled();
  });

  it("does nothing when a non-Enter key is pressed in the length input", () => {
    render(<GdbMemoryWindow />);
    const ipc = (window as unknown as MemoryTestWindow).ipcToMain;
    const lengthInput = screen.getByPlaceholderText("Length");
    fireEvent.keyDown(lengthInput, { key: "a" });
    expect(ipc.commands.debugger.sendGdbCommand).not.toHaveBeenCalled();
  });
});

/**
 * @file GdbMemoryWindow.test.tsx
 * @description Source module for GdbMemoryWindow.test.
 */

/**
 * GdbMemoryWindow.test module.
 *
 * @remarks
 * Source module for GdbMemoryWindow.test.
 */
