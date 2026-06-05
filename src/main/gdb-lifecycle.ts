/**
 * Implements gdb lifecycle for revealGDB runtime behavior.
 *
 * @remarks
 * Exported symbols include `createGdbInterface`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { BrowserWindow } from "electron";
import path from "path";
import { IPC_CHANNELS } from "../common/ipc-contracts";
import { miInterface } from "./mi-interface/mi-interface";
import {
  CONSOLE_STREAM,
  DEBUG_STREAM,
  ERROR_STREAM,
  HTML_STREAM,
  LOG_STREAM,
} from "./mi-interface/mi-stream-events";
import { disconnectAndResetApplication } from "./utilities/disconnect-helper";
import { GeneralInfoSender } from "./utilities/GeneralInfoSender";

export type SettingsLike = {
  getSync: (key: string) => unknown;
};

/**
 * Creates gdb interface for downstream use.
 *
 * @param mainWindow - Value for `mainWindow` consumed by this operation.
 * @param _appSettings - Value for `appSettings` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
/**
 * Performs createGdbInterface as part of this module's internal workflow.
 *
 * @param mainWindow - mainWindow parameter.
 * @param _appSettings - _appSettings parameter.
 * @returns The computed result produced by this operation.
 */
export function createGdbInterface(
  mainWindow: BrowserWindow,
  _appSettings: SettingsLike,
): miInterface {
  const gdbInterface = new miInterface();

  gdbInterface.gdbDB.gdbSrcFileCache.on("first-read", (file: string) => {
    const disableAutoSymbolLoading = _appSettings.getSync("gdb.gui.disableAutoSymbolLoading");
    if (!disableAutoSymbolLoading && !gdbInterface.gdbDB.hasLineVars(file)) {
      gdbInterface.runCommand(
        `echo <<<<line-vars>>>>\nmaint print symbols -source ${path.basename(file)}\necho >>>>end-capture<<<<`,
      );
    }
  });

  gdbInterface.on(CONSOLE_STREAM, (line: string) => {
    mainWindow.webContents.send(IPC_CHANNELS.mainToRenderer.console.message, line);
  });
  gdbInterface.on(LOG_STREAM, (line: string) => {
    mainWindow.webContents.send(IPC_CHANNELS.mainToRenderer.console.log, line);
  });
  gdbInterface.on(ERROR_STREAM, (line: string) => {
    mainWindow.webContents.send(IPC_CHANNELS.mainToRenderer.console.error, line);
  });
  gdbInterface.on(DEBUG_STREAM, (line: string) => {
    mainWindow.webContents.send(IPC_CHANNELS.mainToRenderer.console.debug, line);
  });
  gdbInterface.on(HTML_STREAM, (html: string) => {
    mainWindow.webContents.send(IPC_CHANNELS.mainToRenderer.console.html, html);
  });
  gdbInterface.on("gdb-end", () => {
    disconnectAndResetApplication(mainWindow, gdbInterface);
  });
  GeneralInfoSender.instance.setRelayTarget(gdbInterface);

  let needToRunStartupCmds = true;
  gdbInterface.on("gdb-stopped", () => {
    if (needToRunStartupCmds) {
      needToRunStartupCmds = false;

      gdbInterface.onStartup.forEach((cmd: string) => {
        gdbInterface.runCommand(cmd);
      });

      gdbInterface.runCommand(
        "echo <<<<file-info>>>>\ninfo files\nmaint info sections\necho >>>>end-capture<<<<",
      );
      gdbInterface.runCommand(
        "echo <<<<function-names>>>>\ninfo functions\necho >>>>end-capture<<<<",
      );
    }

    gdbInterface.onStopped.forEach((cmd: string) => {
      gdbInterface.runCommand(cmd);
    });
  });

  return gdbInterface;
}
