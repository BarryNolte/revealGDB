import { BrowserWindow } from "electron";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MultiWindowHub } from "../../../src/main/multi-window-hub";

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

  it("uses runtime title when window is not tracked in the hub", () => {
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

    hub.saveWindowInfo(null);

    expect(appSettings.setSync).toHaveBeenCalledWith(
      "gdb.gui.layouts.revealGDB - The new old way to debug.title",
      "revealGDB - The new old way to debug",
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
});
