import { BrowserWindow } from "electron";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAIN_WINDOW_UNIQUE_ID, MultiWindowHub } from "../../../src/main/multi-window-hub";

const browserWindowMocks = vi.hoisted(() => ({
  getAllWindows: vi.fn<() => unknown[]>(),
}));

vi.mock("electron", () => ({
  BrowserWindow: {
    getAllWindows: browserWindowMocks.getAllWindows,
  },
}));

describe("MultiWindowHub", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists tracked secondary window title and size by unique id", () => {
    const appSettings = {
      initialize: vi.fn(),
      setSync: vi.fn(),
      getSync: vi.fn(),
      unsetSync: vi.fn(),
      hasSync: vi.fn(() => false),
      file: vi.fn(() => "settings.json"),
    };
    const windowMock = {
      title: "runtime-title",
      getPosition: vi.fn(() => [10, 20]),
      getSize: vi.fn(() => [800, 600]),
      fullScreen: false,
    };

    browserWindowMocks.getAllWindows.mockReturnValue([windowMock]);
    const hub = new MultiWindowHub(appSettings);
    hub.add(windowMock as unknown as BrowserWindow, "secondary-1", "Memory View");

    hub.saveWindowInfo(null);

    expect(appSettings.setSync).toHaveBeenCalledWith("gdb.gui.layouts.secondary-1.windowSize", {
      x: 10,
      y: 20,
      width: 798,
      height: 598,
      fullscreen: false,
    });
    expect(appSettings.setSync).toHaveBeenCalledWith(
      "gdb.gui.layouts.secondary-1.title",
      "Memory View",
    );
  });

  it("persists main window under canonical main key and removes title-key duplicate", () => {
    const appSettings = {
      initialize: vi.fn(),
      setSync: vi.fn(),
      getSync: vi.fn(),
      unsetSync: vi.fn(),
      hasSync: vi.fn(() => false),
      file: vi.fn(() => "settings.json"),
    };
    const windowMock = {
      title: "revealGDB - The new old way to debug",
      getPosition: vi.fn(() => [0, 0]),
      getSize: vi.fn(() => [1000, 500]),
      fullScreen: true,
    };

    browserWindowMocks.getAllWindows.mockReturnValue([windowMock]);
    const hub = new MultiWindowHub(appSettings);
    hub.add(windowMock as unknown as BrowserWindow, MAIN_WINDOW_UNIQUE_ID);

    hub.saveWindowInfo(null);

    expect(appSettings.setSync).toHaveBeenCalledWith(
      "gdb.gui.layouts.main.title",
      "revealGDB - The new old way to debug",
    );
    expect(appSettings.unsetSync).toHaveBeenCalledWith(
      "gdb.gui.layouts.revealGDB - The new old way to debug",
    );
  });

  it("prefers tracked title metadata over the default runtime title when persisting the main window", () => {
    const appSettings = {
      initialize: vi.fn(),
      setSync: vi.fn(),
      getSync: vi.fn(),
      unsetSync: vi.fn(),
      hasSync: vi.fn(() => false),
      file: vi.fn(() => "settings.json"),
    };
    const windowMock = {
      title: "revealGDB - The new old way to debug",
      getPosition: vi.fn(() => [20, 40]),
      getSize: vi.fn(() => [900, 700]),
      fullScreen: false,
    };

    browserWindowMocks.getAllWindows.mockReturnValue([windowMock]);
    const hub = new MultiWindowHub(appSettings);
    hub.add(windowMock as unknown as BrowserWindow, MAIN_WINDOW_UNIQUE_ID, "Custom debug title");

    hub.saveWindowInfo(null);

    expect(appSettings.setSync).toHaveBeenCalledWith("gdb.gui.layouts.main.title", "Custom debug title");
    expect(appSettings.unsetSync).toHaveBeenCalledWith(
      "gdb.gui.layouts.revealGDB - The new old way to debug",
    );
  });

  it("prunes unused layout keys based on tracked ids", () => {
    const appSettings = {
      initialize: vi.fn(),
      setSync: vi.fn(),
      getSync: vi.fn(() => ({
        "secondary-1": {},
        stale: {},
      })),
      unsetSync: vi.fn(),
      hasSync: vi.fn(() => true),
      file: vi.fn(() => "settings.json"),
    };
    const windowMock = {
      title: "secondary-runtime-title",
      getPosition: vi.fn(() => [10, 10]),
      getSize: vi.fn(() => [10, 10]),
      fullScreen: false,
    };
    browserWindowMocks.getAllWindows.mockReturnValue([windowMock]);
    const hub = new MultiWindowHub(appSettings);
    hub.add(windowMock as unknown as BrowserWindow, "secondary-1", "Memory View");

    hub.deleteUnusedLayouts();

    expect(appSettings.unsetSync).toHaveBeenCalledWith("gdb.gui.layouts.stale");
    expect(appSettings.unsetSync).not.toHaveBeenCalledWith("gdb.gui.layouts.secondary-1");
  });

  it("closes tracked secondary windows but keeps tracked main window open", () => {
    const appSettings = {
      initialize: vi.fn(),
      setSync: vi.fn(),
      getSync: vi.fn(),
      unsetSync: vi.fn(),
      hasSync: vi.fn(() => false),
      file: vi.fn(() => "settings.json"),
    };
    const mainWindowMock = {
      title: "revealGDB - The new old way to debug",
      close: vi.fn(),
    };
    const secondaryWindowMock = {
      title: "secondary-runtime-title",
      close: vi.fn(),
    };
    const devtoolsWindowMock = {
      title: "Developer Tools",
      close: vi.fn(),
    };
    browserWindowMocks.getAllWindows.mockReturnValue([
      mainWindowMock,
      secondaryWindowMock,
      devtoolsWindowMock,
    ]);

    const hub = new MultiWindowHub(appSettings);
    hub.add(mainWindowMock as unknown as BrowserWindow, MAIN_WINDOW_UNIQUE_ID);
    hub.add(secondaryWindowMock as unknown as BrowserWindow, "secondary-1", "Memory View");
    hub.add(devtoolsWindowMock as unknown as BrowserWindow, "devtools", "Developer Tools");

    hub.closeAllSecondaryWindows();

    expect(mainWindowMock.close).not.toHaveBeenCalled();
    expect(devtoolsWindowMock.close).not.toHaveBeenCalled();
    expect(secondaryWindowMock.close).toHaveBeenCalledTimes(1);
  });
});
