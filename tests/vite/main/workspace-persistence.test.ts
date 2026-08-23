/**
 * Unit tests for WorkspacePersistence.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DockHostLayout, WorkspaceState } from "../../../src/common/workspace-types";
import { WorkspacePersistence } from "../../../src/main/workspace-persistence";

describe("WorkspacePersistence", () => {
  let mockSettings: {
    getSync: (key: string) => unknown;
    setSync: (key: string, value: unknown) => void;
    deleteSync?: (key: string) => void;
    unsetSync?: (key: string) => void;
  };
  let persistence: WorkspacePersistence;

  beforeEach(() => {
    mockSettings = {
      getSync: vi.fn().mockReturnValue(undefined),
      setSync: vi.fn(),
      deleteSync: vi.fn(),
    };

    persistence = new WorkspacePersistence(mockSettings);
  });

  describe("loadWorkspace / saveWorkspace", () => {
    it("should load undefined when no workspace saved", () => {
      const workspace = persistence.loadWorkspace();
      expect(workspace).toBeUndefined();
    });

    it("should save workspace state", () => {
      const workspace: WorkspaceState = {
        id: "test",
        windows: [],
        updatedAt: Date.now(),
      };

      persistence.saveWorkspace(workspace);

      expect(mockSettings.setSync).toHaveBeenCalledWith("gdb.workspace.state", workspace);
    });

    it("should load persisted workspace", () => {
      const workspace: WorkspaceState = {
        id: "persisted",
        windows: [],
        updatedAt: Date.now(),
      };

      mockSettings.getSync = vi.fn().mockImplementation((key) => {
        if (key === "gdb.workspace.state") {
          return workspace;
        }
        return undefined;
      });

      const loaded = persistence.loadWorkspace();
      expect(loaded).toEqual(workspace);
    });
  });

  describe("loadHostLayout / saveHostLayout", () => {
    it("should load undefined when no layout for main host", () => {
      const layout = persistence.loadHostLayout("main");
      expect(layout).toBeUndefined();
    });

    it("should save layout for main host", () => {
      const layout: DockHostLayout = { test: "data" };
      persistence.saveHostLayout("main", layout);

      expect(mockSettings.setSync).toHaveBeenCalledWith("gdb.gui.dockLayout", layout);
    });

    it("should clear layout for main host when null", () => {
      persistence.saveHostLayout("main", null);

      expect(mockSettings.deleteSync).toHaveBeenCalledWith("gdb.gui.dockLayout");
    });

    it("should load persisted layout for main host", () => {
      const layout: DockHostLayout = { test: "data" };
      mockSettings.getSync = vi.fn().mockImplementation((key) => {
        if (key === "gdb.gui.dockLayout") {
          return layout;
        }
        return undefined;
      });

      const loaded = persistence.loadHostLayout("main");
      expect(loaded).toEqual(layout);
    });

    it("should save layout for other hosts", () => {
      const layout: DockHostLayout = { host: "secondary" };
      persistence.saveHostLayout("secondary", layout);

      expect(mockSettings.setSync).toHaveBeenCalledWith(
        "gdb.workspace.hostLayouts.secondary",
        layout,
      );
    });

    it("should load layout for other hosts", () => {
      const layout: DockHostLayout = { host: "secondary" };
      mockSettings.getSync = vi.fn().mockImplementation((key) => {
        if (key === "gdb.workspace.hostLayouts.secondary") {
          return layout;
        }
        return undefined;
      });

      const loaded = persistence.loadHostLayout("secondary");
      expect(loaded).toEqual(layout);
    });

    it("should clear layout for other hosts when null", () => {
      persistence.saveHostLayout("secondary", null);

      expect(mockSettings.deleteSync).toHaveBeenCalledWith("gdb.workspace.hostLayouts.secondary");
    });
  });

  describe("loadWindowBounds / saveWindowBounds", () => {
    it("should load undefined when no bounds saved", () => {
      const bounds = persistence.loadWindowBounds("main");
      expect(bounds).toBeUndefined();
    });

    it("should save window bounds", () => {
      const bounds: [number, number, number, number] = [100, 200, 800, 600];
      persistence.saveWindowBounds("main", bounds);

      expect(mockSettings.setSync).toHaveBeenCalledWith("gdb.workspace.windowBounds.main", bounds);
    });

    it("should load persisted window bounds", () => {
      const bounds: [number, number, number, number] = [100, 200, 800, 600];
      mockSettings.getSync = vi.fn().mockImplementation((key) => {
        if (key === "gdb.workspace.windowBounds.main") {
          return bounds;
        }
        return undefined;
      });

      const loaded = persistence.loadWindowBounds("main");
      expect(loaded).toEqual(bounds);
    });
  });

  describe("loadWindowMaximized / saveWindowMaximized", () => {
    it("should default to false when no state saved", () => {
      const maximized = persistence.loadWindowMaximized("main");
      expect(maximized).toBe(false);
    });

    it("should save maximized state", () => {
      persistence.saveWindowMaximized("main", true);

      expect(mockSettings.setSync).toHaveBeenCalledWith("gdb.workspace.windowMaximized.main", true);
    });

    it("should load persisted maximized state", () => {
      mockSettings.getSync = vi.fn().mockImplementation((key) => {
        if (key === "gdb.workspace.windowMaximized.main") {
          return true;
        }
        return undefined;
      });

      const maximized = persistence.loadWindowMaximized("main");
      expect(maximized).toBe(true);
    });
  });

  describe("loadWindowFullScreen / saveWindowFullScreen", () => {
    it("should default to false when no state saved", () => {
      const fullScreen = persistence.loadWindowFullScreen("main");
      expect(fullScreen).toBe(false);
    });

    it("should save fullscreen state", () => {
      persistence.saveWindowFullScreen("main", true);

      expect(mockSettings.setSync).toHaveBeenCalledWith(
        "gdb.workspace.windowFullScreen.main",
        true,
      );
    });

    it("should load persisted fullscreen state", () => {
      mockSettings.getSync = vi.fn().mockImplementation((key) => {
        if (key === "gdb.workspace.windowFullScreen.main") {
          return true;
        }
        return undefined;
      });

      const fullScreen = persistence.loadWindowFullScreen("main");
      expect(fullScreen).toBe(true);
    });
  });

  describe("multi-host scenarios", () => {
    it("should support multiple hosts independently", () => {
      const layout1 = { host: "one" };
      const layout2 = { host: "two" };

      persistence.saveHostLayout("host1", layout1);
      persistence.saveHostLayout("host2", layout2);

      expect(mockSettings.setSync).toHaveBeenNthCalledWith(
        1,
        "gdb.workspace.hostLayouts.host1",
        layout1,
      );
      expect(mockSettings.setSync).toHaveBeenNthCalledWith(
        2,
        "gdb.workspace.hostLayouts.host2",
        layout2,
      );
    });

    it("should isolate bounds/state per host", () => {
      persistence.saveWindowBounds("host1", [0, 0, 1024, 768]);
      persistence.saveWindowBounds("host2", [100, 100, 800, 600]);

      expect(mockSettings.setSync).toHaveBeenCalledWith(
        "gdb.workspace.windowBounds.host1",
        [0, 0, 1024, 768],
      );
      expect(mockSettings.setSync).toHaveBeenCalledWith(
        "gdb.workspace.windowBounds.host2",
        [100, 100, 800, 600],
      );
    });
  });

  describe("fallback behavior", () => {
    it("should use unsetSync if deleteSync not available", () => {
      const settings = {
        getSync: vi.fn().mockReturnValue(undefined),
        setSync: vi.fn(),
        unsetSync: vi.fn(),
      };

      const fallbackPersistence = new WorkspacePersistence(settings);
      fallbackPersistence.saveHostLayout("main", null);

      expect(settings.unsetSync).toHaveBeenCalledWith("gdb.gui.dockLayout");
    });
  });
});
