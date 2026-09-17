/**
 * Workspace IPC Handlers
 *
 * Handles workspace-related queries and commands from the renderer.
 */

import { BrowserWindow } from "electron";
import { IPC_CHANNELS } from "../../common/ipc-contracts";
import type { Workspace } from "../../common/workspace-types";
import {
  closeFloatingWindow,
  closeSatelliteWindow,
  createFloatingWindow,
  createSatelliteWindow,
  generateSatelliteHostId,
  getFloatingWindow,
  getWindowForHost,
  showHostWindow,
} from "../multi-window-manager";
import { resolvePreloadPath } from "../window-manager";
import { WorkspaceService } from "../workspace-service";
import type { IpcRegistrationContext } from "./types";

const WORKSPACE_SETTINGS_KEY = "gdb.gui.workspace";

/**
 * Register workspace query handlers
 */
export function registerWorkspaceQueryHandlers(
  context: IpcRegistrationContext,
  workspaceService: WorkspaceService,
): void {
  context.ipcMain.handle(
    IPC_CHANNELS.rendererToMain.queries.workspace.getWorkspace,
    (): Workspace => {
      return workspaceService.getWorkspace();
    },
  );
}

/**
 * Helper to broadcast workspace updates to all windows (multi-window support)
 */
function broadcastWorkspaceToAll(context: IpcRegistrationContext, workspace: Workspace): void {
  const windows = BrowserWindow.getAllWindows();
  for (const window of windows) {
    if (!window.isDestroyed()) {
      window.webContents.send(
        IPC_CHANNELS.mainToRenderer.notifications.workspaceUpdated,
        workspace,
      );
    }
  }
}

function persistWorkspaceSnapshot(context: IpcRegistrationContext, workspace: Workspace): void {
  if (context.workspaceStateStore) {
    void context.workspaceStateStore.save(workspace).catch((error) => {
      console.error("Failed to persist workspace state:", error);
    });
    return;
  }

  context.appSettings.setSync(WORKSPACE_SETTINGS_KEY, workspace as never);
}

/**
 * Register basic window management commands
 */
function registerBasicWindowCommands(
  context: IpcRegistrationContext,
  workspaceService: WorkspaceService,
): void {
  context.ipcMain.handle(
    IPC_CHANNELS.rendererToMain.commands.workspace.addWindow,
    (
      _: unknown,
      type: "SourceFileWindow" | "ToolWindow",
      title: string,
      group?: string,
    ): Workspace => {
      const result = workspaceService.addWindow(type, title, group);
      persistWorkspaceSnapshot(context, result);
      broadcastWorkspaceToAll(context, result);
      return result;
    },
  );

  context.ipcMain.handle(
    IPC_CHANNELS.rendererToMain.commands.workspace.removeWindow,
    (_: unknown, windowId: string): Workspace => {
      const result = workspaceService.removeWindow(windowId);
      persistWorkspaceSnapshot(context, result);
      broadcastWorkspaceToAll(context, result);
      return result;
    },
  );

  context.ipcMain.handle(
    IPC_CHANNELS.rendererToMain.commands.workspace.showWindow,
    (_: unknown, windowId: string): Workspace => {
      const result = workspaceService.showWindow(windowId);
      persistWorkspaceSnapshot(context, result);
      broadcastWorkspaceToAll(context, result);
      return result;
    },
  );

  context.ipcMain.handle(
    IPC_CHANNELS.rendererToMain.commands.workspace.hideWindow,
    (_: unknown, windowId: string): Workspace => {
      const result = workspaceService.hideWindow(windowId);
      persistWorkspaceSnapshot(context, result);
      broadcastWorkspaceToAll(context, result);
      return result;
    },
  );

  context.ipcMain.handle(
    IPC_CHANNELS.rendererToMain.commands.workspace.moveWindow,
    (_: unknown, windowId: string, targetGroupName: string): Workspace => {
      const result = workspaceService.moveWindow(windowId, targetGroupName);
      persistWorkspaceSnapshot(context, result);
      broadcastWorkspaceToAll(context, result);
      return result;
    },
  );

  context.ipcMain.handle(
    IPC_CHANNELS.rendererToMain.commands.workspace.setActiveWindow,
    (_: unknown, windowId: string): Workspace => {
      const result = workspaceService.setActiveWindow(windowId);
      persistWorkspaceSnapshot(context, result);
      broadcastWorkspaceToAll(context, result);
      return result;
    },
  );
}

