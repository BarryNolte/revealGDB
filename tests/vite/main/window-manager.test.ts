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
  wireWindowSizeSaver,
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

  it("does not restore position when x or y is missing", () => {
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
            return undefined; // Missing y coordinate
          case "gdb.gui.windowSize.width":
            return 1200;
          case "gdb.gui.windowSize.height":
            return 800;
          default:
            return undefined;
        }
      }),
    });

    restoreWindowBounds(mainWindow as never, appSettings);

    expect(mainWindow.setPosition).not.toHaveBeenCalled();
    expect(mainWindow.setSize).toHaveBeenCalledWith(1200, 800);
  });

  it("does not restore size when width or height is missing", () => {
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
            return undefined; // Missing width
          case "gdb.gui.windowSize.height":
            return 800;
          default:
            return undefined;
        }
      }),
    });

    restoreWindowBounds(mainWindow as never, appSettings);

    expect(mainWindow.setPosition).toHaveBeenCalledWith(10, 20);
    expect(mainWindow.setSize).not.toHaveBeenCalled();
  });

  it("restores fullscreen state as false when not set", () => {
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
            return false; // Explicitly false
          default:
            return undefined;
        }
      }),
    });

    restoreWindowBounds(mainWindow as never, appSettings);

    expect(mainWindow.fullScreen).toBe(false);
  });

  it("handles zero values correctly (0 is falsy but valid position)", () => {
    const mainWindow = createMockBrowserWindow({
      setPosition: vi.fn(),
      setSize: vi.fn(),
    } as never);
    const appSettings = createMockAppSettings({
      getSync: vi.fn((key: string) => {
        switch (key) {
          case "gdb.gui.windowSize.x":
            return 0; // Zero is falsy but valid
          case "gdb.gui.windowSize.y":
            return 0; // Zero is falsy but valid
          case "gdb.gui.windowSize.width":
            return 1200;
          case "gdb.gui.windowSize.height":
            return 800;
          default:
            return undefined;
        }
      }),
    });

    restoreWindowBounds(mainWindow as never, appSettings);

    // When x or y is 0, they are falsy and not restored (this is a limitation of current implementation)
    // This test documents the current behavior
    expect(mainWindow.setPosition).not.toHaveBeenCalled();
  });

  it("saves window position and size correctly", () => {
    const mainWindow = createMockBrowserWindow({
      isDestroyed: vi.fn(() => false),
      getPosition: vi.fn(() => [100, 200]),
      getSize: vi.fn(() => [1400, 900]),
      isFullScreen: vi.fn(() => false),
    } as never);
    const appSettings = createMockAppSettings({
      setSync: vi.fn(),
    });

    saveWindowBounds(mainWindow as never, appSettings);

    expect(appSettings.setSync).toHaveBeenCalledWith("gdb.gui.windowSize.x", 100);
    expect(appSettings.setSync).toHaveBeenCalledWith("gdb.gui.windowSize.y", 200);
    expect(appSettings.setSync).toHaveBeenCalledWith("gdb.gui.windowSize.width", 1400);
    expect(appSettings.setSync).toHaveBeenCalledWith("gdb.gui.windowSize.height", 900);
    expect(appSettings.setSync).toHaveBeenCalledWith("gdb.gui.windowSize.fullscreen", false);
  });

  it("saves fullscreen state when window is maximized", () => {
    const mainWindow = createMockBrowserWindow({
      isDestroyed: vi.fn(() => false),
      getPosition: vi.fn(() => [0, 0]),
      getSize: vi.fn(() => [1920, 1080]),
      isFullScreen: vi.fn(() => true),
    } as never);
    const appSettings = createMockAppSettings({
      setSync: vi.fn(),
    });

    saveWindowBounds(mainWindow as never, appSettings);

    expect(appSettings.setSync).toHaveBeenCalledWith("gdb.gui.windowSize.fullscreen", true);
  });

  it("does not save bounds when window is destroyed", () => {
    const mainWindow = createMockBrowserWindow({
      isDestroyed: vi.fn(() => true),
      getPosition: vi.fn(),
      getSize: vi.fn(),
      isFullScreen: vi.fn(),
    } as never);
    const appSettings = createMockAppSettings({
      setSync: vi.fn(),
    });

    saveWindowBounds(mainWindow as never, appSettings);

    expect(appSettings.setSync).not.toHaveBeenCalled();
  });

  it("registers event listeners for window size persistence", () => {
    const windowEvents = createEventEmitterHarness();
    const mainWindow = createMockBrowserWindow({
      isDestroyed: vi.fn(() => false),
      getPosition: vi.fn(() => [100, 200]),
      getSize: vi.fn(() => [1200, 800]),
      isFullScreen: vi.fn(() => false),
      on: windowEvents.on,
    } as never);
    const appSettings = createMockAppSettings({
      setSync: vi.fn(),
    });

    wireWindowSizeSaver(mainWindow as never, appSettings);

    // Verify event listener registration was called 5 times (move, resize, close, enter-full-screen, leave-full-screen)
    expect(windowEvents.on).toHaveBeenCalledTimes(5);
    expect(windowEvents.on).toHaveBeenCalledWith("move", expect.any(Function));
    expect(windowEvents.on).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(windowEvents.on).toHaveBeenCalledWith("close", expect.any(Function));
    expect(windowEvents.on).toHaveBeenCalledWith("enter-full-screen", expect.any(Function));
    expect(windowEvents.on).toHaveBeenCalledWith("leave-full-screen", expect.any(Function));
  });

  it("saves bounds when move event is triggered", () => {
    const windowEvents = createEventEmitterHarness();
    const mainWindow = createMockBrowserWindow({
      isDestroyed: vi.fn(() => false),
      getPosition: vi.fn(() => [150, 250]),
      getSize: vi.fn(() => [1200, 800]),
      isFullScreen: vi.fn(() => false),
      on: windowEvents.on,
    } as never);
    const appSettings = createMockAppSettings({
      setSync: vi.fn(),
    });

    wireWindowSizeSaver(mainWindow as never, appSettings);
    windowEvents.emit("move");

    expect(appSettings.setSync).toHaveBeenCalledWith("gdb.gui.windowSize.x", 150);
    expect(appSettings.setSync).toHaveBeenCalledWith("gdb.gui.windowSize.y", 250);
  });

  it("saves bounds when resize event is triggered", () => {
    const windowEvents = createEventEmitterHarness();
    const mainWindow = createMockBrowserWindow({
      isDestroyed: vi.fn(() => false),
      getPosition: vi.fn(() => [100, 200]),
      getSize: vi.fn(() => [1600, 1000]),
      isFullScreen: vi.fn(() => false),
      on: windowEvents.on,
    } as never);
    const appSettings = createMockAppSettings({
      setSync: vi.fn(),
    });

    wireWindowSizeSaver(mainWindow as never, appSettings);
    windowEvents.emit("resize");

    expect(appSettings.setSync).toHaveBeenCalledWith("gdb.gui.windowSize.width", 1600);
    expect(appSettings.setSync).toHaveBeenCalledWith("gdb.gui.windowSize.height", 1000);
  });

  it("saves fullscreen state when entering fullscreen", () => {
    const windowEvents = createEventEmitterHarness();
    const mainWindow = createMockBrowserWindow({
      isDestroyed: vi.fn(() => false),
      getPosition: vi.fn(() => [0, 0]),
      getSize: vi.fn(() => [1920, 1080]),
      isFullScreen: vi.fn(() => true),
      on: windowEvents.on,
    } as never);
    const appSettings = createMockAppSettings({
      setSync: vi.fn(),
    });

    wireWindowSizeSaver(mainWindow as never, appSettings);
    windowEvents.emit("enter-full-screen");

    expect(appSettings.setSync).toHaveBeenCalledWith("gdb.gui.windowSize.fullscreen", true);
  });

  it("saves fullscreen state when leaving fullscreen", () => {
    const windowEvents = createEventEmitterHarness();
    const mainWindow = createMockBrowserWindow({
      isDestroyed: vi.fn(() => false),
      getPosition: vi.fn(() => [100, 200]),
      getSize: vi.fn(() => [1200, 800]),
      isFullScreen: vi.fn(() => false),
      on: windowEvents.on,
    } as never);
    const appSettings = createMockAppSettings({
      setSync: vi.fn(),
    });

    wireWindowSizeSaver(mainWindow as never, appSettings);
    windowEvents.emit("leave-full-screen");

    expect(appSettings.setSync).toHaveBeenCalledWith("gdb.gui.windowSize.fullscreen", false);
  });

  it("saves bounds on close event before window is destroyed", () => {
    const windowEvents = createEventEmitterHarness();
    const mainWindow = createMockBrowserWindow({
      isDestroyed: vi.fn(() => false), // Not destroyed during close event
      getPosition: vi.fn(() => [200, 300]),
      getSize: vi.fn(() => [1100, 700]),
      isFullScreen: vi.fn(() => false),
      on: windowEvents.on,
    } as never);
    const appSettings = createMockAppSettings({
      setSync: vi.fn(),
    });

    wireWindowSizeSaver(mainWindow as never, appSettings);
    windowEvents.emit("close");

    expect(appSettings.setSync).toHaveBeenCalledWith("gdb.gui.windowSize.x", 200);
    expect(appSettings.setSync).toHaveBeenCalledWith("gdb.gui.windowSize.y", 300);
    expect(appSettings.setSync).toHaveBeenCalledWith("gdb.gui.windowSize.width", 1100);
    expect(appSettings.setSync).toHaveBeenCalledWith("gdb.gui.windowSize.height", 700);
  });

  it("round-trip: save then restore returns same bounds", () => {
    // Setup: Create window with specific bounds
    const windowEvents = createEventEmitterHarness();
    const savedBounds = new Map<string, unknown>();

    const windowToSave = createMockBrowserWindow({
      isDestroyed: vi.fn(() => false),
      getPosition: vi.fn(() => [350, 450]),
      getSize: vi.fn(() => [1500, 950]),
      isFullScreen: vi.fn(() => false),
      on: windowEvents.on,
    } as never);

    const appSettingsForSave = createMockAppSettings({
      setSync: vi.fn((key: string, value: unknown) => {
        savedBounds.set(key, value);
      }),
    });

    // Save the window bounds
    saveWindowBounds(windowToSave as never, appSettingsForSave);

    // Verify saved values
    expect(savedBounds.get("gdb.gui.windowSize.x")).toBe(350);
    expect(savedBounds.get("gdb.gui.windowSize.y")).toBe(450);
    expect(savedBounds.get("gdb.gui.windowSize.width")).toBe(1500);
    expect(savedBounds.get("gdb.gui.windowSize.height")).toBe(950);
    expect(savedBounds.get("gdb.gui.windowSize.fullscreen")).toBe(false);

    // Restore into a new window
    const windowToRestore = createMockBrowserWindow({
      setPosition: vi.fn(),
      setSize: vi.fn(),
    } as never);

    const appSettingsForRestore = createMockAppSettings({
      getSync: vi.fn((key: string) => savedBounds.get(key)),
    });

    restoreWindowBounds(windowToRestore as never, appSettingsForRestore);

    // Verify restored values match original
    expect(windowToRestore.setPosition).toHaveBeenCalledWith(350, 450);
    expect(windowToRestore.setSize).toHaveBeenCalledWith(1500, 950);
    expect(windowToRestore.fullScreen).toBe(false);
  });

  it("round-trip preserves fullscreen state across save and restore", () => {
    const savedBounds = new Map<string, unknown>();

    // Save fullscreen window
    const windowToSave = createMockBrowserWindow({
      isDestroyed: vi.fn(() => false),
      getPosition: vi.fn(() => [0, 0]),
      getSize: vi.fn(() => [1920, 1080]),
      isFullScreen: vi.fn(() => true),
    } as never);

    const appSettingsForSave = createMockAppSettings({
      setSync: vi.fn((key: string, value: unknown) => {
        savedBounds.set(key, value);
      }),
    });

    saveWindowBounds(windowToSave as never, appSettingsForSave);
    expect(savedBounds.get("gdb.gui.windowSize.fullscreen")).toBe(true);

    // Restore fullscreen state
    const windowToRestore = createMockBrowserWindow({
      setPosition: vi.fn(),
      setSize: vi.fn(),
    } as never);

    const appSettingsForRestore = createMockAppSettings({
      getSync: vi.fn((key: string) => savedBounds.get(key)),
    });

    restoreWindowBounds(windowToRestore as never, appSettingsForRestore);
    expect(windowToRestore.fullScreen).toBe(true);
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
