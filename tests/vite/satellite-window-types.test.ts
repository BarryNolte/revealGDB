import { describe, it, expect, beforeEach } from "vitest";
import type {
  SatelliteWindowBounds,
  SatelliteWindowState,
  SatelliteWindowsState,
} from "../src/common/satellite-window-types";

describe("satellite-window-types", () => {
  describe("SatelliteWindowBounds", () => {
    it("should define valid bounds with positive values", () => {
      const bounds: SatelliteWindowBounds = {
        x: 100,
        y: 200,
        width: 800,
        height: 600,
      };
      expect(bounds.x).toBe(100);
      expect(bounds.y).toBe(200);
      expect(bounds.width).toBe(800);
      expect(bounds.height).toBe(600);
    });

    it("should support zero coordinates", () => {
      const bounds: SatelliteWindowBounds = {
        x: 0,
        y: 0,
        width: 1024,
        height: 768,
      };
      expect(bounds.x).toBe(0);
      expect(bounds.y).toBe(0);
    });

    it("should support negative coordinates (off-screen)", () => {
      const bounds: SatelliteWindowBounds = {
        x: -100,
        y: -50,
        width: 400,
        height: 300,
      };
      expect(bounds.x).toBe(-100);
      expect(bounds.y).toBe(-50);
    });
  });

  describe("SatelliteWindowState", () => {
    it("should define complete window state", () => {
      const state: SatelliteWindowState = {
        windowId: "satellite-window-1",
        title: "Source Viewer",
        layout: { panels: ["source"], focused: 0 },
        bounds: { x: 50, y: 50, width: 1000, height: 700 },
        autoRestore: true,
        lastModified: Date.now(),
      };
      expect(state.windowId).toBe("satellite-window-1");
      expect(state.title).toBe("Source Viewer");
      expect(state.autoRestore).toBe(true);
    });

    it("should support empty layout", () => {
      const state: SatelliteWindowState = {
        windowId: "satellite-window-1",
        title: "Empty Window",
        layout: {},
        bounds: { x: 0, y: 0, width: 800, height: 600 },
        autoRestore: false,
        lastModified: Date.now(),
      };
      expect(state.layout).toEqual({});
    });

    it("should track last modified timestamp", () => {
      const now = Date.now();
      const state: SatelliteWindowState = {
        windowId: "sat-1",
        title: "Test",
        layout: {},
        bounds: { x: 0, y: 0, width: 800, height: 600 },
        autoRestore: true,
        lastModified: now,
      };
      expect(state.lastModified).toBe(now);
    });
  });

  describe("SatelliteWindowsState", () => {
    it("should define container for multiple windows", () => {
      const state: SatelliteWindowsState = {
        windows: {
          "satellite-window-1": {
            windowId: "satellite-window-1",
            title: "Breakpoints",
            layout: {},
            bounds: { x: 100, y: 100, width: 600, height: 400 },
            autoRestore: true,
            lastModified: Date.now(),
          },
          "satellite-window-2": {
            windowId: "satellite-window-2",
            title: "Memory",
            layout: {},
            bounds: { x: 200, y: 200, width: 500, height: 300 },
            autoRestore: true,
            lastModified: Date.now(),
          },
        },
        windowCounter: 2,
      };
      expect(Object.keys(state.windows)).toHaveLength(2);
      expect(state.windowCounter).toBe(2);
    });

    it("should support empty windows map", () => {
      const state: SatelliteWindowsState = {
        windows: {},
        windowCounter: 0,
      };
      expect(Object.keys(state.windows)).toHaveLength(0);
      expect(state.windowCounter).toBe(0);
    });

    it("should track window counter for ID generation", () => {
      const state: SatelliteWindowsState = {
        windows: {},
        windowCounter: 42,
      };
      expect(state.windowCounter).toBe(42);
    });
  });

  describe("Type compatibility", () => {
    it("should allow nested layout structures", () => {
      const complexLayout = {
        dockFill: [
          { id: "panel-1", title: "Source" },
          { id: "panel-2", title: "Disassembly" },
        ],
        dockRight: [{ id: "panel-3", title: "Registers" }],
      };

      const state: SatelliteWindowState = {
        windowId: "sat-1",
        title: "Complex",
        layout: complexLayout,
        bounds: { x: 0, y: 0, width: 800, height: 600 },
        autoRestore: true,
        lastModified: Date.now(),
      };
      expect(state.layout).toEqual(complexLayout);
    });

    it("should serialize to JSON correctly", () => {
      const state: SatelliteWindowsState = {
        windows: {
          "sat-1": {
            windowId: "sat-1",
            title: "Test",
            layout: { test: true },
            bounds: { x: 0, y: 0, width: 800, height: 600 },
            autoRestore: true,
            lastModified: 1234567890,
          },
        },
        windowCounter: 1,
      };

      const json = JSON.stringify(state);
      const parsed = JSON.parse(json) as SatelliteWindowsState;
      expect(parsed.windows["sat-1"].title).toBe("Test");
      expect(parsed.windowCounter).toBe(1);
    });
  });
});
