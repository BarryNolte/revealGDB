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
    mainWindow.webContents.send(IPC_CHANNELS.mainToRenderer.consoleMessage, line);
  });
  gdbInterface.on("log-stream", (line: string) => {
    mainWindow.webContents.send(IPC_CHANNELS.mainToRenderer.logMessage, line);
  });
  gdbInterface.on("error-stream", (line: string) => {
    mainWindow.webContents.send(IPC_CHANNELS.mainToRenderer.errorMessage, line);
  });
  gdbInterface.on("debug-stream", (line: string) => {
    mainWindow.webContents.send(IPC_CHANNELS.mainToRenderer.debugMessage, line);
  });

  let needToRunStartupCmds = true;
  gdbInterface.on("gdb-stopped", () => {
    if (needToRunStartupCmds) {
      needToRunStartupCmds = false;
      const ros: string[] = appSettings.getSync("gdb.run.onStartup") as string[];
      console.log("** ON STARTUP COMMANDS **");
      ros?.forEach((cmd: string) => {
        gdbInterface.send(cmd);
      });

      gdbInterface.send("echo <<<<file-info>>>>");
      gdbInterface.send("info files");
      gdbInterface.send("echo >>>>end-capture<<<<");

      gdbInterface.send("echo <<<<function-names>>>>");
      gdbInterface.send("info functions");
      gdbInterface.send("echo >>>>end-capture<<<<");
    }

    const ros: string[] = appSettings.getSync("gdb.run.onStopped") as string[];
    //console.log(`***********************\nRunning ${ros?.length} Stop Commands\n***********************`);
    ros?.forEach((cmd: string) => {
      gdbInterface.send(cmd);
    });
  });

  return gdbInterface;
}
