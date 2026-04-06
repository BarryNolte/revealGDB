/**
 * Defines types IPC handlers that bridge renderer requests to main-process behavior.
 *
 * @remarks
 * Exported symbols include `IsSelectedConnection`, `IpcRegistrationContext`. It is responsible for channel registration, payload marshalling, and returning data to renderer callers.
 */
import { BrowserWindow, IpcMain } from "electron";
import settings from "electron-settings";
import { GdbAny, SelectedConnection } from "../../common/gdb-common";
import { miInterface } from "../mi-interface/mi-interface";

export type IsSelectedConnection = (value: unknown) => value is SelectedConnection;

export type IpcRegistrationContext = {
  ipcMain: IpcMain;
  appSettings: typeof settings;
  fontList: Map<string, string>;
  gdbAppInfo: Map<string, GdbAny>;
  getMainWindow: () => BrowserWindow;
  getGdbInterface: () => miInterface;
  isSelectedConnection: IsSelectedConnection;
};
