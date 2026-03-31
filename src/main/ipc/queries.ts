import { IPC_CHANNELS } from "../../common/ipc-contracts";
import { gdbFunction } from "../mi-interface/gdb-state-database/gdbStateDatabase";
import { WslUtilities, type WslDistro } from "../utilities/wsl-utilities";
import { IpcRegistrationContext } from "./types";

export function registerIpcQueryHandlers(context: IpcRegistrationContext): void {
  context.ipcMain.handle(IPC_CHANNELS.rendererToMain.queries.app.settings, (): string[] => {
    return context.appSettings.getSync("gdb") as string[];
  });

  context.ipcMain.handle(
    IPC_CHANNELS.rendererToMain.queries.app.systemFonts,
    (): Promise<string[]> => {
      return Promise.resolve(context.fontList.keys().toArray());
    },
  );

  context.ipcMain.handle(IPC_CHANNELS.rendererToMain.queries.app.versionInfo, () => {
    return Promise.resolve(context.gdbAppInfo);
  });

  context.ipcMain.handle(
    IPC_CHANNELS.rendererToMain.queries.environment.wslDistributions,
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
    IPC_CHANNELS.rendererToMain.queries.debugger.functionNames,
    (): Promise<gdbFunction[]> => {
      return Promise.resolve(context.getGdbInterface().gdbDB.getAllFunctionNames());
    },
  );
}
