import { IPC_CHANNELS } from "../../common/ipc-contracts";
import { gdbFunction } from "../mi-interface/gdb-state-database/gdbStateDatabase";
import { WslUtilities, type WslDistro } from "../utilities/wsl-utilities";
import { IpcRegistrationContext } from "./types";

export function registerIpcQueryHandlers(context: IpcRegistrationContext): void {
  context.ipcMain.handle(IPC_CHANNELS.rendererInvoke.getSettings, (): string[] => {
    return context.appSettings.getSync("gdb") as string[];
  });

  context.ipcMain.handle(IPC_CHANNELS.rendererInvoke.getSystemFonts, (): Promise<string[]> => {
    return Promise.resolve(context.fontList.keys().toArray());
  });

  context.ipcMain.handle(IPC_CHANNELS.rendererInvoke.getVersionInfo, () => {
    return Promise.resolve(context.gdbAppInfo);
  });

  context.ipcMain.handle(
    IPC_CHANNELS.rendererInvoke.getWslDistrobutions,
    (): Promise<WslDistro[]> => {
      try {
        return Promise.resolve(WslUtilities.getWslDistrobutions());
      } catch (error) {
        console.error("Failed to get WSL distributions", error);
        return Promise.resolve([]);
      }
    },
  );

  context.ipcMain.handle(
    IPC_CHANNELS.rendererInvoke.getFunctionNames,
    (): Promise<gdbFunction[]> => {
      return Promise.resolve(context.getGdbInterface().gdbDB.getAllFunctionNames());
    },
  );
}
