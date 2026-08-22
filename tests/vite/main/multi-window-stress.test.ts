/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from "vitest";
import {
  DockableWindowType,
  WindowDisplayMode,
  WindowGroup,
} from "../../../src/common/workspace-types";
import { MultiHostWindowManager } from "../../../src/main/window-manager";
import { WorkspaceService } from "../../../src/main/workspaceService";

type EventHandler = () => void;

type FakeBrowserWindow = {
  id: string;
  on: (eventName: string, handler: EventHandler) => void;
  once: (eventName: string, handler: EventHandler) => void;
  close: () => void;
  emitClosed: () => void;
  emitDidFinishLoad: () => void;
  show: () => void;
  hide: () => void;
  loadURL: (url: string) => void;
  isDestroyed: () => boolean;
  webContents: {
    once: (eventName: string, handler: EventHandler) => void;
    send: (channel: string, payload: unknown) => void;
  };
};

function createFakeBrowserWindow(hostId: string): FakeBrowserWindow {
  const listeners = new Map<string, EventHandler[]>();

  const windowObject: FakeBrowserWindow = {
    id: hostId,
    on: (eventName: string, handler: EventHandler) => {
      const handlers = listeners.get(eventName) ?? [];
      handlers.push(handler);
      listeners.set(eventName, handlers);
    },
    once: (eventName: string, handler: EventHandler) => {
      const handlers = listeners.get(eventName) ?? [];
      handlers.push(handler);
      listeners.set(eventName, handlers);
    },
    close: () => {
      const handlers = listeners.get("closed") ?? [];
      for (const handler of handlers) {
        handler();
      }
    },
    emitClosed: () => {
      const handlers = listeners.get("closed") ?? [];
      for (const handler of handlers) {
        handler();
      }
    },
    emitDidFinishLoad: () => {
      const handlers = listeners.get("did-finish-load") ?? [];
      for (const handler of handlers) {
        handler();
      }
    },
    show: vi.fn(),
    hide: vi.fn(),
    loadURL: vi.fn(),
    isDestroyed: () => false,
    webContents: {
      once: (eventName: string, handler: EventHandler) => {
        const handlers = listeners.get(eventName) ?? [];
        handlers.push(handler);
        listeners.set(eventName, handlers);
      },
      send: vi.fn(),
    },
  };

  return windowObject;
}

