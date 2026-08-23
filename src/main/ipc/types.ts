/**
 * Defines types IPC handlers that bridge renderer requests to main-process behavior.
 *
 * @remarks
 * Exported symbols include `IsSelectedConnection`, `IpcRegistrationContext`. It is responsible for channel registration, payload marshalling, and returning data to renderer callers.
 */
import { BrowserWindow, IpcMain } from "electron";
import settings from "electron-settings";
import type { NormalizedConnection } from "../../common/connection-types";
import { miInterface } from "../mi-interface/mi-interface";
import type { WorkspaceService } from "../workspace-service";
import type { SatelliteWindowHandler } from "../satellite-window-handler";
import type { HostWindowManager } from "../host-window-manager";
import type { MonitorProfileService } from "../monitor-profile-service";

export type IsSelectedConnection = (value: unknown) => value is NormalizedConnection;

export type IpcRegistrationContext = {
  ipcMain: IpcMain;
  appSettings: typeof settings;
  fontList: Map<string, string>;
  gdbAppInfo: Map<string, unknown>;
  getMainWindow: () => BrowserWindow;
  getGdbInterface: () => miInterface;
  isSelectedConnection: IsSelectedConnection;
  workspaceService?: WorkspaceService;
  satelliteWindowHandler?: SatelliteWindowHandler;
  hostWindowManager?: HostWindowManager;
  monitorProfileService?: MonitorProfileService;
};
