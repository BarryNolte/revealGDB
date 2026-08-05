/**
 * Implements App.test for revealGDB.
 *
 * @remarks
 * Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 * Tests App component with new Phase 5-6 architecture: WorkspaceState + DockWorkspace delegation.
 */
// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceState } from "../../../src/common/workspace-types";

// =============================================================================
// Hoisted shared spies — referenced by vi.mock() class factories below
// =============================================================================
const appMocks = vi.hoisted(() => {
  // DockWorkspace mock spy
  const dockWorkspaceSpy = vi.fn();

  return {
    dockWorkspaceSpy,
    applyTheme: vi.fn(),
    setAppMainVersionInfo: vi.fn(),
  };
});

// =============================================================================
// Module mocks — use class syntax for constructors (vitest 4.x requirement)
// =============================================================================

vi.mock("../../../src/renderer/Components/DockWorkspace.tsx", () => ({
  DockWorkspace: ({
    workspaceState,
    onError,
  }: {
    workspaceState: WorkspaceState;
    onError: () => void;
  }) => (
    <div data-testid="dock-workspace">
      DockWorkspace Component
      <div id="revealDockDiv" />
      <div id="revealDockManager" />
      {/* Mock tool window containers */}
      <div id="sourceWindow" />
      <div id="localsWindow" />
      <div id="threadsWindow" />
      <div id="callstackWindow" />
      <div id="memoryWindow" />
      <div id="bpWindow" />
      <div id="registersWindow" />
      <div id="disassemblyWindow" />
      <div id="commandWindow" />
    </div>
  ),
}));

vi.mock("../../../src/renderer/theme-manager", () => ({
  applyTheme: appMocks.applyTheme,
}));

vi.mock("../../../src/renderer/utilities/app-version-state", () => ({
  setAppMainVersionInfo: appMocks.setAppMainVersionInfo,
}));

vi.mock("../../../src/renderer/Components/Toolbar.jsx", () => ({
  default: () => <div data-testid="toolbar" />,
}));

vi.mock("../../../src/renderer/Errors/ToolWindowErrorBoundary", () => ({
  ToolWindowErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../../../src/renderer/Errors/ToolWindowsHostErrorBoundary", () => ({
  ToolWindowsHostErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../../../src/renderer/ToolWindows/GdbSourceWindow", () => ({
  default: () => <div data-testid="source-window" />,
}));

vi.mock("../../../src/renderer/ToolWindows/GdbCommandWindow", () => ({
  default: () => <div data-testid="command-window" />,
}));

// Lazy-loaded dialogs
vi.mock("../../../src/renderer/Dialogs/AboutBox.js", () => ({
  AboutBox: React.forwardRef((_props: object, _ref: React.ForwardedRef<unknown>) => (
    <div data-testid="about-box" />
  )),
}));

vi.mock("../../../src/renderer/Dialogs/Settings.js", () => ({
  default: React.forwardRef((_props: object, _ref: React.ForwardedRef<unknown>) => (
    <div data-testid="settings" />
  )),
}));

vi.mock("../../../src/renderer/Dialogs/ConnectionManager.js", () => ({
  ConnectionManager: React.forwardRef((_props: object, _ref: React.ForwardedRef<unknown>) => (
    <div data-testid="connection-manager" />
  )),
}));

vi.mock("../../../src/renderer/Dialogs/ConnectionDialog.js", () => ({
  ConnectionDialog: React.forwardRef((_props: object, _ref: React.ForwardedRef<unknown>) => (
    <div data-testid="connection-dialog" />
  )),
}));

// Lazy-loaded tool windows
vi.mock("../../../src/renderer/ToolWindows/GdbBreakpointsWindow.js", () => ({
  default: () => <div data-testid="breakpoints-window" />,
}));

vi.mock("../../../src/renderer/ToolWindows/GdbCallstackWindow.js", () => ({
  default: () => <div data-testid="callstack-window" />,
}));

vi.mock("../../../src/renderer/ToolWindows/GdbDisassemblerWindow.js", () => ({
  default: () => <div data-testid="disassembly-window" />,
}));

vi.mock("../../../src/renderer/ToolWindows/GdbLocalsWindow.js", () => ({
  default: () => <div data-testid="locals-window" />,
}));

