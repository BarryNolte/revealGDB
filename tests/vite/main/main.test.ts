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
  };

  return {
    app,
    ipcMain: { on: vi.fn(), handle: vi.fn() },
    nativeTheme: { themeSource: "system" },
    settings: { getSync: vi.fn(() => "Dark") },
    registerAppEvents: vi.fn(),
    configureAppSettings: vi.fn(),
    logStartupDiagnostics: vi.fn(),
    collectVersionInfo: vi.fn(),
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

vi.mock("electron-settings", () => ({
  default: mainMocks.settings,
}));

vi.mock("../../../src/main/app-events", () => ({
  registerAppEvents: mainMocks.registerAppEvents,
}));

vi.mock("../../../src/main/bootstrap", () => ({
  collectVersionInfo: mainMocks.collectVersionInfo,
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
}));

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
    expect(mainMocks.registerIpcHandlers).toHaveBeenCalledWith(
      expect.objectContaining({
        ipcMain: mainMocks.ipcMain,
        appSettings: mainMocks.settings,
        gdbAppInfo: mainModule.gdbAppInfo,
      }),
    );

    const context = mainMocks.registerIpcHandlers.mock.calls[0][0];
    expect(context.getMainWindow()).toBeUndefined();
    expect(context.isSelectedConnection({ name: "ok", shell: "bash", commands: ["gdb"] })).toBe(
      true,
    );
    expect(context.isSelectedConnection({ name: "bad", shell: "bash", commands: [1] })).toBe(false);

    expect(mainMocks.readyHandlers).toHaveLength(1);
    mainMocks.readyHandlers[0]();

    expect(mainMocks.configureAppSettings).toHaveBeenCalledWith(mainMocks.settings);
    expect(mainMocks.logStartupDiagnostics).toHaveBeenCalledWith(mainMocks.settings);
    expect(mainMocks.collectVersionInfo).toHaveBeenCalledWith(mainModule.gdbAppInfo);
    expect(mainMocks.setNativeThemeFromAppTheme).toHaveBeenCalledWith("Dark");
    expect(mainMocks.resolvePreloadPath).toHaveBeenCalledTimes(1);
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