/**
 * Register pane layout commands
 */
function registerPaneCommands(
  context: IpcRegistrationContext,
  workspaceService: WorkspaceService,
): void {
  context.ipcMain.handle(
    IPC_CHANNELS.rendererToMain.commands.workspace.floatWindow,
    (_: unknown, windowId: string): Workspace => {
      const result = workspaceService.floatWindow(windowId);

      // Create actual Electron BrowserWindow for floating pane
      const rendererUrl = process.env.ELECTRON_RENDERER_URL || "";
      const preloadPath = resolvePreloadPath();
      const floatingWorkspaceWindow = result.windows?.find(
        (w) => w.id === windowId && w.type === "floating",
      );

      if (floatingWorkspaceWindow) {
        const floatingWindow = createFloatingWindow(
          windowId,
          floatingWorkspaceWindow.bounds,
          rendererUrl,
          preloadPath,
        );
        floatingWindow.show();
      }

      persistWorkspaceSnapshot(context, result);
      broadcastWorkspaceToAll(context, result);
      return result;
    },
  );

  context.ipcMain.handle(
    IPC_CHANNELS.rendererToMain.commands.workspace.dockWindow,
    (_: unknown, floatingWindowId: string, targetPaneId: string): Workspace => {
      closeFloatingWindow(floatingWindowId);
      const result = workspaceService.dockWindow(floatingWindowId, targetPaneId);
      persistWorkspaceSnapshot(context, result);
      broadcastWorkspaceToAll(context, result);
      return result;
    },
  );

  context.ipcMain.handle(
    IPC_CHANNELS.rendererToMain.commands.workspace.splitPane,
    (_: unknown, windowId: string, direction: "horizontal" | "vertical"): Workspace => {
      const result = workspaceService.splitPane(windowId, direction);
      persistWorkspaceSnapshot(context, result);
      broadcastWorkspaceToAll(context, result);
      return result;
    },
  );

  context.ipcMain.handle(
    IPC_CHANNELS.rendererToMain.commands.workspace.resizePane,
    (_: unknown, paneId: string, newSize: number): Workspace => {
      const result = workspaceService.resizePane(paneId, newSize);
      persistWorkspaceSnapshot(context, result);
      broadcastWorkspaceToAll(context, result);
      return result;
    },
  );

  context.ipcMain.handle(
    IPC_CHANNELS.rendererToMain.commands.workspace.moveWindowToPane,
    (_: unknown, windowId: string, targetPaneId: string): Workspace => {
      const targetBrowserWindow = workspaceService
        .getWorkspace()
        .windows.find((workspaceWindow) => workspaceContainsPane(workspaceWindow, targetPaneId));

      if (!targetBrowserWindow) {
        throw new Error(`Pane not found: ${targetPaneId}`);
      }

      const result = workspaceService.moveWindowToPane(windowId, targetPaneId, targetBrowserWindow);
      persistWorkspaceSnapshot(context, result);
      broadcastWorkspaceToAll(context, result);
      return result;
    },
  );

  context.ipcMain.handle(
    IPC_CHANNELS.rendererToMain.commands.workspace.reorderPaneWindows,
    (_: unknown, paneId: string, windowIds: string[]): Workspace => {
      const result = workspaceService.reorderPaneWindows(paneId, windowIds);
      persistWorkspaceSnapshot(context, result);
      broadcastWorkspaceToAll(context, result);
      return result;
    },
  );
}

function workspaceContainsPane(
  workspaceWindow: Workspace["windows"][number],
  paneId: string,
): boolean {
  const visitNode = (node: Workspace["windows"][number]["layout"]["root"]): boolean => {
    if ("children" in node) {
      return node.children.some((child) => visitNode(child));
    }

    return node.id === paneId;
  };

  return visitNode(workspaceWindow.layout.root);
}

/**
 * Register multi-host management commands
 */
