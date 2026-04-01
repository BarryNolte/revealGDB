// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GdbThreadsWindow from "../../../../src/renderer/ToolWindows/GdbThreadsWindow";

vi.mock("@syncfusion/ej2-react-grids", () => ({
  GridComponent: ({ id, children }: { id: string; children: React.ReactNode }) => (
    <div id={id}>{children}</div>
  ),
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

beforeEach(() => {
  (window as unknown as Record<string, unknown>).ipcToMain = {
    debuggerData: {
      threads: vi.fn(() => mockUnsubscribe),
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((window as any).ipcToMain.debuggerData.threads).toHaveBeenCalledTimes(1);
  });
});
