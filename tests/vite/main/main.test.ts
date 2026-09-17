/**
 * Implements main.test for revealGDB.
 *
 * @remarks
 * Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const mainMocks = vi.hoisted(() => {
  const readyHandlers: Array<() => void> = [];
  let readyToShowHandler: (() => void) | undefined;

  const mainWindow = {
    on: vi.fn(),
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
  };

  return {
    app,
    ipcMain: { on: vi.fn(), handle: vi.fn() },
    nativeTheme: { themeSource: "system" },
    registerAppEvents: vi.fn(),
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

vi.mock("electron-store", () => {
  const storeMock = {
    getSync: vi.fn((key: string) => {
      // Return appropriate values based on the key
      if (key === "gdb.gui.applicationTheme") return "Dark";
      // For window bounds and other keys, return undefined
      return undefined;
    }),
    setSync: vi.fn(),
    delete: vi.fn(),
    has: vi.fn(),
    path: "/mock/settings.json",
  };
  // Return a constructor function that properly handles new keyword
  const StoreMock = function () {
    return storeMock;
  } as any;
  return {
    default: StoreMock,
  };
});

vi.mock("../../../src/main/app-events", () => ({
  registerAppEvents: mainMocks.registerAppEvents,
}));

vi.mock("../../../src/main/bootstrap", () => ({
  collectVersionInfo: mainMocks.collectVersionInfo,
  applyDefaultSettings: mainMocks.applyDefaultSettings,
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

vi.mock("../../../src/main/window-manager", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../src/main/window-manager")>();
  return {
    ...actual,
    createDebugWindow: mainMocks.createDebugWindow,
    createMainWindow: mainMocks.createMainWindow,
    loadMainWindow: mainMocks.loadMainWindow,
    resolvePreloadPath: mainMocks.resolvePreloadPath,
    restoreWindowBounds: mainMocks.restoreWindowBounds,
    restorePerHostWindowBounds: mainMocks.restoreWindowBounds,
    wireWindowCloseHandlers: mainMocks.wireWindowCloseHandlers,
  };
});

vi.mock("../../../src/main/multi-window-manager", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../src/main/multi-window-manager")>();
  return {
    ...actual,
    createSatelliteWindow: vi.fn(),
    createFloatingWindow: vi.fn(),
    closeAllSatelliteWindows: vi.fn(),
    closeAllFloatingWindows: vi.fn(),
    getAllSatelliteWindows: vi.fn(() => []),
    getAllFloatingWindows: vi.fn(() => []),
    registerSatelliteWindowClosedCallback: vi.fn(),
    registerSatelliteWindowCreatedCallback: vi.fn(),
    restoreSatelliteWindows: vi.fn(),
  };
});

describe("main startup wiring", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.resetModules();
    mainMocks.readyHandlers.length = 0;
  });

  it("registers app events and IPC handlers on import and wires the ready startup path", async () => {
    vi.resetModules();
    vi.doUnmock("../../../src/main/main");

    const mainModule = await import("../../../src/main/main");

    expect(mainMocks.registerAppEvents).toHaveBeenCalledWith(
      mainMocks.app,
      mainMocks.nativeTheme,
      expect.any(Function),
    );

    // registerIpcHandlers is called inside the ready listener, not on import
    expect(mainMocks.registerIpcHandlers).not.toHaveBeenCalled();

    expect(mainMocks.readyHandlers).toHaveLength(1);
    mainMocks.readyHandlers[0]();

    // Now registerIpcHandlers should have been called from within the ready listener
    expect(mainMocks.registerIpcHandlers).toHaveBeenCalledWith(
      expect.objectContaining({
        ipcMain: mainMocks.ipcMain,
        gdbAppInfo: mainModule.gdbAppInfo,
        workspaceService: expect.any(Object),
        workspaceStateStore: expect.any(Object),
      }),
    );

    const context = mainMocks.registerIpcHandlers.mock.calls[0][0];
    expect(context.getMainWindow()).toBe(mainMocks.mainWindow);
    expect(context.isSelectedConnection({ name: "ok", shell: "bash", commands: ["gdb"] })).toBe(
      true,
    );
    expect(context.isSelectedConnection({ name: "bad", shell: "bash", commands: [1] })).toBe(false);

    expect(mainMocks.logStartupDiagnostics).toHaveBeenCalledWith(
      expect.objectContaining({
        getSync: expect.any(Function),
        setSync: expect.any(Function),
        delete: expect.any(Function),
      }),
    );
    expect(mainMocks.collectVersionInfo).toHaveBeenCalledWith(mainModule.gdbAppInfo);
    expect(mainMocks.setNativeThemeFromAppTheme).toHaveBeenCalledWith("Dark");
    expect(mainMocks.resolvePreloadPath).toHaveBeenCalledTimes(1);
    expect(mainMocks.createMainWindow).toHaveBeenCalledWith("out/preload/preload.js");
    expect(mainMocks.loadMainWindow).toHaveBeenCalledWith(mainMocks.mainWindow);
    expect(mainMocks.installMenu).toHaveBeenCalledTimes(1);
    expect(mainMocks.createGdbInterface).toHaveBeenCalledWith(
      mainMocks.mainWindow,
      expect.objectContaining({
        getSync: expect.any(Function),
        setSync: expect.any(Function),
        delete: expect.any(Function),
      }),
    );
    expect(mainMocks.wireWindowCloseHandlers).toHaveBeenCalledWith(
      mainMocks.mainWindow,
      undefined,
      expect.any(Function),
    );
    expect(mainModule.mainWindow).toBe(mainMocks.mainWindow);
    expect(mainModule.gdbInterface).toBe(mainMocks.gdbInterface);

    const readyToShowHandler = mainMocks.getReadyToShowHandler();
    expect(readyToShowHandler).toBeTypeOf("function");
    readyToShowHandler?.();

    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(mainMocks.restoreWindowBounds).toHaveBeenCalledWith(
      "main",
      mainMocks.mainWindow,
      expect.objectContaining({
        getSync: expect.any(Function),
        setSync: expect.any(Function),
        delete: expect.any(Function),
        has: expect.any(Function),
        path: expect.any(String),
      }),
    );
    expect(mainMocks.mainWindow.show).toHaveBeenCalledTimes(1);
    expect(mainMocks.warmSystemFonts).toHaveBeenCalledWith(expect.any(Map));
    expect(mainMocks.maybeInstallDevTools).not.toHaveBeenCalled();

    const appEventsAccessor = mainMocks.registerAppEvents.mock.calls[0][2];
    expect(appEventsAccessor()).toBe(mainMocks.mainWindow);
  });
});
