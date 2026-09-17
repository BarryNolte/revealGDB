import { beforeEach, describe, expect, it, vi } from "vitest";
import { IPC_CHANNELS } from "../../../../src/common/ipc-contracts";
import {
  registerWorkspaceCommandHandlers,
  registerWorkspaceQueryHandlers,
} from "../../../../src/main/ipc/workspace";
import { WorkspaceService } from "../../../../src/main/workspace-service";
import { createIpcRegistrationHarness } from "../../../helpers/ipc-test-harness";

const workspaceIpcMocks = vi.hoisted(() => ({
  getAllWindows: vi.fn(),
  closeFloatingWindow: vi.fn(),
  closeSatelliteWindow: vi.fn(),
  createFloatingWindow: vi.fn(),
  createSatelliteWindow: vi.fn(),
  generateSatelliteHostId: vi.fn(() => "satellite-test"),
  getFloatingWindow: vi.fn(),
  getWindowForHost: vi.fn(),
  showHostWindow: vi.fn(() => Promise.resolve()),
  resolvePreloadPath: vi.fn(() => "out/preload/preload.js"),
}));

vi.mock("electron", () => ({
  BrowserWindow: {
    getAllWindows: workspaceIpcMocks.getAllWindows,
  },
}));

vi.mock("../../../../src/main/multi-window-manager", () => ({
  closeFloatingWindow: workspaceIpcMocks.closeFloatingWindow,
  closeSatelliteWindow: workspaceIpcMocks.closeSatelliteWindow,
  createFloatingWindow: workspaceIpcMocks.createFloatingWindow,
  createSatelliteWindow: workspaceIpcMocks.createSatelliteWindow,
  generateSatelliteHostId: workspaceIpcMocks.generateSatelliteHostId,
  getFloatingWindow: workspaceIpcMocks.getFloatingWindow,
  getWindowForHost: workspaceIpcMocks.getWindowForHost,
  showHostWindow: workspaceIpcMocks.showHostWindow,
}));

vi.mock("../../../../src/main/window-manager", () => ({
  resolvePreloadPath: workspaceIpcMocks.resolvePreloadPath,
}));

describe("workspace IPC handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists and broadcasts add, hide, show, move, and remove workspace mutations", async () => {
    const workspaceService = new WorkspaceService();
    const workspaceStateStore = {
      save: vi.fn().mockResolvedValue(undefined),
    };
    const { context, ipcMain, send, mainWindow } = createIpcRegistrationHarness({
      workspaceStateStore,
    });
    workspaceIpcMocks.getAllWindows.mockReturnValue([mainWindow]);

    registerWorkspaceCommandHandlers(context, workspaceService);

    const handlers = Object.fromEntries(
      ipcMain.handle.mock.calls.map(([channel, handler]) => [channel, handler]),
    );

    const addedWorkspace = handlers[IPC_CHANNELS.rendererToMain.commands.workspace.addWindow](
      undefined,
      "SourceFileWindow",
      "main.cpp",
    );
    const windowId = addedWorkspace.groups.find((group) => group.name === "documents")?.windows[0]
      ?.id;

    expect(windowId).toBeTruthy();

    handlers[IPC_CHANNELS.rendererToMain.commands.workspace.hideWindow](undefined, windowId);
    handlers[IPC_CHANNELS.rendererToMain.commands.workspace.showWindow](undefined, windowId);
    handlers[IPC_CHANNELS.rendererToMain.commands.workspace.moveWindow](
      undefined,
      windowId,
      "toolwindows",
    );
    handlers[IPC_CHANNELS.rendererToMain.commands.workspace.removeWindow](undefined, windowId);

    expect(workspaceStateStore.save).toHaveBeenCalledTimes(5);
    expect(send).toHaveBeenCalledTimes(5);
    expect(send).toHaveBeenLastCalledWith(
      IPC_CHANNELS.mainToRenderer.notifications.workspaceUpdated,
      expect.objectContaining({ version: expect.any(Number) }),
    );
  });

  it("falls back to appSettings when a workspaceStateStore is not provided", () => {
    const workspaceService = new WorkspaceService();
    const { context, ipcMain, appSettings, mainWindow } = createIpcRegistrationHarness();
    workspaceIpcMocks.getAllWindows.mockReturnValue([mainWindow]);

    registerWorkspaceCommandHandlers(context, workspaceService);

    const handler = ipcMain.handle.mock.calls.find(
      ([channel]) => channel === IPC_CHANNELS.rendererToMain.commands.workspace.addWindow,
    )?.[1];

    handler(undefined, "ToolWindow", "Locals", "toolwindows");

    expect(appSettings.setSync).toHaveBeenCalledWith(
      "gdb.gui.workspace",
      expect.objectContaining({ version: expect.any(Number) }),
    );
  });

  it("returns the current workspace through the workspace query handler", () => {
    const workspaceService = new WorkspaceService();
    const { context, ipcMain } = createIpcRegistrationHarness();

    registerWorkspaceQueryHandlers(context, workspaceService);

    const handler = ipcMain.handle.mock.calls.find(
      ([channel]) => channel === IPC_CHANNELS.rendererToMain.queries.workspace.getWorkspace,
    )?.[1];

    expect(handler()).toEqual(workspaceService.getWorkspace());
  });

  it("persists setActiveWindow, moveWindowToPane, and reorderPaneWindows", async () => {
    const workspaceService = new WorkspaceService();
    const workspaceStateStore = {
      save: vi.fn().mockResolvedValue(undefined),
    };
    const { context, ipcMain, send, mainWindow } = createIpcRegistrationHarness({
      workspaceStateStore,
    });
    workspaceIpcMocks.getAllWindows.mockReturnValue([mainWindow]);

    registerWorkspaceCommandHandlers(context, workspaceService);

    const handlers = Object.fromEntries(
      ipcMain.handle.mock.calls.map(([channel, handler]) => [channel, handler]),
    );

    const addOne = handlers[IPC_CHANNELS.rendererToMain.commands.workspace.addWindow](
      undefined,
      "SourceFileWindow",
      "main.cpp",
    );
    const addTwo = handlers[IPC_CHANNELS.rendererToMain.commands.workspace.addWindow](
      undefined,
      "ToolWindow",
      "Locals",
      "toolwindows",
    );
    const firstWindowId = addOne.groups[0].windows[0].id;
    const secondWindowId = addTwo.groups[1].windows[0].id;

    const splitWorkspace = handlers[IPC_CHANNELS.rendererToMain.commands.workspace.splitPane](
      undefined,
      firstWindowId,
      "horizontal",
    );
    const targetPaneId = splitWorkspace.windows[0].layout.root.children[1].id;

    handlers[IPC_CHANNELS.rendererToMain.commands.workspace.setActiveWindow](
      undefined,
      secondWindowId,
    );
    const movedWorkspace = handlers[
      IPC_CHANNELS.rendererToMain.commands.workspace.moveWindowToPane
    ](undefined, secondWindowId, targetPaneId);
    handlers[IPC_CHANNELS.rendererToMain.commands.workspace.reorderPaneWindows](
      undefined,
      targetPaneId,
      [...movedWorkspace.windows[0].layout.root.children[1].windowIds].reverse(),
    );

    expect(workspaceStateStore.save).toHaveBeenCalled();
    expect(send).toHaveBeenCalledWith(
      IPC_CHANNELS.mainToRenderer.notifications.workspaceUpdated,
      expect.objectContaining({ version: expect.any(Number) }),
    );
  });
});
