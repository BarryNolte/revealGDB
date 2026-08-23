/**
 * Workspace IPC handlers for revealGDB docking system.
 *
 * @remarks
 * Registers IPC handlers for workspace operations (state queries, window CRUD, layout persistence).
 * Handlers use the request/response pattern (ipcMain.handle).
 */

import type {
  ApplyMonitorProfileRequest,
  CreateMonitorProfileRequest,
  DeleteMonitorProfileRequest,
} from "../../common/monitor-profile-types";
import {
  MONITOR_PROFILE_IPC_CHANNELS,
  WORKSPACE_IPC_CHANNELS,
} from "../../common/workspace-ipc-contracts";
import type {
  CreateWindowRequest,
  MoveWindowRequest,
  SaveHostLayoutRequest,
  SetWindowVisibilityRequest,
} from "../../common/workspace-types";
import { HostWindowManager } from "../host-window-manager";
import { MonitorProfileService } from "../monitor-profile-service";
import { WorkspacePersistence } from "../workspace-persistence";
import { WorkspaceService } from "../workspace-service";
import { IpcRegistrationContext } from "./types";

/**
 * Settings-like object interface.
 */
type SettingsLike = {
  getSync(key: string): unknown;
  setSync(key: string, value: unknown): void;
  deleteSync?(key: string): void;
  unsetSync?(key: string): void;
};

/**
 * Registers workspace IPC query handlers.
 *
 * @param context - IPC registration context with ipcMain and services.
 */
export function registerWorkspaceQueryHandlers(context: IpcRegistrationContext): void {
  if (!context.workspaceService) {
    return;
  }

  /**
   * Query: Get current workspace state.
   */
  context.ipcMain.handle(WORKSPACE_IPC_CHANNELS.workspaceGetState, () => {
    return context.workspaceService!.getWorkspace();
  });

  /**
   * Query: List all hosts (main + satellites).
   */
  context.ipcMain.handle(WORKSPACE_IPC_CHANNELS.workspaceListHosts, () => {
    return context.workspaceService!.listHosts();
  });
}

/**
 * Registers workspace IPC command handlers.
 *
 * @param context - IPC registration context with ipcMain and services.
 */
export function registerWorkspaceCommandHandlers(context: IpcRegistrationContext): void {
  if (!context.workspaceService) {
    return;
  }

  /**
   * Command: Create a new window.
   */
  context.ipcMain.handle(
    WORKSPACE_IPC_CHANNELS.workspaceCreateWindow,
    (_event, request: CreateWindowRequest) => {
      const workspace = context.workspaceService!.createWindow(request);
      // Broadcast update to all windows
      broadcastWorkspaceUpdate(context, workspace);
      return workspace;
    },
  );

  /**
   * Command: Move window to a different group.
   */
  context.ipcMain.handle(
    WORKSPACE_IPC_CHANNELS.workspaceMoveWindow,
    (_event, request: MoveWindowRequest) => {
      const workspace = context.workspaceService!.moveWindow(request);
      broadcastWorkspaceUpdate(context, workspace);
      return workspace;
    },
  );

  /**
   * Command: Set window visibility.
   */
  context.ipcMain.handle(
    WORKSPACE_IPC_CHANNELS.workspaceSetWindowVisibility,
    (_event, request: SetWindowVisibilityRequest) => {
      const workspace = context.workspaceService!.setWindowVisibility(request);
      broadcastWorkspaceUpdate(context, workspace);
      return workspace;
    },
  );

  /**
   * Command: Save dock layout for a host.
   */
  context.ipcMain.handle(
    WORKSPACE_IPC_CHANNELS.workspaceSaveHostLayout,
    (_event, request: SaveHostLayoutRequest) => {
      const { workspace, result } = context.workspaceService!.saveHostLayout(request);
      if (result) {
        broadcastWorkspaceUpdate(context, workspace);
      }
      return { workspace, result };
    },
  );

  /**
   * Command: Open a new satellite host window.
   */
  context.ipcMain.handle(
    WORKSPACE_IPC_CHANNELS.workspaceOpenHostWindow,
    (_event, request: { label?: string }) => {
      const { hostId, host } = context.workspaceService!.createSatelliteHost(request.label);

      // Use HostWindowManager to create the actual window
      if (context.hostWindowManager) {
        context.hostWindowManager
          .createHostWindow({
            hostId,
            baseUrl: "http://localhost:5173",
          })
          .catch((error) => {
            console.error(`Failed to create host window ${hostId}:`, error);
          });
      }

      broadcastWorkspaceUpdate(context, context.workspaceService!.getWorkspace());
      return { hostId, host };
    },
  );

  /**
   * Command: Close a satellite host window.
   */
  context.ipcMain.handle(
    WORKSPACE_IPC_CHANNELS.workspaceCloseHostWindow,
    (_event, request: { hostId: string }) => {
      const success = context.workspaceService!.removeSatelliteHost(request.hostId);

      // Use HostWindowManager to close the actual window
      if (success && context.hostWindowManager) {
        context.hostWindowManager.closeHostWindow(request.hostId);
      }

      broadcastWorkspaceUpdate(context, context.workspaceService!.getWorkspace());
      return { success };
    },
  );
}

