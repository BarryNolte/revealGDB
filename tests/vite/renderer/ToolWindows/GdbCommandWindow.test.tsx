/**
 * Implements GdbCommandWindow.test for revealGDB.
 *
 * @remarks
 * Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("@syncfusion/ej2-react-navigations", () => ({
  ContextMenuComponent: () => null,
}));

vi.mock("../../../../src/renderer/ToolWindows/GdbCommandWindow.css", () => ({}));

vi.mock("../../../../src/renderer/ToolWindows/ToolWindowContent", () => ({
  ToolWindowContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("../../../../src/renderer/utilities/Clipboard", () => ({
  doCutCopyPaste: vi.fn(),
  menuCopyAll: [],
  menuCutCopyPaste: [],
}));

const mockController = {
  outputRef: { current: null as HTMLDivElement | null },
  inputRef: { current: null as HTMLInputElement | null },
  historyRef: { current: null as HTMLSelectElement | null },
  onSelectKeydownHandler: vi.fn(),
  onInputKeyupHandler: vi.fn(),
  onInputKeydownHandler: vi.fn(),
  onScrollHandler: vi.fn(),
  onShowHistory: vi.fn(),
  onSendCommand: vi.fn(),
  onClearWindow: vi.fn(),
};

vi.mock("../../../../src/renderer/ToolWindows/useGdbCommandController", () => ({
  useGdbCommandController: vi.fn(() => mockController),
}));

// Import after mocks so the module system uses the mocked versions
import GdbCommandWindow from "../../../../src/renderer/ToolWindows/GdbCommandWindow";

// ── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockController.onSendCommand.mockReset();
  mockController.onShowHistory.mockReset();
  mockController.onClearWindow.mockReset();
  mockController.onInputKeydownHandler.mockReset();
  mockController.onInputKeyupHandler.mockReset();
  mockController.onScrollHandler.mockReset();
  mockController.onSelectKeydownHandler.mockReset();
});

describe("GdbCommandWindow", () => {
  it("renders without crashing", () => {
    render(<GdbCommandWindow />);
    expect(screen.getByTestId("gdb-command-window")).toBeTruthy();
  });

  it("renders the output div", () => {
    render(<GdbCommandWindow />);
    expect(screen.getByTestId("gdb-command-output")).toBeTruthy();
  });

  it("renders the history select element (hidden)", () => {
    render(<GdbCommandWindow />);
    const history = screen.getByTestId("gdb-command-history");
    expect(history).toBeTruthy();
    expect(history.hasAttribute("hidden")).toBe(true);
  });

  it("renders the text input", () => {
    render(<GdbCommandWindow />);
    expect(screen.getByTestId("gdb-command-input")).toBeTruthy();
  });

  it("renders the Send button", () => {
    render(<GdbCommandWindow />);
    expect(screen.getByTestId("gdb-command-send")).toBeTruthy();
  });

  it("renders the History button", () => {
    render(<GdbCommandWindow />);
    expect(screen.getByTestId("gdb-command-show-history")).toBeTruthy();
  });

  it("renders the Clear button", () => {
    render(<GdbCommandWindow />);
    expect(screen.getByTestId("gdb-command-clear")).toBeTruthy();
  });

  it("clicking Send calls onSendCommand", () => {
    render(<GdbCommandWindow />);
    fireEvent.click(screen.getByTestId("gdb-command-send"));
    expect(mockController.onSendCommand).toHaveBeenCalledTimes(1);
  });

  it("clicking History calls onShowHistory", () => {
    render(<GdbCommandWindow />);
    fireEvent.click(screen.getByTestId("gdb-command-show-history"));
    expect(mockController.onShowHistory).toHaveBeenCalledTimes(1);
  });

  it("clicking Clear calls onClearWindow", () => {
    render(<GdbCommandWindow />);
    fireEvent.click(screen.getByTestId("gdb-command-clear"));
    expect(mockController.onClearWindow).toHaveBeenCalledTimes(1);
  });

  it("keydown on input calls onInputKeydownHandler", () => {
    render(<GdbCommandWindow />);
    fireEvent.keyDown(screen.getByTestId("gdb-command-input"), { key: "Enter" });
    expect(mockController.onInputKeydownHandler).toHaveBeenCalledTimes(1);
  });

  it("keyup on input calls onInputKeyupHandler", () => {
    render(<GdbCommandWindow />);
    fireEvent.keyUp(screen.getByTestId("gdb-command-input"), { key: "a" });
    expect(mockController.onInputKeyupHandler).toHaveBeenCalledTimes(1);
  });

  it("keydown on history select calls onSelectKeydownHandler", () => {
    render(<GdbCommandWindow />);
    fireEvent.keyDown(screen.getByTestId("gdb-command-history"), { key: "Enter" });
    expect(mockController.onSelectKeydownHandler).toHaveBeenCalledTimes(1);
  });

  it("scroll on output calls onScrollHandler", () => {
    render(<GdbCommandWindow />);
    fireEvent.scroll(screen.getByTestId("gdb-command-output"));
    expect(mockController.onScrollHandler).toHaveBeenCalledTimes(1);
  });

  it("input has the placeholder text", () => {
    render(<GdbCommandWindow />);
    const input = screen.getByTestId("gdb-command-input") as HTMLInputElement;
    expect(input.placeholder).toBe("Type your command here...");
  });
});
