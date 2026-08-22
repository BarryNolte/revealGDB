/**
 * Implements main.test for revealGDB.
 *
 * @remarks
 * Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const mainMocks = vi.hoisted(() => {
  const readyHandlers: Array<() => void> = [];
  let readyToShowHandler: (() => void) | undefined;

  const mainWindow = {
    once: vi.fn((event: string, handler: () => void) => {
      if (event === "ready-to-show") {
        readyToShowHandler = handler;
      }
    }),
    show: vi.fn(),
  };

  const debugWindow = { close: vi.fn() };
  const gdbInterface = { id: "gdb-interface" };
  const app = {
    on: vi.fn((event: string, handler: () => void) => {
      if (event === "ready") {
        readyHandlers.push(handler);
      }
    }),
    getPath: vi.fn((name: string) => {
      if (name === "userData") {
        return "C:\\Users\\barry\\AppData\\Roaming\\revealgdb";
      }
      return "";
    }),
  };

  const workspacePersistence = {
    load: vi.fn(() => ({
      id: "workspace-1",
      windows: [],
      hosts: [],
      hostLayouts: {},
      updatedAt: new Date().toISOString(),
    })),
    save: vi.fn(),
  };

  const dockWindow = {
    once: vi.fn(),
    show: vi.fn(),
  };

  const windowManager = {
    createDockWindow: vi.fn(() => dockWindow),
    loadDockWindowUrl: vi.fn(),
    getWindow: vi.fn(() => undefined),
  };

  return {
    app,
    ipcMain: { on: vi.fn(), handle: vi.fn() },
    nativeTheme: { themeSource: "system" },
    settings: {
      configure: vi.fn(),
      file: vi.fn(() => "config.json"),
      getSync: vi.fn(() => "Dark"),
      setSync: vi.fn(),
      hasSync: vi.fn(() => false),
      get: vi.fn(),
      set: vi.fn(),
      has: vi.fn(() => false),
      delete: vi.fn(),
      clear: vi.fn(),
    },
    workspacePersistence,
    windowManager,
    dockWindow,
    registerAppEvents: vi.fn(),
    configureAppSettings: vi.fn(),
    logStartupDiagnostics: vi.fn(),
    collectVersionInfo: vi.fn(),
    applyDefaultSettings: vi.fn(),
    warmSystemFonts: vi.fn(),
    maybeInstallDevTools: vi.fn(),
    createGdbInterface: vi.fn(() => gdbInterface),
    registerIpcHandlers: vi.fn(),
    installMenu: vi.fn(),
    setNativeThemeFromAppTheme: vi.fn(),
    createMainWindow: vi.fn(() => mainWindow),
    createDebugWindow: vi.fn(() => debugWindow),
    loadMainWindow: vi.fn(),
    resolvePreloadPath: vi.fn(() => "out/preload/preload.js"),
    restoreWindowBounds: vi.fn(),
    wireWindowCloseHandlers: vi.fn(),
    wireWindowSizeSaver: vi.fn(),
    mainWindow,
    debugWindow,
    gdbInterface,
    readyHandlers,
    getReadyToShowHandler: () => readyToShowHandler,
  };
});

vi.mock("electron", () => ({
  app: mainMocks.app,
  BrowserWindow: vi.fn(),
  ipcMain: mainMocks.ipcMain,
  nativeTheme: mainMocks.nativeTheme,
}));

vi.mock("../../../src/main/app-events", () => ({
  registerAppEvents: mainMocks.registerAppEvents,
}));

vi.mock("../../../src/main/bootstrap", () => ({
  collectVersionInfo: mainMocks.collectVersionInfo,
  applyDefaultSettings: mainMocks.applyDefaultSettings,
  configureAppSettings: mainMocks.configureAppSettings,
  logStartupDiagnostics: mainMocks.logStartupDiagnostics,
  maybeInstallDevTools: mainMocks.maybeInstallDevTools,
  warmSystemFonts: mainMocks.warmSystemFonts,
}));

vi.mock("../../../src/main/gdb-lifecycle", () => ({
  createGdbInterface: mainMocks.createGdbInterface,
}));

vi.mock("../../../src/main/ipc", () => ({
  registerIpcHandlers: mainMocks.registerIpcHandlers,
}));

vi.mock("../../../src/main/menu", () => ({
  GdbMenu: {
    installMenu: mainMocks.installMenu,
  },
}));

vi.mock("../../../src/main/theme-support", () => ({
  setNativeThemeFromAppTheme: mainMocks.setNativeThemeFromAppTheme,
}));

vi.mock("../../../src/main/window-manager", () => ({
  createDebugWindow: mainMocks.createDebugWindow,
  createMainWindow: mainMocks.createMainWindow,
  loadMainWindow: mainMocks.loadMainWindow,
  resolvePreloadPath: mainMocks.resolvePreloadPath,
  restoreWindowBounds: mainMocks.restoreWindowBounds,
  wireWindowCloseHandlers: mainMocks.wireWindowCloseHandlers,
  wireWindowSizeSaver: mainMocks.wireWindowSizeSaver,
  MultiHostWindowManager: vi.fn(function (this: any) {
    Object.assign(this, mainMocks.windowManager);
  }),
}));

vi.mock("../../../src/main/workspace-persistence", () => ({
  WorkspacePersistence: vi.fn(function (this: any) {
    Object.assign(this, mainMocks.workspacePersistence);
  }),
}));

describe("main startup wiring", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.resetModules();
    mainMocks.readyHandlers.length = 0;
  });

  it("starts cleanly with an empty workspace and no persisted dock layout", async () => {
    vi.resetModules();
    vi.doUnmock("../../../src/main/main");
    vi.doMock("../../../src/main/app-settings", () => ({
      AppSettings: mainMocks.settings,
    }));

    mainMocks.workspacePersistence.load.mockReturnValue({
      id: "workspace-1",
      windows: [],
      hosts: [{ id: "main", label: "Main Window", visibleWindows: [] }],
      hostLayouts: {},
      updatedAt: Date.now(),
    });

    await import("../../../src/main/main");
    const readyHandler = mainMocks.readyHandlers[0];
    readyHandler();

    expect(mainMocks.windowManager.createDockWindow).not.toHaveBeenCalled();
    expect(mainMocks.windowManager.loadDockWindowUrl).not.toHaveBeenCalled();
    expect(mainMocks.createMainWindow).toHaveBeenCalledTimes(1);
  });

  it("registers workspace IPC handlers only after the workspace persistence service exists", async () => {
    vi.resetModules();
    vi.doUnmock("../../../src/main/main");
    vi.doMock("../../../src/main/app-settings", () => ({
      AppSettings: mainMocks.settings,
    }));

    mainMocks.workspacePersistence.load.mockReturnValue({
      id: "workspace-1",
      windows: [],
      hosts: [{ id: "main", label: "Main Window", visibleWindows: [] }],
      hostLayouts: {},
      updatedAt: Date.now(),
    });

    await import("../../../src/main/main");
    const readyHandler = mainMocks.readyHandlers[0];
    readyHandler();

    const workspaceContext = mainMocks.registerIpcHandlers.mock.calls.at(-1)?.[0];
    expect(workspaceContext).toBeDefined();
    expect(workspaceContext.workspacePersistence).toBeDefined();
    expect(workspaceContext.getWorkspaceState).toBeTypeOf("function");
  });

  it("restores persisted secondary host windows during startup", async () => {
    vi.resetModules();
    vi.doUnmock("../../../src/main/main");
    vi.doMock("../../../src/main/app-settings", () => ({
      AppSettings: mainMocks.settings,
    }));

    mainMocks.workspacePersistence.load.mockReturnValue({
      id: "workspace-1",
      windows: [],
      hosts: [
        { id: "main", label: "Main Window", visibleWindows: [] },
        { id: "dock-1", label: "Dock Window 1", visibleWindows: [] },
      ],
      hostLayouts: {
        "dock-1": { version: 1, panels: [] },
      },
      updatedAt: Date.now(),
    });

    await import("../../../src/main/main");
    const readyHandler = mainMocks.readyHandlers[0];
    expect(readyHandler).toBeTypeOf("function");
    readyHandler();

    expect(mainMocks.windowManager.createDockWindow).toHaveBeenCalledTimes(1);
    expect(mainMocks.windowManager.createDockWindow).toHaveBeenCalledWith(
      expect.objectContaining({ id: "dock-1", label: "Dock Window 1" }),
    );
    expect(mainMocks.windowManager.loadDockWindowUrl).toHaveBeenCalledWith(
      mainMocks.windowManager.createDockWindow.mock.results[0].value,
      "dock-1",
      expect.any(String),
    );
  });

  it("shows a persisted secondary host if it still has a saved layout even when no windows are listed", async () => {
    vi.resetModules();
    vi.doUnmock("../../../src/main/main");
    vi.doMock("../../../src/main/app-settings", () => ({
      AppSettings: mainMocks.settings,
    }));

    mainMocks.workspacePersistence.load.mockReturnValue({
      id: "workspace-1",
      windows: [],
      hosts: [
        { id: "main", label: "Main Window", visibleWindows: [] },
        { id: "dock-1", label: "Dock Window 1", visibleWindows: [] },
      ],
      hostLayouts: {
        "dock-1": { version: 1, panels: ["locals", "threads"] },
      },
      updatedAt: Date.now(),
    });

    await import("../../../src/main/main");
    const readyHandler = mainMocks.readyHandlers[0];
    readyHandler();

    const readyToShowCallback = mainMocks.dockWindow.once.mock.calls.find(
      ([eventName]) => eventName === "ready-to-show",
    )?.[1];

    expect(readyToShowCallback).toBeTypeOf("function");
    readyToShowCallback?.();

    expect(mainMocks.dockWindow.show).toHaveBeenCalledTimes(1);
  });

  it("keeps secondary hosts with no visible windows hidden when restored", async () => {
    vi.resetModules();
    vi.doUnmock("../../../src/main/main");
    vi.doMock("../../../src/main/app-settings", () => ({
      AppSettings: mainMocks.settings,
    }));

    mainMocks.workspacePersistence.load.mockReturnValue({
      id: "workspace-1",
      windows: [],
      hosts: [
        { id: "main", label: "Main Window", visibleWindows: [] },
        { id: "dock-1", label: "Dock Window 1", visibleWindows: [] },
      ],
      hostLayouts: {
        "dock-1": { version: 1, panels: [] },
      },
      updatedAt: Date.now(),
    });

    await import("../../../src/main/main");
    const readyHandler = mainMocks.readyHandlers[0];
    readyHandler();

    const readyToShowCallback = mainMocks.dockWindow.once.mock.calls.find(
      ([eventName]) => eventName === "ready-to-show",
    )?.[1];

    expect(readyToShowCallback).toBeTypeOf("function");
    readyToShowCallback?.();

    expect(mainMocks.dockWindow.show).not.toHaveBeenCalled();
  });

  it("shows a persisted secondary host if it still has a saved layout even when no windows are listed", async () => {
    vi.resetModules();
    vi.doUnmock("../../../src/main/main");
    vi.doMock("../../../src/main/app-settings", () => ({
      AppSettings: mainMocks.settings,
    }));

    mainMocks.workspacePersistence.load.mockReturnValue({
      id: "workspace-1",
      windows: [],
      hosts: [
        { id: "main", label: "Main Window", visibleWindows: [] },
        { id: "dock-1", label: "Dock Window 1", visibleWindows: [] },
      ],
      hostLayouts: {
        "dock-1": { version: 1, panels: ["locals", "threads"] },
      },
      updatedAt: Date.now(),
    });

    await import("../../../src/main/main");
    const readyHandler = mainMocks.readyHandlers[0];
    readyHandler();

    const readyToShowCallback = mainMocks.dockWindow.once.mock.calls.find(
      ([eventName]) => eventName === "ready-to-show",
    )?.[1];

    expect(readyToShowCallback).toBeTypeOf("function");
    readyToShowCallback?.();

    expect(mainMocks.dockWindow.show).toHaveBeenCalledTimes(1);
  });

  it("registers app events and IPC handlers on import and wires the ready startup path", async () => {
    vi.resetModules();
    vi.doUnmock("../../../src/main/main");

    // Mock the app-settings module to return mock settings
    vi.doMock("../../../src/main/app-settings", () => ({
      AppSettings: mainMocks.settings,
    }));

    const mainModule = await import("../../../src/main/main");

    expect(mainMocks.registerAppEvents).toHaveBeenCalledWith(
      mainMocks.app,
      mainMocks.nativeTheme,
      expect.any(Function),
      expect.any(Function),
    );
    const readyToRunHandler = mainMocks.readyHandlers[0];
    expect(typeof readyToRunHandler).toBe("function");
    readyToRunHandler();

    expect(mainMocks.registerIpcHandlers).toHaveBeenCalledWith(
      expect.objectContaining({
        ipcMain: mainMocks.ipcMain,
        appSettings: mainMocks.settings,
        gdbAppInfo: mainModule.gdbAppInfo,
      }),
    );

    const context = mainMocks.registerIpcHandlers.mock.calls.at(-1)?.[0];
    expect(context.getMainWindow()).toBe(mainMocks.mainWindow);
    expect(context.isSelectedConnection({ name: "ok", shell: "bash", commands: ["gdb"] })).toBe(
      true,
    );
    expect(context.isSelectedConnection({ name: "bad", shell: "bash", commands: [1] })).toBe(false);

    expect(mainMocks.readyHandlers).toHaveLength(1);

    expect(mainMocks.configureAppSettings).toHaveBeenCalledWith(mainMocks.settings);
    expect(mainMocks.logStartupDiagnostics).toHaveBeenCalledWith(mainMocks.settings);
    expect(mainMocks.collectVersionInfo).toHaveBeenCalledWith(mainModule.gdbAppInfo);
    expect(mainMocks.workspacePersistence.load).toHaveBeenCalledWith();
    expect(mainMocks.setNativeThemeFromAppTheme).toHaveBeenCalledWith("Dark");
    expect(mainMocks.resolvePreloadPath).toHaveBeenCalledTimes(2); // Once for windowManager, once for createMainWindow
    expect(mainMocks.createMainWindow).toHaveBeenCalledWith("out/preload/preload.js");
    expect(mainMocks.loadMainWindow).toHaveBeenCalledWith(mainMocks.mainWindow);
    expect(mainMocks.installMenu).toHaveBeenCalledTimes(1);
    expect(mainMocks.createGdbInterface).toHaveBeenCalledWith(
      mainMocks.mainWindow,
      mainMocks.settings,
    );
    expect(mainMocks.wireWindowCloseHandlers).toHaveBeenCalledWith(mainMocks.mainWindow, undefined);
    expect(mainModule.mainWindow).toBe(mainMocks.mainWindow);
    expect(mainModule.gdbInterface).toBe(mainMocks.gdbInterface);

    const readyToShowHandler = mainMocks.getReadyToShowHandler();
    expect(readyToShowHandler).toBeTypeOf("function");
    readyToShowHandler?.();

    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(mainMocks.restoreWindowBounds).toHaveBeenCalledWith(
      mainMocks.mainWindow,
      mainMocks.settings,
    );
    expect(mainMocks.mainWindow.show).toHaveBeenCalledTimes(1);
    expect(mainMocks.warmSystemFonts).toHaveBeenCalledWith(expect.any(Map));
    expect(mainMocks.maybeInstallDevTools).not.toHaveBeenCalled();

    const appEventsAccessor = mainMocks.registerAppEvents.mock.calls[0][2];
    expect(appEventsAccessor()).toBe(mainMocks.mainWindow);
  });
});
