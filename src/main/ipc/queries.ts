/**
 * Defines queries IPC handlers that bridge renderer requests to main-process behavior.
 *
 * @remarks
 * Exported symbols include `registerIpcQueryHandlers`. It is responsible for channel registration, payload marshalling, and returning data to renderer callers.
 */
import { gdbShowSourceInfo, gdbSymbolFiles } from "../../common/gdb-state-types";
import { IPC_CHANNELS } from "../../common/ipc-contracts";
import { type GdbSettings } from "../../common/settings-types";
import { gdbFunction, gdbVarLocation } from "../mi-interface/gdb-state-database/gdbStateDatabase";
import { WslUtilities, type WslDistro } from "../utilities/wsl-utilities";
import { IpcRegistrationContext } from "./types";
import { registerWorkspaceQueryHandlers } from "./workspace";
function registerAppAndEnvironmentQueryHandlers(context: IpcRegistrationContext): void {
  context.ipcMain.handle(
    IPC_CHANNELS.rendererToMain.queries.app.settings,
    (): Promise<GdbSettings> => {
      try {
        const settings = context.appSettings.getSync("gdb") as GdbSettings;
        if (__REVEALGDB_DEBUG__) {
          console.log("[getSettings] Retrieved settings:", {
            hasSettings: !!settings,
            hasConnections: !!settings?.connections,
            connectionsCount: settings?.connections?.length ?? 0,
            settingsKeys: settings ? Object.keys(settings) : [],
          });
        }
        return Promise.resolve(settings);
      } catch (error) {
        console.error("[getSettings] Failed to get settings:", error);
        return Promise.reject(error);
      }
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
    IPC_CHANNELS.rendererToMain.queries.app.getFloatingWindowsState,
    (): Promise<
      Array<{
        windowId: string;
        panelTitle: string;
        bounds: { x: number; y: number; width: number; height: number };
      }>
    > => {
      try {
        const floatingWindowsState =
          (context.appSettings.getSync("gdb.gui.floatingWindows") as Array<unknown>) || [];
        return Promise.resolve(floatingWindowsState as never);
      } catch (error) {
        console.error("Failed to get floating windows state:", error);
        return Promise.resolve([]);
      }
    },
  );

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
/**
 * Performs registerDebuggerQueryHandlers as part of this module's internal workflow.
 *
 * @param context - context parameter.
 * @returns The computed result produced by this operation.
 */

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
/**
 * Performs registerIpcQueryHandlers as part of this module's internal workflow.
 *
 * @param context - context parameter.
 * @returns The computed result produced by this operation.
 */
export function registerIpcQueryHandlers(context: IpcRegistrationContext): void {
  registerAppAndEnvironmentQueryHandlers(context);
  registerDebuggerQueryHandlers(context);
  if (context.workspaceService) {
    registerWorkspaceQueryHandlers(context, context.workspaceService);
  }
}
