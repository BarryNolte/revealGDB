// @vitest-environment jsdom
import { act, render, waitFor } from "@testing-library/react";
import type { JSX } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceState } from "../../../../src/common/workspace-types";

const dockWorkspaceMocks = vi.hoisted(() => {
  const resizeSpy = vi.fn();

  class DockManagerMock {
    public config: { dialogRootElement: unknown; enableBrowserWindows: boolean } = {
      dialogRootElement: null,
      enableBrowserWindows: false,
    };

    public context = {
      model: {
        rootNode: { id: "root" },
        documentManagerNode: { id: "doc" },
      },
    };

    constructor(_element: HTMLElement) {}

    public initialize(): void {}

    public resize(width: number, height: number): void {
      resizeSpy(width, height);
    }

    public addLayoutListener(_listener: unknown): void {}

    public saveState(): string {
      return "{}";
    }

    public async loadState(_layoutJson: string): Promise<void> {
      return;
    }

    public getPanels(): Array<{ title: string }> {
      return [];
    }

    public dockFill(referenceNode: unknown, panel: unknown): unknown {
      return referenceNode ?? panel;
    }

    public dockRight(referenceNode: unknown, _panel: unknown, _ratio: number): unknown {
      return referenceNode;
    }

    public dockUp(referenceNode: unknown, _panel: unknown, _ratio: number): unknown {
      return referenceNode;
    }
  }

  class DockMenuConnectorMock {
    private readonly panels = new Map<string, { panel: object }>();

    constructor(_dockManager: unknown) {}

    public registerPanel(_id: string, displayName: string): void {
      this.panels.set(displayName, { panel: { id: displayName } });
    }

    public createAllWindows(): void {}

    public getPanelList(): Array<{ panel: object }> {
      return Array.from(this.panels.values());
    }

    public reconsilePanels(): void {}

    public getDockPanelInfoByDisplayName(displayName: string): { panel: object } | undefined {
      return this.panels.get(displayName);
    }
  }

  return {
    resizeSpy,
    DockManagerMock,
    DockMenuConnectorMock,
  };
});

vi.mock("../../../../node_modules/dock-spawn-ts/lib/js/DockManager.js", () => ({
  DockManager: dockWorkspaceMocks.DockManagerMock,
}));

vi.mock("../../../../src/renderer/utilities/DockMenuConnector", () => ({
  DockMenuConnector: dockWorkspaceMocks.DockMenuConnectorMock,
}));

vi.mock("../../../../src/renderer/utilities/dock-menu-state", () => ({
  setDockMenuConnector: vi.fn(),
}));

vi.mock("../../../../src/renderer/Errors/ToolWindowErrorBoundary", () => ({
  ToolWindowErrorBoundary: ({ children }: { children: JSX.Element }) => children,
}));

vi.mock("../../../../src/renderer/Errors/ToolWindowsHostErrorBoundary", () => ({
  ToolWindowsHostErrorBoundary: ({ children }: { children: JSX.Element }) => children,
}));

vi.mock("../../../../src/renderer/ToolWindows/GdbCommandWindow", () => ({
  default: () => null,
}));

vi.mock("../../../../src/renderer/ToolWindows/GdbSourceWindow", () => ({
  default: () => null,
}));

vi.mock("../../../../src/renderer/ToolWindows/GdbLocalsWindow.js", () => ({
  default: () => null,
}));
vi.mock("../../../../src/renderer/ToolWindows/GdbBreakpointsWindow.js", () => ({
  default: () => null,
}));
vi.mock("../../../../src/renderer/ToolWindows/GdbMemoryWindow.js", () => ({
  default: () => null,
}));
vi.mock("../../../../src/renderer/ToolWindows/GdbThreadsWindow.js", () => ({
  default: () => null,
}));
vi.mock("../../../../src/renderer/ToolWindows/GdbDisassemblerWindow.js", () => ({
  default: () => null,
}));
vi.mock("../../../../src/renderer/ToolWindows/GdbCallstackWindow.js", () => ({
  default: () => null,
}));
vi.mock("../../../../src/renderer/ToolWindows/GdbRegistersWindow.js", () => ({
  default: () => null,
}));

vi.mock("../../../../src/renderer/icons/icons8-local-48.png?asset", () => ({
  default: "icon-local.png",
}));
vi.mock("../../../../src/renderer/icons/icons8-source-code-48.png?asset", () => ({
  default: "icon-src.png",
}));

import { DockWorkspace } from "../../../../src/renderer/components/DockWorkspace";

function buildWorkspaceState(): WorkspaceState {
  return {
    id: "main-workspace",
    windows: [],
    hosts: [{ id: "main", label: "Main", visibleWindows: [] }],
    hostLayouts: { main: {} },
    updatedAt: Date.now(),
  };
}

describe("DockWorkspace resize regression", () => {
  beforeEach(() => {
    dockWorkspaceMocks.resizeSpy.mockClear();

    Object.defineProperty(window, "ipcToMain", {
      configurable: true,
      writable: true,
      value: {
        commands: {
          workspace: {
            saveHostLayout: vi.fn().mockResolvedValue(undefined),
          },
        },
      },
    });
  });

  it("resizes dock manager using host container dimensions on window resize", async () => {
    render(<DockWorkspace workspaceState={buildWorkspaceState()} />);

    await waitFor(() => {
      expect(document.getElementById("revealDockDiv")).toBeTruthy();
      expect(document.getElementById("revealDockManager")).toBeTruthy();
    });

    const dockRoot = document.getElementById("revealDockDiv") as HTMLDivElement;
    const dockManager = document.getElementById("revealDockManager") as HTMLDivElement;

    Object.defineProperty(dockRoot, "clientWidth", {
      configurable: true,
      get: () => 777,
    });
    Object.defineProperty(dockRoot, "clientHeight", {
      configurable: true,
      get: () => 555,
    });

    dockManager.getBoundingClientRect = vi.fn(() => ({
      width: 111,
      height: 222,
      top: 0,
      left: 0,
      bottom: 222,
      right: 111,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })) as unknown as () => DOMRect;

    await act(async () => {
      window.dispatchEvent(new Event("resize"));
    });

    await waitFor(() => {
      expect(dockWorkspaceMocks.resizeSpy).toHaveBeenCalled();
    });

    const [resizeWidth, resizeHeight] =
      dockWorkspaceMocks.resizeSpy.mock.calls[dockWorkspaceMocks.resizeSpy.mock.calls.length - 1];

    expect(resizeWidth).toBe(777);
    expect(resizeHeight).toBe(555);
  });
});