vi.mock("../../../src/renderer/ToolWindows/GdbMemoryWindow.js", () => ({
  default: () => <div data-testid="memory-window" />,
}));

vi.mock("../../../src/renderer/ToolWindows/GdbRegistersWindow.js", () => ({
  default: () => <div data-testid="registers-window" />,
}));

vi.mock("../../../src/renderer/ToolWindows/GdbThreadsWindow.js", () => ({
  default: () => <div data-testid="threads-window" />,
}));

// Icon assets (electron-vite ?asset query)
vi.mock("../../../src/renderer/icons/icons8-command-line-48.png?asset", () => ({
  default: "icon-cmd.png",
}));
vi.mock("../../../src/renderer/icons/icons8-cpu-48.png?asset", () => ({
  default: "icon-cpu.png",
}));
vi.mock("../../../src/renderer/icons/icons8-disassembly-48.png?asset", () => ({
  default: "icon-disasm.png",
}));
vi.mock("../../../src/renderer/icons/icons8-dot-48.png?asset", () => ({
  default: "icon-dot.png",
}));
vi.mock("../../../src/renderer/icons/icons8-hex-48.png?asset", () => ({
  default: "icon-hex.png",
}));
vi.mock("../../../src/renderer/icons/icons8-local-48.png?asset", () => ({
  default: "icon-local.png",
}));
vi.mock("../../../src/renderer/icons/icons8-source-code-48.png?asset", () => ({
  default: "icon-src.png",
}));
vi.mock("../../../src/renderer/icons/icons8-stack-48.png?asset", () => ({
  default: "icon-stack.png",
}));
vi.mock("../../../src/renderer/icons/icons8-thread-48.png?asset", () => ({
  default: "icon-thread.png",
}));

// =============================================================================
// Import App after all mocks
// =============================================================================
import App from "../../../src/renderer/App";

// =============================================================================
// Test helpers
// =============================================================================

type RenderCallback = (msg: { command: string }) => void;
type ThemeCallback = (data: { shouldUseDarkColors?: boolean }) => void;

let capturedRenderCallback: RenderCallback = () => {};
let capturedThemeCallback: ThemeCallback | null = null;
let unsubThemeMock: ReturnType<typeof vi.fn>;

/**
 * Builds a mock workspace state for testing.
 */
function buildMockWorkspaceState(): WorkspaceState {
  return {
    id: "main-workspace",
    windows: [
      {
        id: "source",
        title: "Source",
        body: "source",
        type: "source",
        group: "editor",
        isVisible: true,
        displayMode: "normal",
        windowState: { x: 0, y: 0, width: 800, height: 600 },
      },
    ],
    hosts: [
      {
        id: "main",
        label: "Main",
        visibleWindows: ["source"],
      },
    ],
    hostLayouts: {
      main: { nodes: [] },
    },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Performs buildIpc as part of this module's internal workflow.
 *
 * @param settingsData - settingsData parameter.
 * @param workspaceState - workspaceState parameter (optional).
 * @returns The computed result produced by this operation.
 */

function buildIpc(
  settingsData: unknown = { gui: {} },
  workspaceState: WorkspaceState | null = null,
) {
  unsubThemeMock = vi.fn();
  const defaultWorkspaceState = buildMockWorkspaceState();
  return {
    queries: {
      app: {
        getVersionInfo: vi.fn().mockResolvedValue({ version: "1.0.0" }),
        getSettings: vi.fn().mockResolvedValue(settingsData),
      },
      workspace: {
        getWorkspaceState: vi.fn().mockResolvedValue(workspaceState ?? defaultWorkspaceState),
      },
    },
    notifications: {
      render: vi.fn((cb: RenderCallback) => {
        capturedRenderCallback = cb;
      }),
      themeChanged: vi.fn((cb: ThemeCallback) => {
        capturedThemeCallback = cb;
        return unsubThemeMock;
      }),
    },
    commands: {
      app: { notifyMain: vi.fn() },
    },
  };
}

/** Render App and flush all async work (promise micro-tasks + a macro-task tick). */
async function renderApp(
  settingsData: unknown = { gui: {} },
  workspaceState: WorkspaceState | null = null,
) {
  (window as Record<string, unknown>).ipcToMain = buildIpc(settingsData, workspaceState);
  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(<App />);
    await new Promise((r) => setTimeout(r, 0));
  });
  return result;
}

