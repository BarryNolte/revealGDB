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
  ColumnMenu: {},
  Edit: {},
}));

vi.mock("@syncfusion/ej2-react-navigations", () => ({
  ContextMenuComponent: () => <div data-testid="context-menu" />,
}));

const mockUnsubscribe = vi.fn();

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((window as any).ipcToMain.debuggerData.registers).toHaveBeenCalledTimes(1);
  });
});