describe("multi-window stress lifecycle", () => {
  it("notifies the workspace when a secondary host window is closed", () => {
    const handler = vi.fn();
    const manager = new MultiHostWindowManager("/fake/preload.js", handler);
    const window = createFakeBrowserWindow("dock-1");

    manager.registerWindow("dock-1", window as never);
    window.emitClosed();

    expect(handler).toHaveBeenCalledWith("dock-1");
    expect(manager.getWindow("dock-1")).toBeUndefined();
  });

  it("preserves the closed host layout on the main host when a dock window closes", () => {
    let state = WorkspaceService.createEmptyWorkspace();
    state = WorkspaceService.createHost(state, "dock-1", "Dock Window 1");
    state = WorkspaceService.setHostLayout(state, "dock-1", {
      version: 1,
      hostId: "dock-1",
      panels: ["locals", "threads"],
    });

    const manager = new MultiHostWindowManager("/fake/preload.js", (hostId) => {
      state = WorkspaceService.deleteHost(state, hostId);
    });
    const window = createFakeBrowserWindow("dock-1");

    manager.registerWindow("dock-1", window as never);
    window.emitClosed();

    expect(state.hosts.some((host) => host.id === "dock-1")).toBe(false);
    expect(state.hostLayouts.main).toEqual({
      version: 1,
      hostId: "dock-1",
      panels: ["locals", "threads"],
    });
  });

  it("remembers the host assignment for windows moved onto a secondary dock host", () => {
    let state = WorkspaceService.createEmptyWorkspace();
    state = WorkspaceService.createHost(state, "dock-1", "Dock Window 1");

    const createdWindow = WorkspaceService.createWindow(state, {
      title: "Locals",
      body: "locals-body",
      type: DockableWindowType.ToolWindow,
      group: WindowGroup.ToolWindows,
      isVisible: true,
      displayMode: WindowDisplayMode.Docked,
    });

    state = createdWindow;
    const windowId = state.windows[state.windows.length - 1].id;
    state = WorkspaceService.moveWindowToHost(state, {
      windowId,
      targetHostId: "dock-1",
    });

    const movedWindow = state.windows.find((window) => window.id === windowId);
    expect(movedWindow?.windowState).toMatchObject({ hostId: "dock-1" });
    expect(state.hosts.find((host) => host.id === "dock-1")?.visibleWindows).toContain(windowId);
  });

  it("adds a newly created window to the owning host's visible window list", () => {
    let state = WorkspaceService.createEmptyWorkspace();
    state = WorkspaceService.createHost(state, "dock-1", "Dock Window 1");

    state = WorkspaceService.createWindow(state, {
      title: "Breakpoints",
      body: "breakpoints-body",
      type: DockableWindowType.ToolWindow,
      group: WindowGroup.ToolWindows,
      isVisible: true,
      displayMode: WindowDisplayMode.Docked,
      windowState: { hostId: "dock-1" },
    });

    const createdWindowId = state.windows[state.windows.length - 1].id;
    expect(state.hosts.find((host) => host.id === "dock-1")?.visibleWindows).toContain(
      createdWindowId,
    );
    expect(
      state.windows.find((window) => window.id === createdWindowId)?.windowState,
    ).toMatchObject({
      hostId: "dock-1",
    });
  });

  it("loads the host-aware renderer URL and pushes the active theme when a dock window finishes loading", () => {
    const manager = new MultiHostWindowManager("/fake/preload.js");
    const window = createFakeBrowserWindow("dock-1");
    const sendSpy = vi.spyOn(window.webContents, "send");

    manager.loadDockWindowUrl(window as never, "dock-1", "file:///tmp/index.html");

    expect(window.loadURL).toHaveBeenCalledWith("file:///tmp/index.html?dockHost=dock-1");

    window.emitDidFinishLoad();

    expect(sendSpy).toHaveBeenCalledWith("theme-changed", { shouldUseDarkColors: false });
  });

  it("moves a closing secondary host's panes onto the primary host layout even when the main layout already exists", () => {
    let state = WorkspaceService.createEmptyWorkspace();
    state = WorkspaceService.setHostLayout(state, "main", {
      version: 1,
      hostId: "main",
      panels: ["source"],
    });
    state = WorkspaceService.createHost(state, "dock-1", "Dock Window 1");
    state = WorkspaceService.setHostLayout(state, "dock-1", {
      version: 1,
      hostId: "dock-1",
      panels: ["locals", "threads"],
    });

    state = WorkspaceService.deleteHost(state, "dock-1");

    expect(state.hosts.some((host) => host.id === "dock-1")).toBe(false);
    expect(state.hostLayouts.main).toHaveProperty("hostId", "main");
    expect(state.hostLayouts.main).toHaveProperty("panels");
    const mainPanels = Array.isArray((state.hostLayouts.main as { panels?: unknown }).panels)
      ? ((state.hostLayouts.main as { panels?: unknown[] }).panels ?? [])
      : [];
    expect(mainPanels).toEqual(expect.arrayContaining(["source", "locals", "threads"]));
  });

  it("dedicated reproducer: moving a tool window into a secondary dock and closing it restores the tool to the main host", () => {
    let state = WorkspaceService.createEmptyWorkspace();
    state = WorkspaceService.createHost(state, "dock-1", "Dock Window 1");
    state = WorkspaceService.setHostLayout(state, "main", {
      version: 1,
      hostId: "main",
      panels: ["source"],
    });

    const createdWindow = WorkspaceService.createWindow(state, {
      title: "Locals",
      body: "locals-body",
      type: DockableWindowType.ToolWindow,
      group: WindowGroup.ToolWindows,
      isVisible: true,
      displayMode: WindowDisplayMode.Docked,
    });

    const windowId = createdWindow.windows[createdWindow.windows.length - 1].id;
    state = WorkspaceService.moveWindowToHost(createdWindow, {
      windowId,
      targetHostId: "dock-1",
    });

    state = WorkspaceService.setHostLayout(state, "dock-1", {
      version: 1,
      hostId: "dock-1",
      panels: ["locals"],
    });

    const manager = new MultiHostWindowManager("/fake/preload.js", (hostId) => {
      state = WorkspaceService.deleteHost(state, hostId);
    });
    const window = createFakeBrowserWindow("dock-1");
    manager.registerWindow("dock-1", window as never);

    window.emitClosed();

    const movedWindow = state.windows.find((candidate) => candidate.id === windowId);
    const mainHost = state.hosts.find((host) => host.id === "main");
    const mainPanels = Array.isArray((state.hostLayouts.main as { panels?: unknown }).panels)
      ? ((state.hostLayouts.main as { panels?: unknown[] }).panels ?? [])
      : [];

    expect(state.hosts.some((host) => host.id === "dock-1")).toBe(false);
    expect(movedWindow?.windowState?.hostId).toBe("main");
    expect(mainHost?.visibleWindows).toContain(windowId);
    expect(mainPanels).toEqual(expect.arrayContaining(["source", "locals"]));
  });

  it("does not leak closed windows after many create/close cycles", () => {
    const manager = new MultiHostWindowManager("/fake/preload.js");
    const windows: FakeBrowserWindow[] = [];
    const liveHostIds = new Set<string>();

    for (let index = 0; index < 250; index += 1) {
      const hostId = `dock-${index}`;
      const window = createFakeBrowserWindow(hostId);
      manager.registerWindow(hostId, window as never);
      windows.push(window);
      liveHostIds.add(hostId);

      expect(manager.getWindow(hostId)).toBe(window);
      expect(manager.getWindowCount()).toBe(liveHostIds.size);

      if (index % 2 === 0) {
        window.emitClosed();
        liveHostIds.delete(hostId);
        expect(manager.getWindow(hostId)).toBeUndefined();
        expect(manager.getWindowCount()).toBe(liveHostIds.size);
      }
    }

    expect(manager.getAllWindows()).toHaveLength(125);
    expect(manager.getWindowCount()).toBe(125);

    for (const window of windows) {
      if (manager.getWindow(window.id)) {
        window.emitClosed();
      }
    }

    expect(manager.getAllWindows()).toHaveLength(0);
    expect(manager.getWindowCount()).toBe(0);
  });

  it("keeps host and layout state free of orphaned references after repeated create/delete cycles", () => {
    let state = WorkspaceService.createEmptyWorkspace();

    for (let index = 0; index < 250; index += 1) {
      const hostId = `dock-${index}`;
      state = WorkspaceService.createHost(state, hostId, `Dock Window ${index + 1}`);
      state = WorkspaceService.setHostLayout(state, hostId, {
        version: 1,
        cycle: index,
        hostId,
      });

      const windowRecord = WorkspaceService.createWindow(state, {
        title: `Window ${index}`,
        body: `window-body-${index}`,
        type: DockableWindowType.ToolWindow,
        group: WindowGroup.ToolWindows,
        isVisible: true,
        displayMode: WindowDisplayMode.Docked,
      });

      state = windowRecord;
      const createdWindowId = state.windows[state.windows.length - 1].id;
      state = WorkspaceService.moveWindowToHost(state, {
        windowId: createdWindowId,
        targetHostId: hostId,
      });
      state = WorkspaceService.deleteHost(state, hostId);

      expect(state.hosts.some((host) => host.id === hostId)).toBe(false);
      expect(state.hostLayouts[hostId]).toBeUndefined();
      expect(
        state.hosts.every((host) =>
          host.visibleWindows.every((windowId) =>
            state.windows.some((window) => window.id === windowId),
          ),
        ),
      ).toBe(true);
    }

    expect(state.hosts).toHaveLength(1);
    expect(state.hosts[0].id).toBe("main");
    expect(state.hostLayouts).toHaveProperty("main");
    expect(state.hostLayouts.main).toEqual({
      version: 1,
      cycle: 0,
      hostId: "dock-0",
    });
  });
});
