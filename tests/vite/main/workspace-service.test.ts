/**
 * Unit tests for WorkspaceService.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceState } from "../../../src/common/workspace-types";
import { WorkspacePersistence } from "../../../src/main/workspace-persistence";
import { WorkspaceService } from "../../../src/main/workspace-service";

describe("WorkspaceService", () => {
  let mockPersistence: WorkspacePersistence;
  let mockSettings: {
    getSync: (key: string) => unknown;
    setSync: (key: string, value: unknown) => void;
    deleteSync?: (key: string) => void;
  };
  let service: WorkspaceService;

  beforeEach(() => {
    // Create a mock settings object
    mockSettings = {
      getSync: vi.fn().mockReturnValue(undefined),
      setSync: vi.fn(),
      deleteSync: vi.fn(),
    };

    // Create persistence with mock settings
    mockPersistence = new WorkspacePersistence(mockSettings);

    // Create service with empty workspace
    service = new WorkspaceService(mockPersistence);
  });

  describe("getWorkspace", () => {
    it("should return current workspace state", () => {
      const workspace = service.getWorkspace();
      expect(workspace).toBeDefined();
      expect(workspace.id).toBe("default");
      expect(workspace.windows).toEqual([]);
      expect(workspace.updatedAt).toBeGreaterThan(0);
    });
  });

  describe("getWindow", () => {
    it("should return undefined for non-existent window", () => {
      const window = service.getWindow("nonexistent");
      expect(window).toBeUndefined();
    });

    it("should return window after creation", () => {
      service.createWindow({
        title: "Test Window",
        body: "<p>Test</p>",
        type: "ToolWindow",
      });

      const windows = service.getWorkspace().windows;
      expect(windows.length).toBe(1);
      const window = service.getWindow(windows[0].id);
      expect(window).toBeDefined();
      expect(window?.title).toBe("Test Window");
    });
  });

  describe("createWindow", () => {
    it("should create a window with default values", () => {
      const workspace = service.createWindow({
        title: "Test Window",
        body: "<p>Test</p>",
        type: "ToolWindow",
      });

      expect(workspace.windows.length).toBe(1);
      const window = workspace.windows[0];
      expect(window.title).toBe("Test Window");
      expect(window.type).toBe("ToolWindow");
      expect(window.group).toBe("toolwindows");
      expect(window.displayMode).toBe("docked");
      expect(window.isVisible).toBe(true);
    });

    it("should create a window with explicit ID", () => {
      const workspace = service.createWindow({
        id: "custom-id",
        title: "Test",
        body: "<p>Test</p>",
        type: "ToolWindow",
      });

      expect(workspace.windows[0].id).toBe("custom-id");
    });

    it("should replace existing window with same ID", () => {
      service.createWindow({
        id: "window-1",
        title: "Window 1",
        body: "<p>1</p>",
        type: "ToolWindow",
      });

      service.createWindow({
        id: "window-1",
        title: "Updated Window 1",
        body: "<p>Updated</p>",
        type: "ToolWindow",
      });

      const workspace = service.getWorkspace();
      expect(workspace.windows.length).toBe(1);
      expect(workspace.windows[0].title).toBe("Updated Window 1");
    });

    it("should persist workspace after creation", () => {
      service.createWindow({
        title: "Test",
        body: "<p>Test</p>",
        type: "ToolWindow",
      });

      expect(mockSettings.setSync).toHaveBeenCalledWith(
        "gdb.workspace.state",
        expect.objectContaining({
          windows: expect.arrayContaining([
            expect.objectContaining({
              title: "Test",
            }),
          ]),
        }),
      );
    });
  });

  describe("moveWindow", () => {
    beforeEach(() => {
      service.createWindow({
        id: "window-1",
        title: "Test",
        body: "<p>Test</p>",
        type: "ToolWindow",
        group: "toolwindows",
      });
    });

    it("should move window to new group", () => {
      const workspace = service.moveWindow({
        windowId: "window-1",
        group: "documents",
      });

      expect(workspace.windows[0].group).toBe("documents");
      expect(workspace.windows[0].isVisible).toBe(true);
    });

    it("should remember previous group", () => {
      service.moveWindow({
        windowId: "window-1",
        group: "documents",
      });

      const window = service.getWindow("window-1");
      expect(window?.lastKnownGroup).toBe("toolwindows");
    });

    it("should do nothing for non-existent window", () => {
      const workspace = service.moveWindow({
        windowId: "nonexistent",
        group: "documents",
      });

      // Should return unchanged workspace
      expect(workspace.windows.length).toBe(1);
    });
  });

  describe("setWindowVisibility", () => {
    beforeEach(() => {
      service.createWindow({
        id: "window-1",
        title: "Test",
        body: "<p>Test</p>",
        type: "ToolWindow",
        group: "toolwindows",
      });
    });

    it("should hide window", () => {
      const workspace = service.setWindowVisibility({
        windowId: "window-1",
        isVisible: false,
      });

      expect(workspace.windows[0].isVisible).toBe(false);
      expect(workspace.windows[0].lastKnownGroup).toBe("toolwindows");
    });

    it("should show window with remembered group", () => {
      // First hide
      service.setWindowVisibility({
        windowId: "window-1",
        isVisible: false,
      });

      // Then show
      const workspace = service.setWindowVisibility({
        windowId: "window-1",
        isVisible: true,
      });

      expect(workspace.windows[0].isVisible).toBe(true);
      expect(workspace.windows[0].group).toBe("toolwindows");
    });

    it("should show window with explicit group", () => {
      // First hide
      service.setWindowVisibility({
        windowId: "window-1",
        isVisible: false,
      });

      // Then show with different group
      const workspace = service.setWindowVisibility({
        windowId: "window-1",
        isVisible: true,
        group: "documents",
      });

      expect(workspace.windows[0].isVisible).toBe(true);
      expect(workspace.windows[0].group).toBe("documents");
    });

    it("should do nothing for non-existent window", () => {
      const workspace = service.setWindowVisibility({
        windowId: "nonexistent",
        isVisible: false,
      });

      expect(workspace.windows.length).toBe(1);
    });
  });

  describe("saveHostLayout", () => {
    it("should save layout", () => {
      const layout = { test: "data" };
      const result = service.saveHostLayout({
        hostId: "main",
        layout,
      });

      expect(result.result).toBe(true);
      expect(mockSettings.setSync).toHaveBeenCalledWith("gdb.gui.dockLayout", layout);
    });

    it("should clear layout when null", () => {
      const result = service.saveHostLayout({
        hostId: "main",
        layout: null,
      });

      expect(result.result).toBe(true);
      expect(mockSettings.deleteSync).toHaveBeenCalledWith("gdb.gui.dockLayout");
    });
  });

  describe("loadHostLayout", () => {
    it("should return undefined when no layout saved", () => {
      const layout = service.loadHostLayout("main");
      expect(layout).toBeUndefined();
    });

    it("should return serialized layout when saved", () => {
      const mockLayout = { test: "data" };
      mockSettings.getSync = vi.fn().mockReturnValue(mockLayout);

      mockPersistence = new WorkspacePersistence(mockSettings);
      service = new WorkspaceService(mockPersistence);

      const layout = service.loadHostLayout("main");
      expect(layout).toBe(JSON.stringify(mockLayout));
    });
  });

  describe("workspace state updates", () => {
    it("should increment updatedAt timestamp", () => {
      const workspace1 = service.getWorkspace();
      const time1 = workspace1.updatedAt;

      // Small delay
      const delay = new Promise((resolve) => setTimeout(resolve, 10));

      return delay.then(() => {
        service.createWindow({
          title: "Test",
          body: "<p>Test</p>",
          type: "ToolWindow",
        });

        const workspace2 = service.getWorkspace();
        expect(workspace2.updatedAt).toBeGreaterThan(time1);
      });
    });
  });

  describe("persistence integration", () => {
    it("should load persisted workspace on initialization", () => {
      const persistedWorkspace: WorkspaceState = {
        id: "persisted",
        windows: [
          {
            id: "window-1",
            title: "Persisted Window",
            body: "<p>Persisted</p>",
            type: "ToolWindow",
            group: "toolwindows",
            isVisible: true,
            displayMode: "docked",
          },
        ],
        updatedAt: Date.now(),
      };

      mockSettings.getSync = vi.fn().mockImplementation((key) => {
        if (key === "gdb.workspace.state") {
          return persistedWorkspace;
        }
        return undefined;
      });

      const newPersistence = new WorkspacePersistence(mockSettings);
      const newService = new WorkspaceService(newPersistence);

      const workspace = newService.getWorkspace();
      expect(workspace.id).toBe("persisted");
      expect(workspace.windows.length).toBe(1);
      expect(workspace.windows[0].title).toBe("Persisted Window");
    });
  });
});
