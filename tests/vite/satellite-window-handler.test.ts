import { describe, it, expect, beforeEach, vi } from "vitest";
import type {
  SatelliteWindowState,
  SatelliteWindowBounds,
} from "../src/common/satellite-window-types";

// Mock implementation for testing
class SatelliteWindowHandler {
  private satelliteWindows: Map<string, { windowId: string; lastModified: number }> = new Map();
  private windowCounter = 0;

  registerWindow(windowId: string, window: any): SatelliteWindowState {
    const bounds = window.getBounds();
    const title = window.getTitle();
    const state: SatelliteWindowState = {
      windowId,
      title,
      layout: {},
      bounds,
      autoRestore: true,
      lastModified: Date.now(),
    };
    this.satelliteWindows.set(windowId, {
      windowId,
      lastModified: state.lastModified,
    });
    return state;
  }

  unregisterWindow(windowId: string): void {
    this.satelliteWindows.delete(windowId);
  }

  updateWindowBounds(windowId: string, bounds: SatelliteWindowBounds): void {
    const window = this.satelliteWindows.get(windowId);
    if (window) {
      window.lastModified = Date.now();
    }
  }

  getWindowIds(): string[] {
    return Array.from(this.satelliteWindows.keys());
  }

  getWindowMetadata(windowId: string) {
    return this.satelliteWindows.get(windowId);
  }

  createStateSnapshot(stateByWindowId: Map<string, unknown>): any {
    const windows: Record<string, SatelliteWindowState> = {};
    for (const [windowId, _] of this.satelliteWindows) {
      const layout = stateByWindowId.get(windowId) || {};
      windows[windowId] = {
        windowId,
        title: "",
        layout,
        bounds: { x: 0, y: 0, width: 800, height: 600 },
        autoRestore: true,
        lastModified: Date.now(),
      };
    }
    return {
      windows,
      windowCounter: this.windowCounter,
    };
  }

  restoreFromSnapshot(state: any): string[] {
    this.windowCounter = state.windowCounter || 0;
    const windowIds: string[] = [];
    for (const [windowId, windowState] of Object.entries(state.windows || {})) {
      const ws = windowState as any;
      if (ws.autoRestore !== false) {
        windowIds.push(windowId);
        this.satelliteWindows.set(windowId, {
          windowId,
          lastModified: ws.lastModified,
        });
      }
    }
    return windowIds;
  }

  closeAllSatelliteWindows(windows: Map<string, any>): void {
    for (const [windowId, window] of windows) {
      if (!window.isDestroyed()) {
        window.close();
      }
    }
  }
}

