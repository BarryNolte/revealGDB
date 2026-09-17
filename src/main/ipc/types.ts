/**
 * Defines types IPC handlers that bridge renderer requests to main-process behavior.
 *
 * @remarks
 * Exported symbols include `IsSelectedConnection`, `IpcRegistrationContext`. It is responsible for channel registration, payload marshalling, and returning data to renderer callers.
 */
import { BrowserWindow, IpcMain } from "electron";
import type { NormalizedConnection } from "../../common/connection-types";
import type { AppSettingsStore } from "../app-settings";
import { miInterface } from "../mi-interface/mi-interface";
import type { WorkspaceService } from "../workspace-service";
import type { ElectronStateStore } from "../workspace-state-store";

export type IsSelectedConnection = (value: unknown) => value is NormalizedConnection;

export type IpcRegistrationContext = {
  ipcMain: IpcMain;
  appSettings: AppSettingsStore;
  fontList: Map<string, string>;
  gdbAppInfo: Map<string, unknown>;
  getMainWindow: () => BrowserWindow;
  getGdbInterface: () => miInterface;
  isSelectedConnection: IsSelectedConnection;
  workspaceService?: WorkspaceService;
  workspaceStateStore?: ElectronStateStore;
};
