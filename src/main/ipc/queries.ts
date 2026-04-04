import { IPC_CHANNELS } from "../../common/ipc-contracts";
import { gdbFunction } from "../mi-interface/gdb-state-database/gdbStateDatabase";
import { WslUtilities, type WslDistro } from "../utilities/wsl-utilities";
import { IpcRegistrationContext } from "./types";

export function registerIpcQueryHandlers(context: IpcRegistrationContext): void {
  context.ipcMain.handle(
    IPC_CHANNELS.rendererToMain.queries.app.settings,
    (): Promise<string[]> => {
      const attempt = async (remaining: number, delayMs: number): Promise<string[]> => {
        try {
          return context.appSettings.getSync("gdb") as string[];
        } catch (error) {
          if (remaining <= 1) throw error;
          console.error(
            `Failed to get settings, retrying in ${delayMs}ms (${remaining - 1} attempts left):`,
            error,
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          return attempt(remaining - 1, delayMs + 100);
        }
      };
      return attempt(5, 100);
    },
  );

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
