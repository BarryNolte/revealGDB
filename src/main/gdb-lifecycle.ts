/**
 * Implements gdb lifecycle for revealGDB runtime behavior.
 *
 * @remarks
 * Exported symbols include `createGdbInterface`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { BrowserWindow } from "electron";
import { IPC_CHANNELS } from "../common/ipc-contracts";
import { miInterface } from "./mi-interface/mi-interface";
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
export function createGdbInterface(
  mainWindow: BrowserWindow,
  _appSettings: SettingsLike,
): miInterface {
  const gdbInterface = new miInterface();
  gdbInterface.on("console-stream", (line: string) => {
    mainWindow.webContents.send(IPC_CHANNELS.mainToRenderer.console.message, line);
  });
  gdbInterface.on("log-stream", (line: string) => {
    mainWindow.webContents.send(IPC_CHANNELS.mainToRenderer.console.log, line);
  });
  gdbInterface.on("error-stream", (line: string) => {
    mainWindow.webContents.send(IPC_CHANNELS.mainToRenderer.console.error, line);
  });
  gdbInterface.on("debug-stream", (line: string) => {
    mainWindow.webContents.send(IPC_CHANNELS.mainToRenderer.console.debug, line);
  });
  gdbInterface.on("html-stream", (html: string) => {
    mainWindow.webContents.send(IPC_CHANNELS.mainToRenderer.console.html, html);
  });
  GeneralInfoSender.instance.setRelayTarget(gdbInterface);

  let needToRunStartupCmds = true;
  gdbInterface.on("gdb-stopped", () => {
    if (needToRunStartupCmds) {
      needToRunStartupCmds = false;

      gdbInterface.onStartup.forEach((cmd: string) => {
        gdbInterface.runCommand(cmd);
      });

      gdbInterface.runCommand("echo <<<<file-info>>>>");
      gdbInterface.runCommand("info files");
      gdbInterface.runCommand("echo >>>>end-capture<<<<");

      gdbInterface.runCommand("echo <<<<function-names>>>>");
      gdbInterface.runCommand("info functions");
      gdbInterface.runCommand("echo >>>>end-capture<<<<");
    }

    gdbInterface.onStopped.forEach((cmd: string) => {
      gdbInterface.runCommand(cmd);
    });
  });

  return gdbInterface;
}
