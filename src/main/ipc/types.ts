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
