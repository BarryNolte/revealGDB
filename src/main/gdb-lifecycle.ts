import { BrowserWindow } from "electron";
import { IPC_CHANNELS } from "../common/ipc-contracts";
import { miInterface } from "./mi-interface/mi-interface";

type SettingsLike = {
  getSync: (key: string) => unknown;
};

export function createGdbInterface(
  mainWindow: BrowserWindow,
  appSettings: SettingsLike,
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

  let needToRunStartupCmds = true;
  gdbInterface.on("gdb-stopped", () => {
    if (needToRunStartupCmds) {
      needToRunStartupCmds = false;
      const ros: string[] = appSettings.getSync("gdb.run.onStartup") as string[];
      console.log("** ON STARTUP COMMANDS **");
      ros?.forEach((cmd: string) => {
        gdbInterface.runCommand(cmd);
      });

      gdbInterface.runCommand("echo <<<<file-info>>>>");
      gdbInterface.runCommand("info files");
      gdbInterface.runCommand("echo >>>>end-capture<<<<");

      gdbInterface.runCommand("echo <<<<function-names>>>>");
      gdbInterface.runCommand("info functions");
      gdbInterface.runCommand("echo >>>>end-capture<<<<");
    }

    const ros: string[] = appSettings.getSync("gdb.run.onStopped") as string[];
    //console.log(`***********************\nRunning ${ros?.length} Stop Commands\n***********************`);
    ros?.forEach((cmd: string) => {
      gdbInterface.runCommand(cmd);
    });
  });

  return gdbInterface;
}
