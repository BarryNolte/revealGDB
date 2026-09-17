import { beforeEach, describe, expect, it, vi } from "vitest";

const multiWindowMocks = vi.hoisted(() => ({
  browserWindowFactory: vi.fn(),
  normalizeWindowBounds: vi.fn((bounds) => bounds),
  primaryDisplay: {
    bounds: { x: 0, y: 0, width: 1920, height: 1080 },
  },
}));

vi.mock("electron", () => ({
  BrowserWindow: vi.fn(function BrowserWindowMock(options: unknown) {
    return multiWindowMocks.browserWindowFactory(options);
  }),
  screen: {
    getAllDisplays: vi.fn(() => [multiWindowMocks.primaryDisplay]),
    getPrimaryDisplay: vi.fn(() => multiWindowMocks.primaryDisplay),
  },
}));

vi.mock("../../../src/main/utilities/window-bounds-recovery", () => ({
  normalizeWindowBounds: multiWindowMocks.normalizeWindowBounds,
}));

import { createSatelliteWindow } from "../../../src/main/multi-window-manager";

describe("multi-window-manager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    multiWindowMocks.browserWindowFactory.mockImplementation(() => ({
      on: vi.fn(),
      loadURL: vi.fn(),
      setMenuBarVisibility: vi.fn(),
      isDestroyed: vi.fn().mockReturnValue(false),
      show: vi.fn(),
      focus: vi.fn(),
      close: vi.fn(),
    }));
  });

  it("creates satellite windows without an application menu bar", () => {
    const window = createSatelliteWindow(
      "satellite-test",
      undefined,
      "http://localhost:5173",
      "out/preload/preload.js",
    ) as {
      setMenuBarVisibility: ReturnType<typeof vi.fn>;
    };

    expect(multiWindowMocks.browserWindowFactory).toHaveBeenCalledWith(
      expect.objectContaining({
        autoHideMenuBar: true,
        show: false,
      }),
    );
    expect(window.setMenuBarVisibility).toHaveBeenCalledWith(false);
  });
});
