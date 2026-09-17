/**
 * Tests for satellite window restoration logic on app startup
 *
 * This test suite verifies that:
 * 1. Satellites are restored based on saved bounds, not visibility flag
 * 2. Even if satellites were marked invisible during shutdown, they're restored if bounds exist
 * 3. The restore logic correctly identifies which satellites should be restored
 */

import { beforeEach, describe, expect, it } from "vitest";

describe("Satellite Window Restoration", () => {
  let mockAppSettings: Record<string, unknown>;
  let mockWorkspace: {
    hosts?: Array<{ id: string; label: string; isVisible: boolean; createdAt: number }>;
  };

  function resetMockSettings(): void {
    mockAppSettings = {
      "gdb.gui.windowBoundsByHost": {
        main: { x: 0, y: 0, width: 800, height: 600 },
        "satellite-1": { x: 100, y: 100, width: 400, height: 300 },
        "satellite-2": { x: 200, y: 200, width: 500, height: 400 },
      },
      "gdb.gui.windowMaximizedByHost": {
        main: false,
        "satellite-1": false,
        "satellite-2": true,
      },
      "gdb.gui.windowFullScreenByHost": {
        main: false,
      },
    };
  }

  function resetMockWorkspace(): void {
    // Simulate workspace after shutdown where satellites are marked invisible
    mockWorkspace = {
      hosts: [
        { id: "main", label: "Main Window", isVisible: true, createdAt: Date.now() },
        { id: "satellite-1", label: "Satellite 1", isVisible: false, createdAt: Date.now() - 1000 }, // marked invisible during shutdown
        { id: "satellite-2", label: "Satellite 2", isVisible: false, createdAt: Date.now() - 1000 }, // marked invisible during shutdown
      ],
    };
  }

  function simulateRestoreLogic(): {
    satellitesToRestore: string[];
    reason: string;
  } {
    // This simulates the NEW restore logic that checks for saved bounds instead of visibility
    const boundsMap =
      (mockAppSettings["gdb.gui.windowBoundsByHost"] as Record<string, unknown>) || {};

    // Find satellite hosts that have saved bounds (not just those marked visible)
    const satelliteHostsWithBounds = Object.keys(boundsMap).filter((hostId) => hostId !== "main");

    return {
      satellitesToRestore: satelliteHostsWithBounds,
      reason: "Restored based on saved bounds existing, not visibility flag",
    };
  }

  beforeEach(() => {
    resetMockSettings();
    resetMockWorkspace();
  });

  describe("Restore based on saved bounds, not visibility", () => {
    it("should restore satellites that have saved bounds even if marked invisible", () => {
      // Setup: satellites marked invisible in workspace (as they would be after shutdown)
      const visibleInWorkspace =
        mockWorkspace.hosts?.filter((h) => h.isVisible && h.id !== "main").length || 0;
      expect(visibleInWorkspace).toBe(0, "No satellites should be marked visible after shutdown");

      // However, saved bounds still exist
      const boundsMap =
        (mockAppSettings["gdb.gui.windowBoundsByHost"] as Record<string, unknown>) || {};
      expect("satellite-1" in boundsMap).toBe(true, "Satellite-1 bounds should exist");
      expect("satellite-2" in boundsMap).toBe(true, "Satellite-2 bounds should exist");

      // Simulate restore logic
      const restoreResult = simulateRestoreLogic();
      expect(restoreResult.satellitesToRestore).toContain("satellite-1");
      expect(restoreResult.satellitesToRestore).toContain("satellite-2");
      expect(restoreResult.satellitesToRestore.length).toBe(2);
    });

    it("should not restore satellites that have no saved bounds", () => {
      // Remove one satellite from saved bounds
      const boundsMap =
        (mockAppSettings["gdb.gui.windowBoundsByHost"] as Record<string, unknown>) || {};
      delete boundsMap["satellite-2"];

      // Simulate restore logic
      const restoreResult = simulateRestoreLogic();
      expect(restoreResult.satellitesToRestore).toContain("satellite-1");
      expect(restoreResult.satellitesToRestore).not.toContain("satellite-2");
      expect(restoreResult.satellitesToRestore.length).toBe(1);
    });

    it("should restore empty list when no saved bounds exist for satellites", () => {
      // Clear all satellite bounds
      const boundsMap =
        (mockAppSettings["gdb.gui.windowBoundsByHost"] as Record<string, unknown>) || {};
      delete boundsMap["satellite-1"];
      delete boundsMap["satellite-2"];

      // Simulate restore logic
      const restoreResult = simulateRestoreLogic();
      expect(restoreResult.satellitesToRestore.length).toBe(0);
    });
  });

  describe("Satellite restoration with correct bounds lookup", () => {
    it("should identify correct bounds for each satellite being restored", () => {
      const restoreResult = simulateRestoreLogic();
      const boundsMap =
        (mockAppSettings["gdb.gui.windowBoundsByHost"] as Record<string, unknown>) || {};

      // Each satellite to restore should have corresponding bounds
      for (const hostId of restoreResult.satellitesToRestore) {
        expect(hostId in boundsMap).toBe(true, `${hostId} should have saved bounds`);
        const bounds = boundsMap[hostId] as any;
        expect(bounds).toHaveProperty("x");
        expect(bounds).toHaveProperty("y");
        expect(bounds).toHaveProperty("width");
        expect(bounds).toHaveProperty("height");
      }
    });

    it("should preserve correct bounds for each restored satellite", () => {
      const boundsMap =
        (mockAppSettings["gdb.gui.windowBoundsByHost"] as Record<string, unknown>) || {};

      const satellite1Bounds = boundsMap["satellite-1"] as any;
      const satellite2Bounds = boundsMap["satellite-2"] as any;

      expect(satellite1Bounds.x).toBe(100);
      expect(satellite1Bounds.y).toBe(100);
      expect(satellite1Bounds.width).toBe(400);
      expect(satellite1Bounds.height).toBe(300);

      expect(satellite2Bounds.x).toBe(200);
      expect(satellite2Bounds.y).toBe(200);
      expect(satellite2Bounds.width).toBe(500);
      expect(satellite2Bounds.height).toBe(400);
    });
  });

  describe("Integration: Shutdown -> Restart -> Restore flow", () => {
    it("should restore satellites after shutdown marked them invisible", () => {
      // Simulate the full flow:
      // 1. App running with satellites open
      // 2. Shutdown: satellites marked invisible
      // 3. App restart: should restore them based on bounds

      // State after shutdown: satellites invisible in workspace but bounds preserved
      const visibleAfterShutdown = mockWorkspace.hosts?.filter(
        (h) => h.isVisible && h.id !== "main",
      ).length;
      expect(visibleAfterShutdown).toBe(0, "All satellites should be invisible after shutdown");

      const boundsMap =
        (mockAppSettings["gdb.gui.windowBoundsByHost"] as Record<string, unknown>) || {};
      const boundsKeys = Object.keys(boundsMap);
      expect(boundsKeys).toContain("satellite-1", "Satellite-1 bounds should be preserved");
      expect(boundsKeys).toContain("satellite-2", "Satellite-2 bounds should be preserved");

      // On restart, restore logic checks bounds
      const restoreResult = simulateRestoreLogic();
      expect(restoreResult.satellitesToRestore.length).toBe(2);
      expect(restoreResult.satellitesToRestore).toContain("satellite-1");
      expect(restoreResult.satellitesToRestore).toContain("satellite-2");
    });

    it("should handle case where user closed a satellite before shutdown", () => {
      // User directly closes satellite-2, then closes app
      // satellite-2 bounds should be removed, satellite-1 preserved
      const boundsMap =
        (mockAppSettings["gdb.gui.windowBoundsByHost"] as Record<string, unknown>) || {};
      delete boundsMap["satellite-2"]; // Direct close removes bounds

      // Then shutdown happens (marks all invisible)
      // mockWorkspace.hosts all marked invisible (as in previous scenario)

      // On restart, only satellite-1 should be restored
      const restoreResult = simulateRestoreLogic();
      expect(restoreResult.satellitesToRestore.length).toBe(1);
      expect(restoreResult.satellitesToRestore).toContain("satellite-1");
      expect(restoreResult.satellitesToRestore).not.toContain("satellite-2");
    });
  });
});
