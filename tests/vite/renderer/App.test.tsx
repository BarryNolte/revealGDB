/**
 * Implements App.test for revealGDB.
 *
 * @remarks
 * Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// =============================================================================
// Hoisted shared spies — referenced by vi.mock() class factories below
// =============================================================================
const appMocks = vi.hoisted(() => {
  // DockManager method spies
  const dmSpies = {
    ctor: vi.fn(),
    initialize: vi.fn(),
    addLayoutListener: vi.fn(),
    loadState: vi.fn().mockResolvedValue(undefined),
    dockFill: vi.fn().mockReturnValue("fillNode"),
    dockRight: vi.fn().mockReturnValue("rightNode"),
    dockUp: vi.fn().mockReturnValue("upNode"),
    resize: vi.fn(),
    saveState: vi.fn().mockReturnValue('{"layout":"test"}'),
  };

  // DockMenuConnector method spies
  const dcSpies = {
    ctor: vi.fn(),
    registerPanel: vi.fn(),
    createAllWindows: vi.fn(),
    getPanelByDisplayName: vi.fn().mockReturnValue({ title: "panel" }),
    reconsilePanels: vi.fn(),
  };

  let _connector: Record<string, unknown> | null = null;

  return {
    dmSpies,
    dcSpies,
    applyTheme: vi.fn(),
    setAppMainVersionInfo: vi.fn(),
    getDockConnector: () => _connector,
    setDockConnector: (c: Record<string, unknown> | null) => {
      _connector = c;
    },
    resetDockConnector: () => {
      _connector = null;
    },
  };
});

// =============================================================================
// Module mocks — use class syntax for constructors (vitest 4.x requirement)
// =============================================================================

vi.mock("../../../node_modules/dock-spawn-ts/lib/js/DockManager.js", () => ({
  DockManager: class {
    config = { dialogRootElement: null as unknown, enableBrowserWindows: true };
    context = { model: { documentManagerNode: "docNode" } };
    initialize = appMocks.dmSpies.initialize;
    addLayoutListener = appMocks.dmSpies.addLayoutListener;
    loadState = appMocks.dmSpies.loadState;
    dockFill = appMocks.dmSpies.dockFill;
    dockRight = appMocks.dmSpies.dockRight;
    dockUp = appMocks.dmSpies.dockUp;
    resize = appMocks.dmSpies.resize;
    saveState = appMocks.dmSpies.saveState;
    constructor() {
      appMocks.dmSpies.ctor();
    }
  },
}));

vi.mock("../../../src/renderer/utilities/DockMenuConnector.js", () => ({
  DockMenuConnector: class {
    registerPanel = appMocks.dcSpies.registerPanel;
    createAllWindows = appMocks.dcSpies.createAllWindows;
    getPanelByDisplayName = appMocks.dcSpies.getPanelByDisplayName;
    reconsilePanels = appMocks.dcSpies.reconsilePanels;
    constructor(...args: unknown[]) {
      appMocks.dcSpies.ctor(...args);
      appMocks.setDockConnector(this as unknown as Record<string, unknown>);
    }
  },
}));

vi.mock("../../../src/renderer/utilities/dock-menu-state", () => ({
  get dockMenuConnector() {
    return appMocks.getDockConnector();
  },
  setDockMenuConnector: (c: Record<string, unknown> | null) => appMocks.setDockConnector(c),
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
 * Performs buildIpc as part of this module's internal workflow.
 *
 * @param settingsData - settingsData parameter.
 * @returns The computed result produced by this operation.
 */

