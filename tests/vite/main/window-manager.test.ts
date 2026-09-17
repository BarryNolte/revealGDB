/**
 * window-manager.test module.
 *
 * @remarks
 * Source module for window-manager.test.
 */

/**
 * @file window-manager.test.ts
 * @description Source module for window-manager.test.
 */

import { BrowserWindow } from "electron";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDebugWindow,
  createMainWindow,
  loadMainWindow,
  restoreWindowBounds,
  saveWindowBounds,
  wireWindowCloseHandlers,
} from "../../../src/main/window-manager";
import { createEventEmitterHarness } from "../../helpers/event-emitter-test-harness";
import { createMockAppSettings, createMockBrowserWindow } from "../../helpers/ipc-test-harness";

const { browserWindowFactory } = vi.hoisted(() => ({
  browserWindowFactory: vi.fn<(options: unknown) => unknown>((options: unknown) => ({ options })),
}));

vi.mock("electron", () => ({
  BrowserWindow: vi.fn(function BrowserWindowMock(options: unknown) {
    return browserWindowFactory(options);
  }),
  screen: {
    getAllDisplays: vi.fn(() => [
      {
        bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      },
    ]),
    getPrimaryDisplay: vi.fn(() => ({
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
    })),
  },
}));

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
      setBounds: vi.fn(),
      setFullScreen: vi.fn(),
    } as never);
    const appSettings = createMockAppSettings({
      getSync: vi.fn((key: string) => {
        if (key === "gdb.gui.workspace") {
          return {
            windows: [
              {
                id: "main",
                type: "main",
                hostId: "main",
                bounds: {
                  x: 10,
                  y: 20,
                  width: 1200,
                  height: 800,
                },
                isMaximized: false,
                isMinimized: true,
              },
            ],
          };
        }
        return undefined;
      }),
    });

    restoreWindowBounds(mainWindow as never, appSettings);

    expect(mainWindow.setBounds).toHaveBeenCalledWith({
      x: 10,
      y: 20,
      width: 1200,
      height: 800,
    });
    expect(mainWindow.setFullScreen).toHaveBeenCalledWith(true);
  });

  it("re-centers off-screen saved bounds onto the primary display", () => {
    const mainWindow = createMockBrowserWindow({
      setBounds: vi.fn(),
      setFullScreen: vi.fn(),
    } as never);
    const appSettings = createMockAppSettings({
      getSync: vi.fn((key: string) => {
        if (key === "gdb.gui.workspace") {
          return {
            windows: [
              {
                id: "main",
                type: "main",
                hostId: "main",
                bounds: {
                  x: -5000,
                  y: -5000,
                  width: 1200,
                  height: 800,
                },
                isMaximized: false,
                isMinimized: false,
              },
            ],
          };
        }
        return undefined;
      }),
    });

    restoreWindowBounds(mainWindow as never, appSettings);

    expect(mainWindow.setBounds).toHaveBeenCalledWith({
      x: 360,
      y: 140,
      width: 1200,
      height: 800,
    });
  });

  it("drops stale dockLayout data when saving bounds", () => {
    const mainWindow = createMockBrowserWindow({
      getBounds: vi.fn().mockReturnValue({ x: 10, y: 20, width: 900, height: 700 }),
      isMaximized: vi.fn().mockReturnValue(false),
    } as never);
    const appSettings = createMockAppSettings({
      getSync: vi.fn((key: string) => {
        if (key === "gdb.gui.workspace") {
          return {
            windows: [
              {
                id: "main",
                type: "main",
                hostId: "main",
                bounds: { x: 0, y: 0, width: 1200, height: 800 },
                isMaximized: false,
                isMinimized: false,
              },
            ],
          };
        }
        return undefined;
      }),
    });

    saveWindowBounds("main", mainWindow as never, appSettings);

    expect(appSettings.setSync).toHaveBeenCalledWith("gdb.gui.workspace", {
      windows: [
        {
          id: "main",
          type: "main",
          hostId: "main",
          bounds: { x: 10, y: 20, width: 900, height: 700 },
          isMaximized: false,
          isMinimized: false,
        },
      ],
    });
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

    wireWindowCloseHandlers(mainWindow as never, debugWindow as never, undefined);

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

    wireWindowCloseHandlers(mainWindow as never, undefined, undefined);

    expect(() => mainWindowEvents.emit("closed")).not.toThrow();
  });

  it("invokes the callback when the main window closes", () => {
    const mainWindowEvents = createEventEmitterHarness();
    const mainWindow = createMockBrowserWindow({
      on: mainWindowEvents.on,
    } as never);
    const callback = vi.fn();

    wireWindowCloseHandlers(mainWindow as never, undefined, callback);

    mainWindowEvents.emit("closed");

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("invokes the callback before closing the debug window", () => {
    const mainWindowEvents = createEventEmitterHarness();
    const debugWindowEvents = createEventEmitterHarness();
    const debugWindow = {
      close: vi.fn(),
      on: debugWindowEvents.on,
    };
    const mainWindow = createMockBrowserWindow({
      on: mainWindowEvents.on,
    } as never);
    const callOrder: string[] = [];
    const callback = vi.fn(() => callOrder.push("callback"));
    (debugWindow.close as any).mockImplementation(() => callOrder.push("debugWindow.close"));

    wireWindowCloseHandlers(mainWindow as never, debugWindow as never, callback);

    mainWindowEvents.emit("closed");

    expect(callOrder).toEqual(["debugWindow.close", "callback"]);
  });
});
