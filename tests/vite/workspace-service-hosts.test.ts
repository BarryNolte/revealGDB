/**
 * Unit tests for WorkspaceService host operations (satellites, listing, visibility).
 * Tests cover satellite host creation, removal, listing, and host visibility management.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { WorkspaceState, DockHost } from "../../src/common/workspace-types";
import { WorkspacePersistence } from "../../src/main/workspace-persistence";
import { WorkspaceService } from "../../src/main/workspace-service";
import type { SettingsLike } from "../../src/main/ipc/workspace-handlers";

// Mock SettingsLike
const createMockSettings = (): SettingsLike => {
  const data = new Map<string, unknown>();
  return {
    getSync: (key: string) => data.get(key),
    setSync: (key: string, value: unknown) => {
      data.set(key, value);
    },
  };
};

describe("WorkspaceService - Host Operations", () => {
  let mockSettings: SettingsLike;
  let persistence: WorkspacePersistence;
  let service: WorkspaceService;

  beforeEach(() => {
    mockSettings = createMockSettings();
    persistence = new WorkspacePersistence(mockSettings);
    service = new WorkspaceService(persistence);
  });

  afterEach(() => {
    // Cleanup
  });

  describe("createSatelliteHost", () => {
    it("should create a new satellite host with auto-generated label", () => {
      const result = service.createSatelliteHost();

      expect(result.hostId).toBeDefined();
      expect(result.hostId).toMatch(/^satellite-\d+-[\da-z]+$/);
      expect(result.host).toBeDefined();
      expect(result.host.id).toBe(result.hostId);
      expect(result.host.label).toBe("Dock Window 1");
      expect(result.host.isVisible).toBe(true);
      expect(result.host.createdAt).toBeGreaterThan(0);
    });

    it("should create a new satellite host with custom label", () => {
      const result = service.createSatelliteHost("Custom Window");

      expect(result.host.label).toBe("Custom Window");
      expect(result.host.id).toBe(result.hostId);
    });

    it("should add host to workspace hosts array", () => {
      const initialCount = service.getWorkspace().hosts.length;
      service.createSatelliteHost("Test Window");

      const workspace = service.getWorkspace();
      expect(workspace.hosts.length).toBe(initialCount + 1);
    });

    it("should initialize host layout storage", () => {
      const result = service.createSatelliteHost();
      const workspace = service.getWorkspace();

      expect(workspace.hostLayouts[result.hostId]).toBeDefined();
      expect(typeof workspace.hostLayouts[result.hostId]).toBe("object");
    });

    it("should initialize host window bounds", () => {
      const result = service.createSatelliteHost();
      const workspace = service.getWorkspace();

      expect(workspace.hostWindowBounds[result.hostId]).toBeDefined();
      expect(workspace.hostWindowBounds[result.hostId].width).toBe(800);
      expect(workspace.hostWindowBounds[result.hostId].height).toBe(600);
    });

    it("should initialize host maximized and fullscreen state", () => {
      const result = service.createSatelliteHost();
      const workspace = service.getWorkspace();

      expect(workspace.hostWindowMaximized[result.hostId]).toBe(false);
      expect(workspace.hostWindowFullscreen[result.hostId]).toBe(false);
    });

    it("should persist workspace after creation", () => {
      const result = service.createSatelliteHost("Persistent Window");

      // Create new service to verify persistence
      const service2 = new WorkspaceService(persistence);
      const host = service2.getHost(result.hostId);

      expect(host).toBeDefined();
      expect(host?.label).toBe("Persistent Window");
    });

    it("should generate unique IDs for multiple satellites", () => {
      const result1 = service.createSatelliteHost("Window 1");
      const result2 = service.createSatelliteHost("Window 2");
      const result3 = service.createSatelliteHost("Window 3");

      expect(result1.hostId).not.toBe(result2.hostId);
      expect(result2.hostId).not.toBe(result3.hostId);
      expect(result1.hostId).not.toBe(result3.hostId);
    });

    it("should increment auto-generated labels", () => {
      service.createSatelliteHost(); // "Dock Window 1"
      const result2 = service.createSatelliteHost(); // "Dock Window 2"
      const result3 = service.createSatelliteHost(); // "Dock Window 3"

      expect(result2.host.label).toBe("Dock Window 2");
      expect(result3.host.label).toBe("Dock Window 3");
    });
  });

  describe("removeSatelliteHost", () => {
    it("should remove satellite host by ID", () => {
      const created = service.createSatelliteHost("Removable");
      const initialCount = service.getWorkspace().hosts.length;

      const success = service.removeSatelliteHost(created.hostId);

      expect(success).toBe(true);
      expect(service.getWorkspace().hosts.length).toBe(initialCount - 1);
      expect(service.getHost(created.hostId)).toBeUndefined();
    });

    it("should not allow removing main host", () => {
      const success = service.removeSatelliteHost("main");

      expect(success).toBe(false);
      expect(service.getHost("main")).toBeDefined();
    });

    it("should return false for non-existent host", () => {
      const success = service.removeSatelliteHost("non-existent-host-id");

      expect(success).toBe(false);
    });

    it("should clean up host layouts", () => {
      const created = service.createSatelliteHost();
      expect(service.getWorkspace().hostLayouts[created.hostId]).toBeDefined();

      service.removeSatelliteHost(created.hostId);

      expect(service.getWorkspace().hostLayouts[created.hostId]).toBeUndefined();
    });

    it("should clean up host window bounds", () => {
      const created = service.createSatelliteHost();
      expect(service.getWorkspace().hostWindowBounds[created.hostId]).toBeDefined();

      service.removeSatelliteHost(created.hostId);

      expect(service.getWorkspace().hostWindowBounds[created.hostId]).toBeUndefined();
    });

    it("should clean up host maximized state", () => {
      const created = service.createSatelliteHost();
      expect(service.getWorkspace().hostWindowMaximized[created.hostId]).toBeDefined();

      service.removeSatelliteHost(created.hostId);

      expect(service.getWorkspace().hostWindowMaximized[created.hostId]).toBeUndefined();
    });

    it("should clean up host fullscreen state", () => {
      const created = service.createSatelliteHost();
      expect(service.getWorkspace().hostWindowFullscreen[created.hostId]).toBeDefined();

      service.removeSatelliteHost(created.hostId);

      expect(service.getWorkspace().hostWindowFullscreen[created.hostId]).toBeUndefined();
    });

    it("should persist removal to workspace settings", () => {
      const created = service.createSatelliteHost("To Remove");
      service.removeSatelliteHost(created.hostId);

      // Verify by creating new service
      const service2 = new WorkspaceService(persistence);
      expect(service2.getHost(created.hostId)).toBeUndefined();
    });
  });

  describe("listHosts", () => {
    it("should return all hosts including main", () => {
      const hosts = service.listHosts();

      expect(hosts.length).toBeGreaterThanOrEqual(1);
      expect(hosts.some((h) => h.id === "main")).toBe(true);
    });

    it("should return main plus any satellites", () => {
      service.createSatelliteHost("Sat1");
      service.createSatelliteHost("Sat2");

      const hosts = service.listHosts();

      expect(hosts.length).toBe(3);
      expect(hosts.map((h) => h.id)).toContain("main");
    });

    it("should return array copy not reference", () => {
      const hosts1 = service.listHosts();
      const hosts2 = service.listHosts();

      expect(hosts1).not.toBe(hosts2);
      expect(hosts1).toEqual(hosts2);
    });

    it("should include all host properties", () => {
      const created = service.createSatelliteHost("Complete Host");
      const hosts = service.listHosts();
      const found = hosts.find((h) => h.id === created.hostId);

      expect(found).toBeDefined();
      expect(found?.id).toBeDefined();
      expect(found?.label).toBeDefined();
      expect(found?.isVisible).toBeDefined();
      expect(found?.createdAt).toBeDefined();
    });
  });

  describe("getHost", () => {
    it("should return host by ID", () => {
      const created = service.createSatelliteHost("Lookup");
      const found = service.getHost(created.hostId);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.hostId);
      expect(found?.label).toBe("Lookup");
    });

    it("should return main host", () => {
      const main = service.getHost("main");

      expect(main).toBeDefined();
      expect(main?.id).toBe("main");
    });

    it("should return undefined for non-existent host", () => {
      const found = service.getHost("does-not-exist");

      expect(found).toBeUndefined();
    });
  });

  describe("setHostVisibility", () => {
    it("should set host visibility to hidden", () => {
      const created = service.createSatelliteHost();
      const workspace = service.setHostVisibility(created.hostId, false);

      const host = workspace.hosts.find((h) => h.id === created.hostId);
      expect(host?.isVisible).toBe(false);
    });

    it("should set host visibility to visible", () => {
      const created = service.createSatelliteHost();
      service.setHostVisibility(created.hostId, false);
      const workspace = service.setHostVisibility(created.hostId, true);

      const host = workspace.hosts.find((h) => h.id === created.hostId);
      expect(host?.isVisible).toBe(true);
    });

    it("should update lastUsedAt timestamp", () => {
      const created = service.createSatelliteHost();
      const before = Date.now();
      service.setHostVisibility(created.hostId, true);
      const after = Date.now();

      const workspace = service.getWorkspace();
      const host = workspace.hosts.find((h) => h.id === created.hostId);

      expect(host?.lastUsedAt).toBeGreaterThanOrEqual(before);
      expect(host?.lastUsedAt).toBeLessThanOrEqual(after);
    });

    it("should return updated workspace", () => {
      const created = service.createSatelliteHost();
      const result = service.setHostVisibility(created.hostId, false);

      expect(result.hosts).toBeDefined();
      expect(result.hosts.length).toBeGreaterThan(0);
    });

    it("should handle non-existent host gracefully", () => {
      const workspace = service.setHostVisibility("non-existent", false);

      // Should return workspace unchanged
      expect(workspace).toBeDefined();
      expect(workspace.hosts).toBeDefined();
    });

    it("should persist visibility changes", () => {
      const created = service.createSatelliteHost();
      service.setHostVisibility(created.hostId, false);

      // Verify by creating new service
      const service2 = new WorkspaceService(persistence);
      const host = service2.getHost(created.hostId);
      expect(host?.isVisible).toBe(false);
    });
  });

  describe("Integration", () => {
    it("should handle create, list, modify, remove workflow", () => {
      // Create
      const sat1 = service.createSatelliteHost("Window A");
      const sat2 = service.createSatelliteHost("Window B");

      // List
      let hosts = service.listHosts();
      expect(hosts.length).toBe(3); // main + 2 satellites

      // Modify
      service.setHostVisibility(sat1.hostId, false);

      // Verify
      const host1 = service.getHost(sat1.hostId);
      expect(host1?.isVisible).toBe(false);

      // Remove
      service.removeSatelliteHost(sat1.hostId);

      // Final list
      hosts = service.listHosts();
      expect(hosts.length).toBe(2); // main + 1 satellite
      expect(hosts.find((h) => h.id === sat1.hostId)).toBeUndefined();
      expect(hosts.find((h) => h.id === sat2.hostId)).toBeDefined();
    });

    it("should maintain workspace state consistency across operations", () => {
      const sat1 = service.createSatelliteHost("A");
      const sat2 = service.createSatelliteHost("B");

      // Verify all properties are initialized consistently
      const workspace = service.getWorkspace();
      const hostIds = workspace.hosts.map((h) => h.id);

      hostIds.forEach((hostId) => {
        expect(workspace.hostLayouts).toBeDefined();
        expect(workspace.hostLayouts[hostId]).toBeDefined();
        expect(workspace.hostWindowBounds).toBeDefined();
        expect(workspace.hostWindowBounds[hostId]).toBeDefined();
        expect(workspace.hostWindowMaximized).toBeDefined();
        expect(workspace.hostWindowMaximized[hostId]).toBeDefined();
        expect(workspace.hostWindowFullscreen).toBeDefined();
        expect(workspace.hostWindowFullscreen[hostId]).toBeDefined();
      });

      // Remove one and verify consistency
      service.removeSatelliteHost(sat1.hostId);

      const workspace2 = service.getWorkspace();
      workspace2.hosts.forEach((host) => {
        expect(workspace2.hostLayouts).toBeDefined();
        expect(workspace2.hostLayouts[host.id]).toBeDefined();
        expect(workspace2.hostWindowBounds).toBeDefined();
        expect(workspace2.hostWindowBounds[host.id]).toBeDefined();
        expect(workspace2.hostWindowMaximized).toBeDefined();
        expect(workspace2.hostWindowMaximized[host.id]).toBeDefined();
        expect(workspace2.hostWindowFullscreen).toBeDefined();
        expect(workspace2.hostWindowFullscreen[host.id]).toBeDefined();
      });

      // Verify removed host has no orphaned state
      expect(workspace2.hostLayouts[sat1.hostId]).toBeUndefined();
      expect(workspace2.hostWindowBounds[sat1.hostId]).toBeUndefined();
      expect(workspace2.hostWindowMaximized[sat1.hostId]).toBeUndefined();
      expect(workspace2.hostWindowFullscreen[sat1.hostId]).toBeUndefined();
    });
  });

  describe("Backward Compatibility", () => {
    it("should always have main host", () => {
      const hosts = service.listHosts();
      expect(hosts.find((h) => h.id === "main")).toBeDefined();
    });

    it("should initialize workspace with all required properties", () => {
      const workspace = service.getWorkspace();

      expect(workspace.hosts).toBeDefined();
      expect(Array.isArray(workspace.hosts)).toBe(true);
      expect(workspace.hostLayouts).toBeDefined();
      expect(typeof workspace.hostLayouts).toBe("object");
      expect(workspace.hostWindowBounds).toBeDefined();
      expect(workspace.hostWindowMaximized).toBeDefined();
      expect(workspace.hostWindowFullscreen).toBeDefined();
    });

    it("should handle default workspace structure", () => {
      const defaultWorkspace: WorkspaceState = {
        id: "default",
        windows: [],
        updatedAt: Date.now(),
      };

      const service2 = new WorkspaceService(persistence, defaultWorkspace);
      const workspace = service2.getWorkspace();

      // Should initialize missing properties
      expect(workspace.hosts).toBeDefined();
      expect(workspace.hostLayouts).toBeDefined();
      expect(workspace.hostWindowBounds).toBeDefined();
      expect(workspace.hostWindowMaximized).toBeDefined();
      expect(workspace.hostWindowFullscreen).toBeDefined();
    });
  });
});