// eslint-disable-next-line max-lines-per-function
function registerHostCommands(
  context: IpcRegistrationContext,
  workspaceService: WorkspaceService,
): void {
  context.ipcMain.handle(
    IPC_CHANNELS.rendererToMain.commands.workspace.createHost,
    (_: unknown, payload: { label: string }): string => {
      const hostId = generateSatelliteHostId();
      const workspace = workspaceService.createHost(hostId, payload.label);

      const rendererUrl = process.env.ELECTRON_RENDERER_URL || "";
      const preloadPath = resolvePreloadPath();
      const newWindow = createSatelliteWindow(hostId, undefined, rendererUrl, preloadPath);
      newWindow.show();

      persistWorkspaceSnapshot(context, workspace);
      broadcastWorkspaceToAll(context, workspace);
      return hostId;
    },
  );

  context.ipcMain.handle(
    IPC_CHANNELS.rendererToMain.commands.workspace.deleteHost,
    (_: unknown, payload: { hostId: string }): Workspace => {
      if (payload.hostId === "main") return workspaceService.getWorkspace();

      closeSatelliteWindow(payload.hostId);
      const workspace = workspaceService.deleteHost(payload.hostId);

      persistWorkspaceSnapshot(context, workspace);
      broadcastWorkspaceToAll(context, workspace);
      return workspace;
    },
  );

  context.ipcMain.handle(
    IPC_CHANNELS.rendererToMain.commands.workspace.movePane,
    (
      _: unknown,
      payload: { paneId: string; sourceHostId: string; targetHostId: string },
    ): Workspace => {
      const workspace = workspaceService.movePaneToHost(payload.paneId, payload.targetHostId);

      const targetHost = workspace.hosts?.find((host) => host.id === payload.targetHostId);
      if (targetHost?.isVisible) {
        const window = getWindowForHost(payload.targetHostId);
        if (window) window.show();
      }

      persistWorkspaceSnapshot(context, workspace);
      broadcastWorkspaceToAll(context, workspace);
      return workspace;
    },
  );

  context.ipcMain.handle(
    IPC_CHANNELS.rendererToMain.commands.workspace.saveHostLayout,
    (_: unknown, payload: { hostId: string; layout: unknown }): Workspace => {
      const workspace = workspaceService.saveHostLayout(
        payload.hostId,
        (payload.layout as Record<string, unknown>) || {},
      );

      persistWorkspaceSnapshot(context, workspace);
      broadcastWorkspaceToAll(context, workspace);
      return workspace;
    },
  );

  context.ipcMain.handle(
    IPC_CHANNELS.rendererToMain.commands.workspace.openHost,
    async (_: unknown, payload: { hostId: string }): Promise<void> => {
      try {
        workspaceService.markHostVisible(payload.hostId, true);
      } catch {
        // Host metadata may not exist yet in some harness paths.
      }

      const existingWindow = getWindowForHost(payload.hostId);
      if (!existingWindow && payload.hostId !== "main") {
        const rendererUrl = process.env.ELECTRON_RENDERER_URL || "";
        const preloadPath = resolvePreloadPath();
        const createdWindow = createSatelliteWindow(
          payload.hostId,
          undefined,
          rendererUrl,
          preloadPath,
        );
        createdWindow.show();
        return;
      }

      await showHostWindow(payload.hostId, false);
    },
  );
}

/**
 * Register floating window handlers
 */
function registerFloatingWindowHandlers(context: IpcRegistrationContext): void {
  context.ipcMain.handle(
    IPC_CHANNELS.rendererToMain.commands.workspace.createFloatingWindow,
    (_: unknown, payload: { windowId: string; label: string }): string => {
      const rendererUrl = process.env.ELECTRON_RENDERER_URL || "";
      const preloadPath = resolvePreloadPath();

      const floatingWindow = createFloatingWindow(
        payload.windowId,
        undefined,
        rendererUrl,
        preloadPath,
      );
      floatingWindow.show();

      return payload.windowId;
    },
  );

  context.ipcMain.handle(
    IPC_CHANNELS.rendererToMain.commands.workspace.closeFloatingWindow,
    (_: unknown, payload: { windowId: string }): void => {
      closeFloatingWindow(payload.windowId);
    },
  );

  context.ipcMain.handle(
    IPC_CHANNELS.rendererToMain.commands.workspace.updateFloatingWindowBounds,
    (
      _: unknown,
      payload: {
        windowId: string;
        bounds: { x: number; y: number; width: number; height: number };
      },
    ): void => {
      const window = getFloatingWindow(payload.windowId);
      if (window && !window.isDestroyed()) {
        window.setBounds(payload.bounds);
      }
    },
  );
}

/**
 * Register workspace command handlers
 */
export function registerWorkspaceCommandHandlers(
  context: IpcRegistrationContext,
  workspaceService: WorkspaceService,
): void {
  registerBasicWindowCommands(context, workspaceService);
  registerPaneCommands(context, workspaceService);
  registerHostCommands(context, workspaceService);
  registerFloatingWindowHandlers(context);
}