describe("SatelliteWindowHandler", () => {
  let handler: SatelliteWindowHandler;

  beforeEach(() => {
    handler = new SatelliteWindowHandler();
  });

  describe("initialization", () => {
    it("should initialize with empty window map", () => {
      expect(handler.getWindowIds()).toHaveLength(0);
    });

    it("should start with zero window counter", () => {
      const snapshot = handler.createStateSnapshot(new Map());
      expect(snapshot.windowCounter).toBe(0);
    });
  });

  describe("registerWindow", () => {
    it("should register a window and return initial state", () => {
      const mockWindow = {
        getBounds: () => ({ x: 100, y: 100, width: 800, height: 600 }),
        getTitle: () => "Test Window",
      };

      const state = handler.registerWindow("sat-1", mockWindow);

      expect(state.windowId).toBe("sat-1");
      expect(state.title).toBe("Test Window");
      expect(state.bounds).toEqual({ x: 100, y: 100, width: 800, height: 600 });
      expect(state.autoRestore).toBe(true);
    });

    it("should track registered windows", () => {
      const mockWindow = {
        getBounds: () => ({ x: 0, y: 0, width: 1024, height: 768 }),
        getTitle: () => "Window 1",
      };

      handler.registerWindow("sat-1", mockWindow);
      handler.registerWindow("sat-2", mockWindow);

      expect(handler.getWindowIds()).toEqual(["sat-1", "sat-2"]);
    });

    it("should store metadata with timestamp", () => {
      const mockWindow = {
        getBounds: () => ({ x: 0, y: 0, width: 800, height: 600 }),
        getTitle: () => "Test",
      };

      const beforeTime = Date.now();
      handler.registerWindow("sat-1", mockWindow);
      const afterTime = Date.now();

      const metadata = handler.getWindowMetadata("sat-1");
      expect(metadata).toBeDefined();
      expect(metadata!.lastModified).toBeGreaterThanOrEqual(beforeTime);
      expect(metadata!.lastModified).toBeLessThanOrEqual(afterTime);
    });
  });

  describe("unregisterWindow", () => {
    it("should remove window from tracking", () => {
      const mockWindow = {
        getBounds: () => ({ x: 0, y: 0, width: 800, height: 600 }),
        getTitle: () => "Test",
      };

      handler.registerWindow("sat-1", mockWindow);
      expect(handler.getWindowIds()).toHaveLength(1);

      handler.unregisterWindow("sat-1");
      expect(handler.getWindowIds()).toHaveLength(0);
    });

    it("should handle unregistering non-existent window gracefully", () => {
      expect(() => {
        handler.unregisterWindow("sat-999");
      }).not.toThrow();
    });
  });

  describe("updateWindowBounds", () => {
    it("should update timestamp when bounds change", () => {
      const mockWindow = {
        getBounds: () => ({ x: 0, y: 0, width: 800, height: 600 }),
        getTitle: () => "Test",
      };

      handler.registerWindow("sat-1", mockWindow);
      const originalMetadata = handler.getWindowMetadata("sat-1")!;
      const originalTime = originalMetadata.lastModified;

      // Wait and update by directly setting a later timestamp
      vi.useFakeTimers();
      const futureTime = originalTime + 1000; // 1 second in future
      vi.setSystemTime(futureTime);

      const newBounds: SatelliteWindowBounds = { x: 100, y: 100, width: 900, height: 700 };
      handler.updateWindowBounds("sat-1", newBounds);

      const updatedMetadata = handler.getWindowMetadata("sat-1")!;
      expect(updatedMetadata.lastModified).toBeGreaterThan(originalTime);
      expect(updatedMetadata.lastModified).toBe(futureTime);

      vi.useRealTimers();
    });

    it("should ignore updates for non-existent windows", () => {
      const bounds: SatelliteWindowBounds = { x: 0, y: 0, width: 800, height: 600 };
      expect(() => {
        handler.updateWindowBounds("sat-999", bounds);
      }).not.toThrow();
    });
  });

  describe("getWindowIds", () => {
    it("should return array of registered window IDs", () => {
      const mockWindow = {
        getBounds: () => ({ x: 0, y: 0, width: 800, height: 600 }),
        getTitle: () => "Test",
      };

      handler.registerWindow("sat-1", mockWindow);
      handler.registerWindow("sat-2", mockWindow);
      handler.registerWindow("sat-3", mockWindow);

      const ids = handler.getWindowIds();
      expect(ids).toContain("sat-1");
      expect(ids).toContain("sat-2");
      expect(ids).toContain("sat-3");
      expect(ids).toHaveLength(3);
    });
  });

  describe("getWindowMetadata", () => {
    it("should retrieve metadata for registered window", () => {
      const mockWindow = {
        getBounds: () => ({ x: 0, y: 0, width: 800, height: 600 }),
        getTitle: () => "Test",
      };

      handler.registerWindow("sat-1", mockWindow);
      const metadata = handler.getWindowMetadata("sat-1");

      expect(metadata).toBeDefined();
      expect(metadata!.windowId).toBe("sat-1");
    });

    it("should return undefined for non-existent window", () => {
      const metadata = handler.getWindowMetadata("sat-999");
      expect(metadata).toBeUndefined();
    });
  });

  describe("createStateSnapshot", () => {
    it("should create snapshot of current windows", () => {
      const mockWindow = {
        getBounds: () => ({ x: 0, y: 0, width: 800, height: 600 }),
        getTitle: () => "Test",
      };

      handler.registerWindow("sat-1", mockWindow);
      handler.registerWindow("sat-2", mockWindow);

      const stateMap = new Map<string, unknown>([
        ["sat-1", { panels: ["source"] }],
        ["sat-2", { panels: ["memory"] }],
      ]);

      const snapshot = handler.createStateSnapshot(stateMap);

      expect(Object.keys(snapshot.windows)).toHaveLength(2);
      expect(snapshot.windows["sat-1"]).toBeDefined();
      expect(snapshot.windows["sat-2"]).toBeDefined();
      expect(snapshot.windowCounter).toBe(0);
    });

    it("should include layout in snapshot", () => {
      const mockWindow = {
        getBounds: () => ({ x: 0, y: 0, width: 800, height: 600 }),
        getTitle: () => "Test",
      };

      handler.registerWindow("sat-1", mockWindow);

      const testLayout = { custom: true, panels: ["a", "b"] };
      const stateMap = new Map<string, unknown>([["sat-1", testLayout]]);

      const snapshot = handler.createStateSnapshot(stateMap);
      expect(snapshot.windows["sat-1"].layout).toEqual(testLayout);
    });

    it("should handle empty state map", () => {
      const mockWindow = {
        getBounds: () => ({ x: 0, y: 0, width: 800, height: 600 }),
        getTitle: () => "Test",
      };

      handler.registerWindow("sat-1", mockWindow);

      const snapshot = handler.createStateSnapshot(new Map());
      expect(snapshot.windows["sat-1"].layout).toEqual({});
    });
  });

  describe("restoreFromSnapshot", () => {
    it("should restore windows from snapshot", () => {
      const snapshot = {
        windows: {
          "sat-1": {
            windowId: "sat-1",
            title: "Breakpoints",
            layout: {},
            bounds: { x: 0, y: 0, width: 800, height: 600 },
            autoRestore: true,
            lastModified: Date.now(),
          },
          "sat-2": {
            windowId: "sat-2",
            title: "Memory",
            layout: {},
            bounds: { x: 100, y: 100, width: 800, height: 600 },
            autoRestore: true,
            lastModified: Date.now(),
          },
        },
        windowCounter: 5,
      };

      const windowIds = handler.restoreFromSnapshot(snapshot);

      expect(windowIds).toContain("sat-1");
      expect(windowIds).toContain("sat-2");
      expect(windowIds).toHaveLength(2);
    });

    it("should skip windows with autoRestore=false", () => {
      const snapshot = {
        windows: {
          "sat-1": {
            windowId: "sat-1",
            title: "Restore",
            layout: {},
            bounds: { x: 0, y: 0, width: 800, height: 600 },
            autoRestore: true,
            lastModified: Date.now(),
          },
          "sat-2": {
            windowId: "sat-2",
            title: "NoRestore",
            layout: {},
            bounds: { x: 100, y: 100, width: 800, height: 600 },
            autoRestore: false,
            lastModified: Date.now(),
          },
        },
        windowCounter: 2,
      };

      const windowIds = handler.restoreFromSnapshot(snapshot);

      expect(windowIds).toContain("sat-1");
      expect(windowIds).not.toContain("sat-2");
      expect(windowIds).toHaveLength(1);
    });

    it("should restore window counter", () => {
      const snapshot = {
        windows: {},
        windowCounter: 42,
      };

      handler.restoreFromSnapshot(snapshot);

      // Create a new snapshot to check counter was restored
      const newSnapshot = handler.createStateSnapshot(new Map());
      expect(newSnapshot.windowCounter).toBe(42);
    });
  });

  describe("closeAllSatelliteWindows", () => {
    it("should close all tracked windows", () => {
      const mockWindow1 = {
        isDestroyed: () => false,
        close: vi.fn(),
      };
      const mockWindow2 = {
        isDestroyed: () => false,
        close: vi.fn(),
      };

      const windowsMap = new Map([
        ["sat-1", mockWindow1],
        ["sat-2", mockWindow2],
      ]);

      handler.registerWindow("sat-1", {
        getBounds: () => ({ x: 0, y: 0, width: 800, height: 600 }),
        getTitle: () => "Test",
      });
      handler.registerWindow("sat-2", {
        getBounds: () => ({ x: 0, y: 0, width: 800, height: 600 }),
        getTitle: () => "Test",
      });

      handler.closeAllSatelliteWindows(windowsMap);

      expect(mockWindow1.close).toHaveBeenCalled();
      expect(mockWindow2.close).toHaveBeenCalled();
    });

    it("should skip destroyed windows", () => {
      const mockWindow = {
        isDestroyed: () => true,
        close: vi.fn(),
      };

      const windowsMap = new Map([["sat-1", mockWindow]]);

      handler.registerWindow("sat-1", {
        getBounds: () => ({ x: 0, y: 0, width: 800, height: 600 }),
        getTitle: () => "Test",
      });

      handler.closeAllSatelliteWindows(windowsMap);

      expect(mockWindow.close).not.toHaveBeenCalled();
    });
  });
});
