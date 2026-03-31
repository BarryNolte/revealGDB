import { BrowserWindow } from "electron";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEventEmitterHarness } from "../test-helpers/event-emitter-test-harness";
import { createMockAppSettings, createMockBrowserWindow } from "../test-helpers/ipc-test-harness";
import {
  createDebugWindow,
  createMainWindow,
  loadMainWindow,
  restoreWindowBounds,
  wireWindowCloseHandlers,
} from "./window-manager";

const { browserWindowFactory } = vi.hoisted(() => ({
  browserWindowFactory: vi.fn<(options: unknown) => unknown>((options: unknown) => ({ options })),
}));

vi.mock("electron", async (importOriginal) => {
  const actual = await importOriginal<typeof import("electron")>();

  return {
    ...actual,
    BrowserWindow: vi.fn(function BrowserWindowMock(options: unknown) {
      return browserWindowFactory(options);
    }),
  };
});

describe("window-manager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    browserWindowFactory.mockReset();
    browserWindowFactory.mockImplementation((options: unknown) => ({ options }));
    delete process.env.ELECTRON_RENDERER_URL;
  });

  it("creates the main window with preload and hidden by default", () => {
    const browserWindowMock = vi.mocked(BrowserWindow);
    browserWindowFactory.mockImplementation((options: unknown) => ({ options }));

    createMainWindow("C:/preload.js");

    expect(browserWindowMock).toHaveBeenCalledWith({
      webPreferences: {
        preload: "C:/preload.js",
      },
      show: false,
    });
  });

  it("creates a detached debug window and attaches devtools", () => {
    const browserWindowMock = vi.mocked(BrowserWindow);
    const mainWindow = createMockBrowserWindow({
      webContents: {
        send: vi.fn(),
        setDevToolsWebContents: vi.fn(),
        openDevTools: vi.fn(),
      } as never,
    });
    const debugWindow = { webContents: {} };

    browserWindowFactory.mockImplementation(() => debugWindow);

    const created = createDebugWindow(mainWindow as never);

    expect(created).toBe(debugWindow);
    expect(browserWindowMock).toHaveBeenCalledWith({
      x: 0,
      y: 0,
      width: 1200,
      height: 1200,
      autoHideMenuBar: true,
    });
    expect(mainWindow.webContents.setDevToolsWebContents).toHaveBeenCalledWith(
      debugWindow.webContents,
    );
    expect(mainWindow.webContents.openDevTools).toHaveBeenCalledWith({
      mode: "detach",
      title: "revealGDB - I'm Special, I know how to debug...",
    });
  });

  it("loads renderer URL in development mode", () => {
    const mainWindow = createMockBrowserWindow({
      loadURL: vi.fn(),
      loadFile: vi.fn(),
    } as never);
    process.env.ELECTRON_RENDERER_URL = "http://localhost:5173";

    loadMainWindow(mainWindow as never);

    expect(mainWindow.loadURL).toHaveBeenCalledWith("http://localhost:5173");
    expect(mainWindow.loadFile).not.toHaveBeenCalled();
  });

  it("loads the built renderer file when no development URL is set", () => {
    const mainWindow = createMockBrowserWindow();

    loadMainWindow(mainWindow as never);

    expect(mainWindow.loadURL).not.toHaveBeenCalled();
    expect(mainWindow.loadFile).toHaveBeenCalledTimes(1);
    expect(vi.mocked(mainWindow.loadFile).mock.calls[0]?.[0]).toContain("out");
    expect(vi.mocked(mainWindow.loadFile).mock.calls[0]?.[0]).toContain("renderer");
    expect(vi.mocked(mainWindow.loadFile).mock.calls[0]?.[0]).toContain("index.html");
  });

  it("restores saved window bounds and fullscreen flag", () => {
    const mainWindow = createMockBrowserWindow({
      setPosition: vi.fn(),
      setSize: vi.fn(),
    } as never);
    const appSettings = createMockAppSettings({
      getSync: vi.fn((key: string) => {
        switch (key) {
          case "gdb.gui.windowSize.x":
            return 10;
          case "gdb.gui.windowSize.y":
            return 20;
          case "gdb.gui.windowSize.width":
            return 1200;
          case "gdb.gui.windowSize.height":
            return 800;
          case "gdb.gui.windowSize.fullscreen":
            return true;
          default:
            return undefined;
        }
      }),
    });

    restoreWindowBounds(mainWindow as never, appSettings);

    expect(mainWindow.setPosition).toHaveBeenCalledWith(10, 20);
    expect(mainWindow.setSize).toHaveBeenCalledWith(1200, 800);
    expect(mainWindow.fullScreen).toBe(true);
  });

  it("closes the debug window when the main window closes", () => {
    const mainWindowEvents = createEventEmitterHarness();
    const debugWindowEvents = createEventEmitterHarness();
    const mainWindow = createMockBrowserWindow({
      on: mainWindowEvents.on,
    } as never);
    const debugWindow = {
      close: vi.fn(),
      on: debugWindowEvents.on,
    };

    wireWindowCloseHandlers(mainWindow as never, debugWindow as never);

    mainWindowEvents.emit("closed");

    expect(debugWindow.close).toHaveBeenCalledTimes(1);

    debugWindowEvents.emit("closed");
    mainWindowEvents.emit("closed");

    expect(debugWindow.close).toHaveBeenCalledTimes(1);
  });

  it("does nothing on main window close when no debug window exists", () => {
    const mainWindowEvents = createEventEmitterHarness();
    const mainWindow = createMockBrowserWindow({
      on: mainWindowEvents.on,
    } as never);

    wireWindowCloseHandlers(mainWindow as never, undefined);

    expect(() => mainWindowEvents.emit("closed")).not.toThrow();
  });
});
