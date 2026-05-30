/**
 * Defines queries IPC handlers that bridge renderer requests to main-process behavior.
 *
 * @remarks
 * Exported symbols include `registerIpcQueryHandlers`. It is responsible for channel registration, payload marshalling, and returning data to renderer callers.
 */
import { gdbShowSourceInfo, gdbSymbolFiles } from "../../common/gdb-state-types";
import { IPC_CHANNELS } from "../../common/ipc-contracts";
import { gdbFunction, gdbVarLocation } from "../mi-interface/gdb-state-database/gdbStateDatabase";
import { WslUtilities, type WslDistro } from "../utilities/wsl-utilities";
import { IpcRegistrationContext } from "./types";

function registerAppAndEnvironmentQueryHandlers(context: IpcRegistrationContext): void {
  context.ipcMain.handle(
    IPC_CHANNELS.rendererToMain.queries.app.settings,
    (): Promise<string[]> => {
      /**
       * Performs attempt as part of this module's internal workflow.
       *
       * @remarks
       * Participates in main-process IPC wiring between renderer requests and backend services. Includes explicit error-handling logic for expected failure paths. Performs asynchronous work and should be used with completion ordering in mind.
       *
       * @param remaining - Number of retry attempts remaining before the operation fails.
       * @param delayMs - Delay, in milliseconds, to wait before retrying the operation.
       * @returns A promise that resolves with the computed result after asynchronous processing completes.
       */
      const attempt = async (remaining: number, delayMs: number): Promise<string[]> => {
        try {
          return context.appSettings.getSync("gdb") as string[];
        } catch (error) {
          if (remaining <= 1) throw error;
          // console.error(
          //   `Failed to get settings, retrying in ${delayMs}ms (${remaining - 1} attempts left):`,
          //   error,
          // );
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
        return Promise.resolve(WslUtilities.getWslDistributions());
      } catch (error) {
        console.error("Failed to get WSL distributions", error);
        return Promise.resolve([]);
      }
    },
  );
}

function registerDebuggerQueryHandlers(context: IpcRegistrationContext): void {
  context.ipcMain.handle(
    IPC_CHANNELS.rendererToMain.queries.debugger.functionNames,
    (): Promise<gdbFunction[]> => {
      return Promise.resolve(context.getGdbInterface().gdbDB.getAllFunctionNames());
    },
  );

  context.ipcMain.handle(
    IPC_CHANNELS.rendererToMain.queries.debugger.varAtPosition,
    (
      _: unknown,
      sourceFile: string,
      line: number,
      col: number,
    ): Promise<gdbVarLocation | undefined> => {
      return Promise.resolve(
        context.getGdbInterface().gdbDB.queryVarAtPosition(sourceFile, line, col),
      );
    },
  );

  context.ipcMain.handle(
    IPC_CHANNELS.rendererToMain.queries.debugger.varByName,
    (_: unknown, sourceFile: string, varName: string): Promise<gdbVarLocation | undefined> => {
      return Promise.resolve(context.getGdbInterface().gdbDB.getVarByName(sourceFile, varName));
    },
  );

  context.ipcMain.handle(
    IPC_CHANNELS.rendererToMain.queries.debugger.evaluateExpression,
    (_: unknown, expr: string): Promise<string | undefined> => {
      return context.getGdbInterface().evaluateExpression(expr);
    },
  );

  context.ipcMain.handle(
    IPC_CHANNELS.rendererToMain.queries.debugger.sections,
    (): Promise<gdbSymbolFiles> => {
      return Promise.resolve(context.getGdbInterface().gdbDB.gdbSymbolFiles);
    },
  );

  context.ipcMain.handle(
    IPC_CHANNELS.rendererToMain.queries.debugger.showSourceAt,
    async (_: unknown, fileName: string, line: string): Promise<gdbShowSourceInfo> => {
      const contents = await context.getGdbInterface().gdbDB.getSourceFileContents(fileName);
      const result: gdbShowSourceInfo = { fileName, line, contents };
      context
        .getMainWindow()
        .webContents.send(IPC_CHANNELS.mainToRenderer.debuggerData.sourceFile, result);
      return result;
    },
  );
}

/**
 * Registers ipc query handlers for the active runtime context.
 *
 * @remarks
 * Participates in main-process IPC wiring between renderer requests and backend services. Includes explicit error-handling logic for expected failure paths. Performs asynchronous work and should be used with completion ordering in mind.
 *
 * @param context - Dependency container used to register handlers and access shared services.
 */
export function registerIpcQueryHandlers(context: IpcRegistrationContext): void {
  registerAppAndEnvironmentQueryHandlers(context);
  registerDebuggerQueryHandlers(context);
}