function buildIpc(settingsData: unknown = { gui: {} }) {
  unsubThemeMock = vi.fn();
  return {
    queries: {
      app: {
        getVersionInfo: vi.fn().mockResolvedValue({ version: "1.0.0" }),
        getSettings: vi.fn().mockResolvedValue(settingsData),
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
async function renderApp(settingsData: unknown = { gui: {} }) {
  (window as Record<string, unknown>).ipcToMain = buildIpc(settingsData);
  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(<App />);
    await new Promise((r) => setTimeout(r, 0));
  });
  return result;
}

// =============================================================================
// Tests: module-level listeners (before first dock init)
// =============================================================================

describe("App module-level save-dock-layout listener (no dock init)", () => {
  it("returns early without calling notifyMain when dockManager is not yet set", () => {
    const notifyMain = vi.fn();
    (window as Record<string, unknown>).ipcToMain = {
      commands: { app: { notifyMain } },
    };
    window.dispatchEvent(new Event("save-dock-layout"));
    expect(notifyMain).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Tests: App component
// =============================================================================

describe("App component", () => {
  beforeEach(() => {
    appMocks.dmSpies.ctor.mockClear();
    appMocks.dmSpies.initialize.mockClear();
    appMocks.dmSpies.addLayoutListener.mockClear();
    appMocks.dmSpies.loadState.mockReset();
    appMocks.dmSpies.loadState.mockResolvedValue(undefined);
    appMocks.dmSpies.dockFill.mockReturnValue("fillNode");
    appMocks.dmSpies.dockRight.mockReturnValue("rightNode");
    appMocks.dmSpies.dockUp.mockReturnValue("upNode");
    appMocks.dmSpies.saveState.mockReturnValue('{"layout":"test"}');
    appMocks.dmSpies.resize.mockClear();
    appMocks.dcSpies.ctor.mockClear();
    appMocks.dcSpies.registerPanel.mockClear();
    appMocks.dcSpies.createAllWindows.mockClear();
    appMocks.dcSpies.getPanelByDisplayName.mockReturnValue({ title: "panel" });
    appMocks.dcSpies.reconsilePanels.mockClear();
    appMocks.applyTheme.mockClear();
    appMocks.setAppMainVersionInfo.mockClear();
    capturedRenderCallback = () => {};
    capturedThemeCallback = null;
    appMocks.resetDockConnector();
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

  it("renders revealDockDiv and revealDockManager elements", async () => {
    await renderApp();
    expect(document.getElementById("revealDockDiv")).toBeTruthy();
    expect(document.getElementById("revealDockManager")).toBeTruthy();
  });

  it("renders all nine tool-window container divs", async () => {
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

  // --- Dock initialization ---

  it("constructs a DockManager instance on dock init", async () => {
    await renderApp();
    expect(appMocks.dmSpies.ctor).toHaveBeenCalledTimes(1);
  });

  it("calls dockManager.initialize()", async () => {
    await renderApp();
    expect(appMocks.dmSpies.initialize).toHaveBeenCalledTimes(1);
  });

  it("creates and sets a DockMenuConnector", async () => {
    await renderApp();
    expect(appMocks.dcSpies.ctor).toHaveBeenCalledTimes(1);
    expect(appMocks.getDockConnector()).not.toBeNull();
  });

  it("registers exactly 9 tool-window panels", async () => {
    await renderApp();
    expect(appMocks.dcSpies.registerPanel).toHaveBeenCalledTimes(9);
  });

  it("registers expected panel IDs", async () => {
    await renderApp();
    const ids = appMocks.dcSpies.registerPanel.mock.calls.map((c: unknown[]) => c[0]);
    ["sourceWindow", "commandWindow", "memoryWindow", "bpWindow", "registersWindow"].forEach((id) =>
      expect(ids).toContain(id),
    );
  });

  it("attaches a layout listener to the dock manager", async () => {
    await renderApp();
    expect(appMocks.dmSpies.addLayoutListener).toHaveBeenCalledTimes(1);
  });

  it("calls reconsilePanels after dock init", async () => {
    await renderApp();
    expect(appMocks.dcSpies.reconsilePanels).toHaveBeenCalled();
  });

  // --- Saved layout path ---

  it("calls loadState when gdb.gui.layouts.main.dockLayout is present", async () => {
    const saved = { panels: ["a"] };
    await renderApp({ gui: { layouts: { main: { dockLayout: saved } } } });
    expect(appMocks.dmSpies.loadState).toHaveBeenCalledWith(JSON.stringify(saved));
  });

  it("does NOT create default layout when saved layout loads successfully", async () => {
    await renderApp({ gui: { layouts: { main: { dockLayout: { panels: [] } } } } });
    expect(appMocks.dcSpies.createAllWindows).not.toHaveBeenCalled();
  });

  // --- Default layout path ---

  it("creates default layout (createAllWindows) when no gdb.gui.layouts.main.dockLayout in settings", async () => {
    await renderApp({ gui: {} });
    expect(appMocks.dcSpies.createAllWindows).toHaveBeenCalledTimes(1);
  });

  it("calls dockFill, dockRight, and dockUp for default layout wiring", async () => {
    await renderApp({ gui: {} });
    expect(appMocks.dmSpies.dockFill).toHaveBeenCalled();
    expect(appMocks.dmSpies.dockRight).toHaveBeenCalled();
    expect(appMocks.dmSpies.dockUp).toHaveBeenCalled();
  });

  // --- Corrupt saved layout ---

  it("falls back to default layout when loadState throws", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    appMocks.dmSpies.loadState.mockRejectedValue(new Error("corrupt layout"));
    await renderApp({ gui: { layouts: { main: { dockLayout: { bad: true } } } } });
    expect(appMocks.dcSpies.createAllWindows).toHaveBeenCalledTimes(1);
  });

  // --- Layout listener callbacks ---

  it("onContainerResized dispatches update-window-list and save-dock-layout", async () => {
    await renderApp();
    const listener = appMocks.dmSpies.addLayoutListener.mock.calls[0][0] as {
      onContainerResized: () => void;
    };
    const spy = vi.spyOn(window, "dispatchEvent");
    listener.onContainerResized();
    const types = spy.mock.calls.map((c) => (c[0] as Event).type);
    expect(types).toContain("update-window-list");
    expect(types).toContain("save-dock-layout");
  });

  it("onTabChanged dispatches update-window-list and save-dock-layout", async () => {
    await renderApp();
    const listener = appMocks.dmSpies.addLayoutListener.mock.calls[0][0] as {
      onTabChanged: () => void;
    };
    const spy = vi.spyOn(window, "dispatchEvent");
    listener.onTabChanged();
    const types = spy.mock.calls.map((c) => (c[0] as Event).type);
    expect(types).toContain("update-window-list");
    expect(types).toContain("save-dock-layout");
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

  // --- handleResize ---

  it("resize event calls dockManager.resize when dockMenuConnector is set", async () => {
    await renderApp();
    appMocks.dmSpies.resize.mockClear();
    window.dispatchEvent(new Event("resize"));
    expect(appMocks.dmSpies.resize).toHaveBeenCalled();
  });

  it("resize event before dock init (dockMenuConnector null) does not throw", () => {
    appMocks.resetDockConnector();
    (window as Record<string, unknown>).ipcToMain = buildIpc();
    render(<App />);
    expect(() => window.dispatchEvent(new Event("resize"))).not.toThrow();
  });

  // --- Cleanup on unmount ---

  it("unmounting calls unsubTheme", async () => {
    const { unmount } = await renderApp();
    unmount();
    expect(unsubThemeMock).toHaveBeenCalledTimes(1);
  });

  it("unmounting removes the resize event listener", async () => {
    const { unmount } = await renderApp();
    unmount();
    appMocks.dmSpies.resize.mockClear();
    window.dispatchEvent(new Event("resize"));
    expect(appMocks.dmSpies.resize).not.toHaveBeenCalled();
  });

  it("unmounting removes the changeApplication event listener", async () => {
    const { unmount } = await renderApp();
    unmount();
    appMocks.applyTheme.mockClear();
    window.dispatchEvent(new CustomEvent("changeApplication", { detail: { theme: "Dark" } }));
    expect(appMocks.applyTheme).not.toHaveBeenCalled();
  });

  // --- Module-level save-dock-layout listener (after dock init) ---

  it("save-dock-layout event calls saveState and notifyMain after dock init", async () => {
    const notifyMain = vi.fn();
    const ipc = buildIpc();
    (ipc as Record<string, unknown>).commands = { app: { notifyMain } };
    (window as Record<string, unknown>).ipcToMain = ipc;
    await act(async () => {
      render(<App />);
      await new Promise((r) => setTimeout(r, 0));
    });
    window.dispatchEvent(new Event("save-dock-layout"));
    expect(appMocks.dmSpies.saveState).toHaveBeenCalled();
    expect(notifyMain).toHaveBeenCalledWith(
      expect.objectContaining({ command: "save-dock-layout" }),
    );
  });

  // --- Module-level beforeunload listener ---

  it("beforeunload dispatches a save-dock-layout event", () => {
    const spy = vi.spyOn(window, "dispatchEvent");
    window.dispatchEvent(new Event("beforeunload"));
    const types = spy.mock.calls.map((c) => (c[0] as Event).type);
    expect(types).toContain("save-dock-layout");
  });
});