// =============================================================================
// Tests: App component
// =============================================================================

describe("App component", () => {
  beforeEach(() => {
    appMocks.applyTheme.mockClear();
    appMocks.setAppMainVersionInfo.mockClear();
    capturedRenderCallback = () => {};
    capturedThemeCallback = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- Rendering ---

  it("renders the main-page-container div", async () => {
    const { container } = await renderApp();
    expect(container.querySelector(".main-page-container")).toBeTruthy();
  });

  it("renders the toolbar", async () => {
    await renderApp();
    expect(screen.getByTestId("toolbar")).toBeTruthy();
  });

  it("renders the DockWorkspace component when workspace state is loaded", async () => {
    await renderApp();
    expect(screen.getByTestId("dock-workspace")).toBeTruthy();
  });

  it("renders all nine tool-window container divs via DockWorkspace", async () => {
    await renderApp();
    const ids = [
      "sourceWindow",
      "localsWindow",
      "threadsWindow",
      "callstackWindow",
      "memoryWindow",
      "bpWindow",
      "registersWindow",
      "disassemblyWindow",
      "commandWindow",
    ];
    ids.forEach((id) => expect(document.getElementById(id), `#${id} missing`).toBeTruthy());
  });

  // --- Version info ---

  it("calls getVersionInfo on mount", async () => {
    const ipc = buildIpc();
    (window as Record<string, unknown>).ipcToMain = ipc;
    await act(async () => {
      render(<App />);
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(ipc.queries.app.getVersionInfo).toHaveBeenCalledTimes(1);
  });

  it("calls setAppMainVersionInfo with the resolved version data", async () => {
    await renderApp();
    expect(appMocks.setAppMainVersionInfo).toHaveBeenCalledWith({ version: "1.0.0" });
  });

  // --- Render notification commands ---

  it("registers the render notification callback", async () => {
    const ipc = buildIpc();
    (window as Record<string, unknown>).ipcToMain = ipc;
    render(<App />);
    expect(ipc.notifications.render).toHaveBeenCalledTimes(1);
  });

  it("about-box command: invokes optional ShowDialog without throwing", () => {
    (window as Record<string, unknown>).ipcToMain = buildIpc();
    render(<App />);
    expect(() => capturedRenderCallback({ command: "about-box" })).not.toThrow();
  });

  it("connection-dialog command: does not throw", () => {
    (window as Record<string, unknown>).ipcToMain = buildIpc();
    render(<App />);
    expect(() => capturedRenderCallback({ command: "connection-dialog" })).not.toThrow();
  });

  it("connections-dialog command: does not throw", () => {
    (window as Record<string, unknown>).ipcToMain = buildIpc();
    render(<App />);
    expect(() => capturedRenderCallback({ command: "connections-dialog" })).not.toThrow();
  });

  it("settings-dialog command: does not throw", () => {
    (window as Record<string, unknown>).ipcToMain = buildIpc();
    render(<App />);
    expect(() => capturedRenderCallback({ command: "settings-dialog" })).not.toThrow();
  });

  // --- Settings and theme ---

  it("calls getSettings on mount", async () => {
    const ipc = buildIpc({ gui: {} });
    (window as Record<string, unknown>).ipcToMain = ipc;
    await act(async () => {
      render(<App />);
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(ipc.queries.app.getSettings).toHaveBeenCalled();
  });

  it("applies saved applicationTheme from settings", async () => {
    await renderApp({ gui: { applicationTheme: "Dark" } });
    expect(appMocks.applyTheme).toHaveBeenCalledWith("Dark");
  });

  it("defaults to Auto theme when applicationTheme is absent", async () => {
    await renderApp({ gui: {} });
    expect(appMocks.applyTheme).toHaveBeenCalledWith("Auto");
  });

  // --- Workspace state loading ---

  it("queries workspace state on mount", async () => {
    const ipc = buildIpc();
    (window as Record<string, unknown>).ipcToMain = ipc;
    await act(async () => {
      render(<App />);
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(ipc.queries.workspace.getWorkspaceState).toHaveBeenCalled();
  });

  it("loads and passes workspace state to DockWorkspace", async () => {
    const customWorkspaceState = buildMockWorkspaceState();
    await renderApp({ gui: {} }, customWorkspaceState);
    expect(screen.getByTestId("dock-workspace")).toBeTruthy();
  });

  it("shows loading message before workspace state arrives", async () => {
    const ipc = buildIpc({ gui: {} }, null);
    // Mock the query to never resolve
    (ipc.queries.workspace.getWorkspaceState as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {}),
    );
    (window as Record<string, unknown>).ipcToMain = ipc;
    const { container } = render(<App />);
    // DockWorkspace won't be rendered until state is loaded
    expect(container.textContent).toContain("Loading workspace...");
  });

  it("handles workspace state loading errors gracefully", async () => {
    const ipc = buildIpc();
    (ipc.queries.workspace.getWorkspaceState as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Failed to load workspace"),
    );
    (window as Record<string, unknown>).ipcToMain = ipc;
    await act(async () => {
      render(<App />);
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(screen.getByText("Error Loading Workspace")).toBeTruthy();
  });

  // --- changeApplication event ---

  it("changeApplication with theme calls applyTheme with the theme value", async () => {
    await renderApp();
    appMocks.applyTheme.mockClear();
    window.dispatchEvent(new CustomEvent("changeApplication", { detail: { theme: "Light" } }));
    expect(appMocks.applyTheme).toHaveBeenCalledWith("Light");
  });

  it("changeApplication without theme does NOT call applyTheme", async () => {
    await renderApp();
    appMocks.applyTheme.mockClear();
    window.dispatchEvent(new CustomEvent("changeApplication", { detail: {} }));
    expect(appMocks.applyTheme).not.toHaveBeenCalled();
  });

  it("changeApplication with null detail does not throw", async () => {
    await renderApp();
    expect(() =>
      window.dispatchEvent(new CustomEvent("changeApplication", { detail: null })),
    ).not.toThrow();
  });

  // --- themeChanged notification ---

  it("subscribes to themeChanged notifications on mount", async () => {
    const ipc = buildIpc();
    (window as Record<string, unknown>).ipcToMain = ipc;
    await act(async () => {
      render(<App />);
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(ipc.notifications.themeChanged).toHaveBeenCalledTimes(1);
  });

  it("themeChanged with Auto mode calls applyTheme('Auto', shouldUseDarkColors)", async () => {
    const ipc = buildIpc({ gui: { applicationTheme: "Auto" } });
    (window as Record<string, unknown>).ipcToMain = ipc;
    await act(async () => {
      render(<App />);
      await new Promise((r) => setTimeout(r, 0));
    });
    appMocks.applyTheme.mockClear();
    await act(async () => {
      capturedThemeCallback?.({ shouldUseDarkColors: true });
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(appMocks.applyTheme).toHaveBeenCalledWith("Auto", true);
  });

  it("themeChanged with non-Auto mode does NOT call applyTheme", async () => {
    const ipc = buildIpc({ gui: { applicationTheme: "Light" } });
    (window as Record<string, unknown>).ipcToMain = ipc;
    await act(async () => {
      render(<App />);
      await new Promise((r) => setTimeout(r, 0));
    });
    appMocks.applyTheme.mockClear();
    await act(async () => {
      capturedThemeCallback?.({ shouldUseDarkColors: false });
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(appMocks.applyTheme).not.toHaveBeenCalled();
  });

  it("themeChanged with missing shouldUseDarkColors defaults to false", async () => {
    const ipc = buildIpc({ gui: { applicationTheme: "Auto" } });
    (window as Record<string, unknown>).ipcToMain = ipc;
    await act(async () => {
      render(<App />);
      await new Promise((r) => setTimeout(r, 0));
    });
    appMocks.applyTheme.mockClear();
    await act(async () => {
      capturedThemeCallback?.({});
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(appMocks.applyTheme).toHaveBeenCalledWith("Auto", false);
  });

  // --- Cleanup on unmount ---

  it("unmounting calls unsubTheme", async () => {
    const { unmount } = await renderApp();
    unmount();
    expect(unsubThemeMock).toHaveBeenCalledTimes(1);
  });

  it("unmounting removes the changeApplication event listener", async () => {
    const { unmount } = await renderApp();
    unmount();
    appMocks.applyTheme.mockClear();
    window.dispatchEvent(new CustomEvent("changeApplication", { detail: { theme: "Dark" } }));
    expect(appMocks.applyTheme).not.toHaveBeenCalled();
  });
});
