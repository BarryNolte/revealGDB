/**
 * WorkspaceService Unit Tests
 */

import { beforeEach, describe, expect, it } from "vitest";
import { WorkspaceService } from "../../src/main/workspace-service";

describe("WorkspaceService", () => {
  let service: WorkspaceService;

  beforeEach(() => {
    service = new WorkspaceService();
  });

  describe("initialization", () => {
    it("should create a default workspace with main window and default groups", () => {
      const workspace = service.getWorkspace();
      expect(workspace.version).toBe(1);
      expect(workspace.windows).toHaveLength(1);
      expect(workspace.windows[0].type).toBe("main");
      expect(workspace.groups).toHaveLength(2);
      expect(workspace.groups[0].name).toBe("documents");
      expect(workspace.groups[1].name).toBe("toolwindows");
    });

    it("should restore from saved workspace state", () => {
      const workspace1 = service.getWorkspace();
      const service2 = new WorkspaceService(workspace1);
      const workspace2 = service2.getWorkspace();
      expect(workspace2.version).toBe(workspace1.version);
      expect(workspace2.windows).toHaveLength(workspace1.windows.length);
    });
  });

  describe("addWindow", () => {
    it("should add a SourceFileWindow to documents group by default", () => {
      const result = service.addWindow("SourceFileWindow", "test.cpp");
      expect(result.windows).toBeDefined();
      const group = result.groups.find((g) => g.name === "documents");
      expect(group).toBeDefined();
      expect(group!.windows).toHaveLength(1);
      expect(group!.windows[0].title).toBe("test.cpp");
    });

    it("should add a ToolWindow to toolwindows group by default", () => {
      const result = service.addWindow("ToolWindow", "Breakpoints");
      const group = result.groups.find((g) => g.name === "toolwindows");
      expect(group).toBeDefined();
      expect(group!.windows).toHaveLength(1);
      expect(group!.windows[0].title).toBe("Breakpoints");
    });

    it("should add a window to a custom group", () => {
      const result = service.addWindow("ToolWindow", "Custom Panel", "custom-group");
      const group = result.groups.find((g) => g.name === "custom-group");
      expect(group).toBeDefined();
      expect(group!.windows).toHaveLength(1);
    });

    it("should create a group if it does not exist", () => {
      service.addWindow("ToolWindow", "Panel", "new-group");
      const workspace = service.getWorkspace();
      const newGroup = workspace.groups.find((g) => g.name === "new-group");
      expect(newGroup).toBeDefined();
    });

    it("should increment version on add", () => {
      const v1 = service.getWorkspace().version;
      service.addWindow("SourceFileWindow", "file.cpp");
      const v2 = service.getWorkspace().version;
      expect(v2).toBe(v1 + 1);
    });
  });

  describe("removeWindow", () => {
    it("should remove a window from its group", () => {
      const add1 = service.addWindow("SourceFileWindow", "file1.cpp");
      const windowId = add1.groups[0].windows[0].id;
      const result = service.removeWindow(windowId);
      const group = result.groups.find((g) => g.name === "documents");
      expect(group!.windows).toHaveLength(0);
    });

    it("should increment version on remove", () => {
      const add1 = service.addWindow("SourceFileWindow", "file1.cpp");
      const windowId = add1.groups[0].windows[0].id;
      const v1 = service.getWorkspace().version;
      service.removeWindow(windowId);
      const v2 = service.getWorkspace().version;
      expect(v2).toBe(v1 + 1);
    });
  });

  describe("showWindow", () => {
    it("should set isVisible to true", () => {
      const add1 = service.addWindow("SourceFileWindow", "file.cpp");
      const windowId = add1.groups[0].windows[0].id;
      service.hideWindow(windowId);
      const result = service.showWindow(windowId);
      const window = service.getWindow(windowId);
      expect(window!.isVisible).toBe(true);
    });
  });

  describe("hideWindow", () => {
    it("should set isVisible to false", () => {
      const add1 = service.addWindow("SourceFileWindow", "file.cpp");
      const windowId = add1.groups[0].windows[0].id;
      const result = service.hideWindow(windowId);
      const window = service.getWindow(windowId);
      expect(window!.isVisible).toBe(false);
    });
  });

  describe("moveWindow", () => {
    it("should move window to a different group", () => {
      service.addWindow("SourceFileWindow", "file.cpp");
      service.addWindow("ToolWindow", "Panel", "custom");
      const workspace = service.getWorkspace();
      const windowId = workspace.groups[0].windows[0].id;
      const result = service.moveWindow(windowId, "custom");
      const oldGroup = result.groups.find((g) => g.name === "documents");
      const newGroup = result.groups.find((g) => g.name === "custom");
      expect(oldGroup!.windows).toHaveLength(0);
      expect(newGroup!.windows).toHaveLength(2);
      expect(newGroup!.windows.some((w) => w.id === windowId)).toBe(true);
    });

    it("should throw error if group does not exist", () => {
      const add1 = service.addWindow("SourceFileWindow", "file.cpp");
      const windowId = add1.groups[0].windows[0].id;
      expect(() => service.moveWindow(windowId, "nonexistent")).toThrow();
    });

    it("should throw error if window does not exist", () => {
      expect(() => service.moveWindow("nonexistent-id", "documents")).toThrow();
    });
  });

  describe("setActiveWindow", () => {
    it("should set a window as active", () => {
      const add1 = service.addWindow("SourceFileWindow", "file1.cpp");
      const add2 = service.addWindow("SourceFileWindow", "file2.cpp");
      const window1Id = add1.groups[0].windows[0].id;
      const window2Id = add2.groups[0].windows[1].id;
      service.setActiveWindow(window2Id);
      const workspace = service.getWorkspace();
      expect(service.getWindow(window1Id)!.isActive).toBe(false);
      expect(service.getWindow(window2Id)!.isActive).toBe(true);
    });
  });

  describe("getWindowsByGroup", () => {
    it("should return all windows in a group", () => {
      service.addWindow("SourceFileWindow", "file1.cpp");
      service.addWindow("SourceFileWindow", "file2.cpp");
      service.addWindow("ToolWindow", "Panel");
      const docWindows = service.getWindowsByGroup("documents");
      expect(docWindows).toHaveLength(2);
      const toolWindows = service.getWindowsByGroup("toolwindows");
      expect(toolWindows).toHaveLength(1);
    });

    it("should return empty array for nonexistent group", () => {
      const windows = service.getWindowsByGroup("nonexistent");
      expect(windows).toHaveLength(0);
    });
  });

  describe("getWindow", () => {
    it("should return a window by ID", () => {
      const add1 = service.addWindow("SourceFileWindow", "file.cpp");
      const windowId = add1.groups[0].windows[0].id;
      const window = service.getWindow(windowId);
      expect(window).toBeDefined();
      expect(window!.title).toBe("file.cpp");
    });

    it("should return undefined for nonexistent window", () => {
      const window = service.getWindow("nonexistent-id");
      expect(window).toBeUndefined();
    });
  });

  describe("updateWindowState", () => {
    it("should update opaque window state", () => {
      const add1 = service.addWindow("SourceFileWindow", "file.cpp");
      const windowId = add1.groups[0].windows[0].id;
      const state = { customKey: "customValue" };
      service.updateWindowState(windowId, state);
      const window = service.getWindow(windowId);
      expect(window!.windowState).toEqual(state);
    });

    it("should throw error for nonexistent window", () => {
      expect(() => service.updateWindowState("nonexistent-id", {})).toThrow();
    });
  });

  describe("event emission", () => {
    it("should emit workspaceUpdated event on mutation", async () => {
      return new Promise<void>((resolve) => {
        service.once("workspaceUpdated", (workspace) => {
          expect(workspace.version).toBeGreaterThan(1);
          resolve();
        });
        service.addWindow("SourceFileWindow", "file.cpp");
      });
    });
  });

  describe("splitPane (Phase 3)", () => {
    it("should split a pane into two panes horizontally", () => {
      const add1 = service.addWindow("SourceFileWindow", "file.cpp");
      const windowId = add1.groups[0].windows[0].id;
      // splitPane should find or create layout entry for the window
      const result = service.splitPane(windowId, "horizontal");
      expect(result.version).toBeGreaterThan(add1.version);
      // Verify the window still exists
      expect(service.getWindow(windowId)).toBeDefined();
    });

    it("should split a pane vertically", () => {
      const add1 = service.addWindow("SourceFileWindow", "file.cpp");
      const windowId = add1.groups[0].windows[0].id;
      const result = service.splitPane(windowId, "vertical");
      expect(result.version).toBeGreaterThan(add1.version);
    });

    it("should throw error for nonexistent window", () => {
      expect(() => service.splitPane("nonexistent-id", "horizontal")).toThrow();
    });

    it("should increment version on split", () => {
      const add1 = service.addWindow("SourceFileWindow", "file.cpp");
      const windowId = add1.groups[0].windows[0].id;
      const v1 = service.getWorkspace().version;
      service.splitPane(windowId, "horizontal");
      const v2 = service.getWorkspace().version;
      expect(v2).toBe(v1 + 1);
    });
  });

  describe("resizePane (Phase 3)", () => {
    it("should accept valid pane sizes", () => {
      const add1 = service.addWindow("SourceFileWindow", "file.cpp");
      const workspace = service.getWorkspace();
      const mainWindow = workspace.windows[0];
      const paneId = (mainWindow.layout.root as any).id;

      // resizePane should work with valid sizes
      const result = service.resizePane(paneId, 0.3);
      expect(result.version).toBeGreaterThan(workspace.version);
    });

    it("should throw error for invalid size (>= 1.0)", () => {
      const add1 = service.addWindow("SourceFileWindow", "file.cpp");
      const workspace = service.getWorkspace();
      const mainWindow = workspace.windows[0];
      const paneId = (mainWindow.layout.root as any).id;

      expect(() => service.resizePane(paneId, 1.5)).toThrow();
    });

    it("should throw error for invalid size (<= 0)", () => {
      const add1 = service.addWindow("SourceFileWindow", "file.cpp");
      const workspace = service.getWorkspace();
      const mainWindow = workspace.windows[0];
      const paneId = (mainWindow.layout.root as any).id;

      expect(() => service.resizePane(paneId, 0)).toThrow();
    });

    it("should throw error for nonexistent pane", () => {
      expect(() => service.resizePane("nonexistent-pane", 0.5)).toThrow();
    });
  });

  describe("moveWindowToPane and reorderPaneWindows (Phase 3)", () => {
    it("moves a window into a target pane without dropping existing tabs", () => {
      const add1 = service.addWindow("SourceFileWindow", "file.cpp");
      const add2 = service.addWindow("ToolWindow", "locals");
      const sourceWindowId = add1.groups[0].windows[0].id;
      const targetWindowId = add2.groups[1].windows[0].id;

      const splitWorkspace = service.splitPane(sourceWindowId, "horizontal");
      const splitRoot = splitWorkspace.windows[0].layout.root as any;
      const targetPaneId = splitRoot.children[1].id;
      service.moveWindowToPane(targetWindowId, targetPaneId, splitWorkspace.windows[0]);

      const updatedRoot = service.getWorkspace().windows[0].layout.root as any;
      expect(updatedRoot.children[1].windowIds).toContain(targetWindowId);
      expect(updatedRoot.children[0].windowIds).toContain(sourceWindowId);
    });

    it("reorders tabs inside a pane", () => {
      const add1 = service.addWindow("SourceFileWindow", "file.cpp");
      const add2 = service.addWindow("ToolWindow", "locals");
      const paneId = (service.getWorkspace().windows[0].layout.root as any).id;

      const firstWindowId = add1.groups[0].windows[0].id;
      const secondWindowId = add2.groups[1].windows[0].id;
      service.reorderPaneWindows(paneId, [secondWindowId, firstWindowId]);

      const rootPane = service.getWorkspace().windows[0].layout.root as any;
      expect(rootPane.windowIds).toEqual([secondWindowId, firstWindowId]);
    });
  });

  describe("multi-host pane ownership", () => {
    it("creates an explicit satellite workspace window for each host", () => {
      const hostId = "satellite-test";
      const result = service.createHost(hostId, "Test Window");

      expect(result.hosts?.some((host) => host.id === hostId)).toBe(true);
      expect(
        result.windows.some(
          (workspaceWindow) =>
            workspaceWindow.type === "satellite" && workspaceWindow.hostId === hostId,
        ),
      ).toBe(true);
    });

    it("moves a pane into the target host workspace window and updates dockable ownership", () => {
      const add1 = service.addWindow("SourceFileWindow", "file.cpp");
      const add2 = service.addWindow("ToolWindow", "locals");
      const hostId = "satellite-test";
      const mainPaneId = (
        service.getWorkspace().windows.find((window) => window.type === "main")!.layout.root as any
      ).id;

      service.createHost(hostId, "Target Window");
      const result = service.movePaneToHost(mainPaneId, hostId);

      const movedWindowIds = [add1.groups[0].windows[0].id, add2.groups[1].windows[0].id];
      const mainWindow = result.windows.find((window) => window.type === "main")!;
      const satelliteWindow = result.windows.find(
        (window) => window.type === "satellite" && window.hostId === hostId,
      )!;

      expect((mainWindow.layout.root as any).windowIds).toEqual([]);
      expect((satelliteWindow.layout.root as any).windowIds).toEqual(movedWindowIds);
      movedWindowIds.forEach((windowId) => {
        expect(service.getWindow(windowId)?.hostId).toBe(hostId);
      });
    });

    it("moves a deleted satellite host's panes back into the main workspace window", () => {
      const add1 = service.addWindow("SourceFileWindow", "file.cpp");
      const add2 = service.addWindow("ToolWindow", "locals");
      const hostId = "satellite-test";
      const mainPaneId = (
        service.getWorkspace().windows.find((window) => window.type === "main")!.layout.root as any
      ).id;
      const movedWindowIds = [add1.groups[0].windows[0].id, add2.groups[1].windows[0].id];

      service.createHost(hostId, "Target Window");
      service.movePaneToHost(mainPaneId, hostId);
      const result = service.deleteHost(hostId);

      const mainWindow = result.windows.find((window) => window.type === "main")!;
      expect(result.hosts?.some((host) => host.id === hostId)).toBe(false);
      expect(
        result.windows.some(
          (workspaceWindow) =>
            workspaceWindow.type === "satellite" && workspaceWindow.hostId === hostId,
        ),
      ).toBe(false);
      expect((mainWindow.layout.root as any).windowIds).toEqual(movedWindowIds);
      expect(
        result.groups.flatMap((group) => group.windows).every((window) => window.hostId === "main"),
      ).toBe(true);
    });
  });

  describe("floatWindow (Phase 4)", () => {
    it("should create a floating window", () => {
      const add1 = service.addWindow("SourceFileWindow", "file.cpp");
      const windowId = add1.groups[0].windows[0].id;
      const result = service.floatWindow(windowId);
      expect(result.windows.length).toBeGreaterThan(1);
      const floatingWindow = result.windows.find((w) => w.type === "floating");
      expect(floatingWindow).toBeDefined();
    });

    it("should throw error for nonexistent window", () => {
      expect(() => service.floatWindow("nonexistent-id")).toThrow();
    });

    it("should increment version on float", () => {
      const add1 = service.addWindow("SourceFileWindow", "file.cpp");
      const windowId = add1.groups[0].windows[0].id;
      const v1 = service.getWorkspace().version;
      service.floatWindow(windowId);
      const v2 = service.getWorkspace().version;
      expect(v2).toBe(v1 + 1);
    });
  });

  describe("dockWindow (Phase 4)", () => {
    it("should dock a floating window back to main", () => {
      const add1 = service.addWindow("SourceFileWindow", "file.cpp");
      const windowId = add1.groups[0].windows[0].id;
      const float = service.floatWindow(windowId);
      const floatingId = float.windows.find((w) => w.type === "floating")!.id;

      const result = service.dockWindow(floatingId, float.windows[0].layout.root.id);
      expect(result.windows.length).toBe(1); // Back to just main window
    });

    it("should throw error for nonexistent floating window", () => {
      expect(() => service.dockWindow("nonexistent-id", "some-pane")).toThrow();
    });
  });
});
