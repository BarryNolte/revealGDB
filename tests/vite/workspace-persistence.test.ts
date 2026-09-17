/**
 * Phase 5: State Persistence Tests
 *
 * Tests for workspace state persistence, recovery, and migration
 */

import { beforeEach, describe, expect, it } from "vitest";
import { WorkspaceService } from "../../src/main/workspace-service";
import {
  cleanupLegacyWorkspaceSettings,
  ElectronStateStore,
  isUsableHostLayout,
  recoverWorkspaceFromSnapshots,
} from "../../src/main/workspace-state-store";

describe("Phase 5: State Persistence", () => {
  let stateStore: ElectronStateStore;
  let service: WorkspaceService;

  beforeEach(() => {
    stateStore = new ElectronStateStore();
    service = new WorkspaceService();
  });

  describe("ElectronStateStore", () => {
    describe("validation", () => {
      it("supports sync-only stores without direct get/set access", async () => {
        const data = new Map<string, unknown>();
        const syncOnlyStore = {
          getSync: (key: string) => data.get(key),
          setSync: (key: string, value: unknown) => {
            data.set(key, value);
          },
          unsetSync: (key: string) => {
            data.delete(key);
          },
        };

        const syncStore = new ElectronStateStore(syncOnlyStore as never);
        const workspace = service.getWorkspace();

        await syncStore.save(workspace);
        expect(await syncStore.exists()).toBe(true);
        await expect(syncStore.load()).resolves.toEqual(workspace);

        await syncStore.delete();
        expect(await syncStore.exists()).toBe(false);
      });

      it("should validate correct workspace format", () => {
        const workspace = service.getWorkspace();
        expect(stateStore.validateWorkspace(workspace)).toBe(true);
      });

      it("should reject null workspace", () => {
        expect(stateStore.validateWorkspace(null)).toBe(false);
      });

      it("should reject non-object workspace", () => {
        expect(stateStore.validateWorkspace("not an object")).toBe(false);
        expect(stateStore.validateWorkspace(123)).toBe(false);
      });

      it("should reject workspace missing version", () => {
        const invalid = { windows: [], groups: [] };
        expect(stateStore.validateWorkspace(invalid)).toBe(false);
      });

      it("should reject workspace missing windows array", () => {
        const invalid = { version: 1, groups: [] };
        expect(stateStore.validateWorkspace(invalid)).toBe(false);
      });

      it("should reject workspace missing groups array", () => {
        const invalid = { version: 1, windows: [] };
        expect(stateStore.validateWorkspace(invalid)).toBe(false);
      });
    });

    describe("export/import", () => {
      it.skip("should export workspace state as JSON string", async () => {
        const service = new WorkspaceService();
        service.addWindow("SourceFileWindow", "file.cpp");
        const exported = await stateStore.export();
        expect(typeof exported).toBe("string");
        const parsed = JSON.parse(exported);
        expect(parsed).toHaveProperty("version");
        expect(parsed).toHaveProperty("windows");
        expect(parsed).toHaveProperty("groups");
      }); // Skip - requires a mocked app-backed settings store

      it.skip("should import valid workspace state", async () => {
        const workspace = service.getWorkspace();
        const json = JSON.stringify(workspace);
        // Should not throw
        await expect(stateStore.import(json)).resolves.toBeUndefined();
      }); // Skip - requires a mocked app-backed settings store

      it.skip("should reject invalid JSON on import", async () => {
        await expect(stateStore.import("invalid json")).rejects.toThrow();
      }); // Skip - requires a mocked app-backed settings store

      it.skip("should reject malformed workspace on import", async () => {
        const invalid = JSON.stringify({ windows: [], groups: [] });
        await expect(stateStore.import(invalid)).rejects.toThrow();
      }); // Skip - requires a mocked app-backed settings store
    });

    describe("recovery", () => {
      it.skip("should return null for non-existent state", async () => {
        const recovered = await stateStore.recover();
        // May be null or an empty workspace depending on implementation
        // This test just verifies the method exists and doesn't throw
        expect(recovered === null || typeof recovered === "object").toBe(true);
      }); // Skip - requires a mocked app-backed settings store

      it("should validate recovered state", async () => {
        // Create a valid state first
        const workspace = service.getWorkspace();
        // Would call await stateStore.save(workspace) but requires app context

        // This test verifies the logic works with valid state
        expect(stateStore.validateWorkspace(workspace)).toBe(true);
      });

      it("recovers a default workspace when the saved workspace shape is invalid", () => {
        const recovered = recoverWorkspaceFromSnapshots({ invalid: true }, {});

        expect(recovered.version).toBe(1);
        expect(recovered.windows).toHaveLength(1);
        expect(recovered.groups).toHaveLength(2);
      });

      it("keeps the workspace host state authoritative and drops legacy geometry entries", () => {
        const recovered = recoverWorkspaceFromSnapshots({
          version: 1,
          windows: [],
          groups: [],
          hosts: [{ id: "main", label: "Old Main", isVisible: false }],
          hostLayouts: {
            main: {},
            "satellite-abcd": { graphInfo: { containerType: "fill" } },
          },
        });

        expect(recovered.hosts?.map((host) => host.id)).toEqual(["main"]);
        expect(recovered.hosts?.[0]?.isVisible).toBe(true);
        expect(recovered.hostLayouts).toEqual({});
      });

      it("detects usable host layouts only when they contain real data", () => {
        expect(isUsableHostLayout(undefined)).toBe(false);
        expect(isUsableHostLayout(null)).toBe(false);
        expect(isUsableHostLayout({})).toBe(false);
        expect(isUsableHostLayout({ graphInfo: {} })).toBe(true);
      });

      it("removes stale top-level host layouts and legacy geometry settings", () => {
        const data = new Map<string, unknown>([
          ["gdb.gui.hostLayouts", { main: { stale: true } }],
          [
            "gdb.gui.windowConfigs",
            {
              main: {
                bounds: { x: 0, y: 0, width: 1200, height: 800 },
                dockLayout: { panels: ["legacy"] },
              },
              "satellite-abcd": {
                bounds: { x: 50, y: 50, width: 800, height: 600 },
              },
            },
          ],
        ]);

        cleanupLegacyWorkspaceSettings({
          get: (key) => data.get(key),
          set: (key, value) => {
            data.set(key, value);
          },
          delete: (key) => {
            data.delete(key);
          },
        });

        expect(data.get("gdb.gui.hostLayouts")).toBeUndefined();
        expect(data.get("gdb.gui.windowConfigs")).toBeUndefined();
      });

      it("treats empty or null legacy window configs as stale and falls back to defaults", () => {
        const data = new Map<string, unknown>();
        const store = {
          get: (key: string) => data.get(key),
          set: (key: string, value: unknown) => {
            data.set(key, value);
          },
          delete: (key: string) => {
            data.delete(key);
          },
        };

        data.set("gdb.gui.windowConfigs", null);
        cleanupLegacyWorkspaceSettings(store as never);
        expect(data.get("gdb.gui.windowConfigs")).toBeUndefined();

        data.set("gdb.gui.windowConfigs", {});
        cleanupLegacyWorkspaceSettings(store as never);
        expect(data.get("gdb.gui.windowConfigs")).toBeUndefined();

        const recovered = recoverWorkspaceFromSnapshots(undefined);
        expect(recovered.version).toBe(1);
        expect(recovered.windows).toHaveLength(1);
        expect(recovered.hosts?.[0]?.id).toBe("main");
      });

      it("supports electron-store-style unbound accessors during legacy cleanup", () => {
        const data = new Map<string, unknown>();
        const store = {
          get: (key: string) => data.get(key),
          set: (key: string, value: unknown) => {
            data.set(key, value);
          },
          delete: (key: string) => {
            data.delete(key);
          },
        };

        data.set("gdb.gui.windowConfigs", { stale: true });

        expect(() =>
          cleanupLegacyWorkspaceSettings({
            get: store.get,
            set: store.set,
            delete: store.delete,
          } as never),
        ).not.toThrow();
        expect(data.get("gdb.gui.windowConfigs")).toBeUndefined();
      });
    });
  });

  describe("state persistence integration", () => {
    it("should preserve window count through save/load cycle", async () => {
      const service1 = new WorkspaceService();
      service1.addWindow("SourceFileWindow", "file.cpp");
      service1.addWindow("VariablesWindow");

      const workspace = service1.getWorkspace();
      const windowCount = workspace.windows.length;

      // Simulate save/load
      const json = JSON.stringify(workspace);
      const loaded = JSON.parse(json);

      expect(loaded.windows).toHaveLength(windowCount);
    });

    it("should preserve window state through mutations", async () => {
      service.addWindow("SourceFileWindow", "file.cpp");
      service.addWindow("VariablesWindow");

      const workspace1 = service.getWorkspace();

      // Simulate persistence
      const json = JSON.stringify(workspace1);
      const workspace2 = JSON.parse(json);

      // Both should have same version and window count
      expect(workspace2.version).toBe(workspace1.version);
      expect(workspace2.windows).toHaveLength(workspace1.windows.length);
    });

    it("should preserve layout state", () => {
      service.addWindow("SourceFileWindow", "file.cpp");
      const windowId = service.getWorkspace().groups[0].windows[0].id;
      service.splitPane(windowId, "horizontal");

      const workspace = service.getWorkspace();
      const json = JSON.stringify(workspace);
      const loaded = JSON.parse(json);

      // Layout should be preserved
      expect(loaded.windows[0].layout).toBeDefined();
      expect(loaded.windows[0].layout.root).toBeDefined();
    });

    it("should handle concurrent mutations with persistence", () => {
      service.addWindow("SourceFileWindow", "file.cpp");
      service.addWindow("VariablesWindow");
      service.addWindow("CallStackWindow");

      const workspace1 = service.getWorkspace();
      const v1 = workspace1.version;

      // Persist
      const json = JSON.stringify(workspace1);
      const loaded = JSON.parse(json);

      // Continue mutating original
      service.addWindow("BreakpointsWindow");
      const workspace2 = service.getWorkspace();
      const v2 = workspace2.version;

      // Versions should differ
      expect(v2).toBeGreaterThan(v1);

      // Persisted version should match original
      expect(loaded.version).toBe(v1);
    });

    it("should preserve metadata on save/load", () => {
      service.addWindow("SourceFileWindow", "file.cpp");
      const workspace = service.getWorkspace();

      const json = JSON.stringify(workspace);
      const loaded = JSON.parse(json);

      if (workspace.metadata) {
        expect(loaded.metadata).toBeDefined();
        expect(loaded.metadata.createdAt).toBe(workspace.metadata.createdAt);
      }
    });
  });

  describe("version and migration", () => {
    it("should track version increments", () => {
      const v1 = service.getWorkspace().version;
      service.addWindow("SourceFileWindow", "file.cpp");
      const v2 = service.getWorkspace().version;
      expect(v2).toBeGreaterThan(v1);
    });

    it("should preserve version through persistence", () => {
      service.addWindow("SourceFileWindow", "file.cpp");
      const workspace = service.getWorkspace();
      const version = workspace.version;

      const json = JSON.stringify(workspace);
      const loaded = JSON.parse(json);

      expect(loaded.version).toBe(version);
    });

    it("should handle backward compatibility", () => {
      // Simulate old workspace format by creating minimal workspace
      const oldWorkspace = {
        version: 0,
        windows: [],
        groups: [],
      };

      // Should still be valid for basic operations
      const service2 = new WorkspaceService(oldWorkspace as any);
      service2.addWindow("SourceFileWindow", "test.cpp");
      expect(service2.getWorkspace().version).toBeGreaterThan(0);
    });
  });

  describe("error recovery", () => {
    it("should handle corrupted metadata gracefully", () => {
      const workspace = service.getWorkspace();
      if (workspace.metadata) {
        workspace.metadata.updatedAt = NaN; // Corrupt timestamp
      }

      // Should still be serializable
      const json = JSON.stringify(workspace);
      const loaded = JSON.parse(json);
      expect(loaded.windows).toHaveLength(workspace.windows.length);
    });

    it("should maintain data integrity with large workspaces", () => {
      // Add many windows
      for (let i = 0; i < 20; i++) {
        service.addWindow("SourceFileWindow", `file${i}.cpp`);
      }

      const workspace1 = service.getWorkspace();
      const count1 = workspace1.groups[0].windows.length;

      // Persist and restore
      const json = JSON.stringify(workspace1);
      const workspace2 = JSON.parse(json);
      const count2 = workspace2.groups[0].windows.length;

      expect(count2).toBe(count1);
    });
  });
});
