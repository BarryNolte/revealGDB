// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
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