/**
 * Broadcasts workspace update to all renderer windows.
 *
 * @param context - IPC registration context.
 * @param workspace - Updated workspace state.
 */
function broadcastWorkspaceUpdate(context: IpcRegistrationContext, workspace: unknown): void {
  try {
    const mainWindow = context.getMainWindow();
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send(WORKSPACE_IPC_CHANNELS.workspaceUpdated, workspace);
    }
  } catch (error) {
    console.error("Failed to broadcast workspace update:", error);
  }
}

/**
 * Initializes workspace service and returns it for use in context.
 * Call this from main.ts before passing context to registerIpcHandlers.
 *
 * @param appSettings - Application settings instance.
 * @returns WorkspaceService instance.
 */
export function createWorkspaceService(appSettings: SettingsLike): WorkspaceService {
  const persistence = new WorkspacePersistence(appSettings);
  return new WorkspaceService(persistence);
}

/**
 * Registers monitor profile IPC query handlers.
 *
 * @param context - IPC registration context with monitor profile service.
 */
export function registerMonitorProfileQueryHandlers(context: IpcRegistrationContext): void {
  if (!context.monitorProfileService) {
    return;
  }

  /**
   * Query: Get all monitor profiles.
   */
  context.ipcMain.handle(MONITOR_PROFILE_IPC_CHANNELS.monitorGetProfiles, () => {
    return context.monitorProfileService!.getProfiles();
  });

  /**
   * Query: Auto-detect and apply best-matching profile.
   */
  context.ipcMain.handle(MONITOR_PROFILE_IPC_CHANNELS.monitorDetectProfile, () => {
    return context.monitorProfileService!.detectProfile();
  });
}

/**
 * Registers monitor profile IPC command handlers.
 *
 * @param context - IPC registration context with monitor profile service.
 */
export function registerMonitorProfileCommandHandlers(context: IpcRegistrationContext): void {
  if (!context.monitorProfileService) {
    return;
  }

  /**
   * Command: Create a new monitor profile.
   */
  context.ipcMain.handle(
    MONITOR_PROFILE_IPC_CHANNELS.monitorCreateProfile,
    async (_event, request: CreateMonitorProfileRequest) => {
      const profileId = await context.monitorProfileService!.createProfile(request);
      return { profileId };
    },
  );

  /**
   * Command: Apply a monitor profile.
   */
  context.ipcMain.handle(
    MONITOR_PROFILE_IPC_CHANNELS.monitorApplyProfile,
    async (_event, request: ApplyMonitorProfileRequest) => {
      const success = await context.monitorProfileService!.applyProfile(request);
      return { success };
    },
  );

  /**
   * Command: Delete a monitor profile.
   */
  context.ipcMain.handle(
    MONITOR_PROFILE_IPC_CHANNELS.monitorDeleteProfile,
    async (_event, request: DeleteMonitorProfileRequest) => {
      const success = await context.monitorProfileService!.deleteProfile(request);
      return { success };
    },
  );
}

/**
 * Initializes monitor profile service.
 * Call this from main.ts before passing context to registerIpcHandlers.
 *
 * @param persistence - Workspace persistence instance.
 * @param hostWindowManager - Host window manager for applying bounds.
 * @returns MonitorProfileService instance.
 */
export function createMonitorProfileService(
  persistence: WorkspacePersistence,
  hostWindowManager: HostWindowManager,
): MonitorProfileService {
  return new MonitorProfileService(persistence, hostWindowManager);
}
