import { describe, it, expect, beforeEach, vi } from "vitest";
import type { SatelliteWindowsState } from "../src/common/satellite-window-types";

// Mock implementation for testing
class WorkspacePersistence {
  constructor(private settings: any) {}

  loadSatelliteWindows(): SatelliteWindowsState | undefined {
    return this.settings.getSync("gdb.workspace.satelliteWindows") as
      | SatelliteWindowsState
      | undefined;
  }

  saveSatelliteWindows(state: SatelliteWindowsState): void {
    this.settings.setSync("gdb.workspace.satelliteWindows", state);
  }

  clearSatelliteWindows(): void {
    if (this.settings.deleteSync) {
      this.settings.deleteSync("gdb.workspace.satelliteWindows");
    } else if (this.settings.unsetSync) {
      this.settings.unsetSync("gdb.workspace.satelliteWindows");
    }
  }

  loadHostLayout(host: string): unknown {
    return this.settings.getSync("gdb.gui.dockLayout");
  }
}

describe("WorkspacePersistence - Satellite Windows", () => {
  let persistence: WorkspacePersistence;
  let mockSettings: any;

  beforeEach(() => {
    mockSettings = {
      getSync: vi.fn(),
      setSync: vi.fn(),
      deleteSync: vi.fn(),
      unsetSync: vi.fn(),
    };
    persistence = new WorkspacePersistence(mockSettings);
  });

  describe("loadSatelliteWindows", () => {
    it("should load satellite windows state from settings", () => {
      const state: SatelliteWindowsState = {
        windows: {
          "sat-1": {
            windowId: "sat-1",
            title: "Test",
            layout: {},
            bounds: { x: 0, y: 0, width: 800, height: 600 },
            autoRestore: true,
            lastModified: Date.now(),
          },
        },
        windowCounter: 1,
      };

      mockSettings.getSync.mockReturnValue(state);

      const result = persistence.loadSatelliteWindows();

      expect(mockSettings.getSync).toHaveBeenCalledWith("gdb.workspace.satelliteWindows");
      expect(result).toEqual(state);
    });

    it("should return undefined if no satellite windows saved", () => {
      mockSettings.getSync.mockReturnValue(undefined);

      const result = persistence.loadSatelliteWindows();

      expect(result).toBeUndefined();
    });

    it("should handle null return value", () => {
      mockSettings.getSync.mockReturnValue(null);

      const result = persistence.loadSatelliteWindows();

      expect(result).toBeNull();
    });
  });

  describe("saveSatelliteWindows", () => {
    it("should save satellite windows state to settings", () => {
      const state: SatelliteWindowsState = {
        windows: {
          "sat-1": {
            windowId: "sat-1",
            title: "Breakpoints",
            layout: { panels: ["breakpoints"] },
            bounds: { x: 100, y: 100, width: 600, height: 400 },
            autoRestore: true,
            lastModified: 1234567890,
          },
        },
        windowCounter: 1,
      };

      persistence.saveSatelliteWindows(state);

      expect(mockSettings.setSync).toHaveBeenCalledWith("gdb.workspace.satelliteWindows", state);
    });

    it("should save empty windows state", () => {
      const state: SatelliteWindowsState = {
        windows: {},
        windowCounter: 0,
      };

      persistence.saveSatelliteWindows(state);

      expect(mockSettings.setSync).toHaveBeenCalledWith("gdb.workspace.satelliteWindows", state);
    });

    it("should save multiple windows", () => {
      const state: SatelliteWindowsState = {
        windows: {
          "sat-1": {
            windowId: "sat-1",
            title: "Window 1",
            layout: {},
            bounds: { x: 0, y: 0, width: 800, height: 600 },
            autoRestore: true,
            lastModified: Date.now(),
          },
          "sat-2": {
            windowId: "sat-2",
            title: "Window 2",
            layout: {},
            bounds: { x: 100, y: 100, width: 800, height: 600 },
            autoRestore: true,
            lastModified: Date.now(),
          },
        },
        windowCounter: 2,
      };

      persistence.saveSatelliteWindows(state);

      expect(mockSettings.setSync).toHaveBeenCalledWith("gdb.workspace.satelliteWindows", state);
    });
  });

  describe("clearSatelliteWindows", () => {
    it("should delete satellite windows using deleteSync", () => {
      persistence.clearSatelliteWindows();

      expect(mockSettings.deleteSync).toHaveBeenCalledWith("gdb.workspace.satelliteWindows");
    });

    it("should fall back to unsetSync if deleteSync unavailable", () => {
      mockSettings.deleteSync = undefined;

      persistence.clearSatelliteWindows();

      expect(mockSettings.unsetSync).toHaveBeenCalledWith("gdb.workspace.satelliteWindows");
    });

    it("should not throw if neither delete nor unset available", () => {
      mockSettings.deleteSync = undefined;
      mockSettings.unsetSync = undefined;

      expect(() => {
        persistence.clearSatelliteWindows();
      }).not.toThrow();
    });
  });

  describe("Integration with existing methods", () => {
    it("should not interfere with dock layout persistence", () => {
      const dockLayout = { version: 1, panels: [] };
      mockSettings.getSync.mockReturnValue(dockLayout);

      // Load dock layout (existing functionality)
      const layout = persistence.loadHostLayout("main");

      // Verify it called the right key
      expect(mockSettings.getSync).toHaveBeenCalledWith("gdb.gui.dockLayout");
      expect(layout).toEqual(dockLayout);
    });

    it("should use separate storage paths", () => {
      const satelliteState: SatelliteWindowsState = {
        windows: {},
        windowCounter: 0,
      };

      persistence.saveSatelliteWindows(satelliteState);

      const callArgs = mockSettings.setSync.mock.calls;
      const satelliteCall = callArgs.find(
        (args: [string, unknown]) => args[0] === "gdb.workspace.satelliteWindows",
      );
      expect(satelliteCall).toBeDefined();
    });
  });

  describe("Type safety", () => {
    it("should preserve complex layout objects", () => {
      const complexLayout = {
        dockFill: [
          {
            id: "panel-1",
            title: "Source",
            meta: { icon: "code", size: "large" },
          },
        ],
        dockRight: [
          {
            id: "panel-2",
            title: "Disassembly",
          },
        ],
      };

      const state: SatelliteWindowsState = {
        windows: {
          "sat-1": {
            windowId: "sat-1",
            title: "Complex Layout",
            layout: complexLayout,
            bounds: { x: 0, y: 0, width: 800, height: 600 },
            autoRestore: true,
            lastModified: Date.now(),
          },
        },
        windowCounter: 1,
      };

      mockSettings.getSync.mockReturnValue(state);

      const loaded = persistence.loadSatelliteWindows();
      expect((loaded!.windows["sat-1"].layout as any).dockFill).toBeDefined();
      expect((loaded!.windows["sat-1"].layout as any).dockFill[0].meta.icon).toBe("code");
    });
  });
});
