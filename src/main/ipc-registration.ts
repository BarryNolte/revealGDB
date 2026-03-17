import { BrowserWindow, IpcMain } from "electron";
import settings from "electron-settings";
import { GdbAny, SelectedConnection } from "../common/gdb-common";
import { gdbFunction } from "./mi-interface/gdb-state-database/gdbStateDatabase";
import { miInterface } from "./mi-interface/mi-interface";
import { WslUtilities, type WslDistro } from "./utilities/wsl-utilities";

type IsSelectedConnection = (value: unknown) => value is SelectedConnection;

export type IpcRegistrationContext = {
  ipcMain: IpcMain;
  appSettings: typeof settings;
  fontList: Map<string, string>;
  gdbAppInfo: Map<string, GdbAny>;
  getMainWindow: () => BrowserWindow;
  getGdbInterface: () => miInterface;
  isSelectedConnection: IsSelectedConnection;
};

function doConnection(
  selectedConnection: SelectedConnection,
  context: IpcRegistrationContext,
): void {
  const mainWindow = context.getMainWindow();
  const gdbInterface = context.getGdbInterface();

  console.log(`Connecting using profile: ${selectedConnection.name} (${selectedConnection.shell})`);

  // Don't connect until the UI is ready to recieve updates.
  mainWindow.webContents.send("notify-render", {
    command: "connection-started",
  });

  const connected = gdbInterface.connect(selectedConnection);

  if (connected) {
    mainWindow.webContents.send("notify-render", {
      command: "connection-success",
    });
  } else {
    mainWindow.webContents.send("notify-render", {
      command: "connection-failed",
    });
  }
}

function onGdbCommand(command: string, context: IpcRegistrationContext): void {
  const mainWindow = context.getMainWindow();
  const gdbInterface = context.getGdbInterface();

  // DOT commands, good for debugging, etc.
  if (command.startsWith(".")) {
    const cmdrgx = /.(?<cmd>.*)/.exec(command);
    const cmd = cmdrgx?.groups?.cmd || "";
    switch (cmd) {
      case "db":
        {
          gdbInterface.gdbDB.dump();
        }
        break;
      case "debug":
        {
          // eslint-disable-next-line no-debugger
          debugger;
        }
        break;
      case "wsl":
        {
          const distros = WslUtilities.getWslDistrobutions();
          console.log("*********************************************************");
          console.log("WSL Distros");
          console.log("*********************************************************");
          console.log(distros);
          console.log("*********************************************************");

          const sports = WslUtilities.getWslSerialPorts();
          console.log("*********************************************************");
          console.log("WSL Serial Ports");
          console.log("*********************************************************");
          console.log(sports);
          console.log("*********************************************************");
        }
        break;
      case "screen":
        {
          console.log("*********************************************************");
          console.log("Main Window Bounds: " + JSON.stringify(mainWindow.getBounds()));
          console.log("Full Screen       : " + JSON.stringify(mainWindow.fullScreen));
          console.log("*********************************************************");
        }
        break;
    }
  } else {
    gdbInterface.send(command);
  }
}

export function registerIpcHandlers(context: IpcRegistrationContext): void {
  context.ipcMain.handle("getSettings", (): string[] => {
    return context.appSettings.getSync("gdb") as string[];
  });

  context.ipcMain.handle("getSystemFonts", (): Promise<string[]> => {
    return Promise.resolve(context.fontList.keys().toArray());
  });

  context.ipcMain.handle("getVersionInfo", (): Promise<Map<string, GdbAny>> => {
    return Promise.resolve(context.gdbAppInfo);
  });

  context.ipcMain.handle("getWslDistrobutions", (): Promise<WslDistro[]> => {
    try {
      return Promise.resolve(WslUtilities.getWslDistrobutions());
    } catch (error) {
      console.error("Failed to get WSL distributions", error);
      return Promise.resolve([]);
    }
  });

  context.ipcMain.handle("getFunctionNames", (): Promise<gdbFunction[]> => {
    return Promise.resolve(context.getGdbInterface().gdbDB.getAllFunctionNames());
  });

  // General messages from the UI
  context.ipcMain.on("notify-main", (_event: GdbAny, msg: GdbAny) => {
    const mainWindow = context.getMainWindow();
    const gdbInterface = context.getGdbInterface();

    switch (msg?.command) {
      case "connect-selected-connection":
        {
          const selectedConnection: unknown = msg?.data?.connection;
          console.log("Received selected connection from renderer", selectedConnection);
          if (context.isSelectedConnection(selectedConnection)) {
            doConnection(selectedConnection, context);
          } else {
            console.error("Invalid selected connection payload", selectedConnection);
          }
        }
        break;
      case "cancel-connection":
        {
          gdbInterface.disconnect();
          mainWindow.webContents.send("notify-render", {
            command: "cancel-connection",
          });

          gdbInterface.gdbDB.clearDatabase();
          gdbInterface.gdbDB.allDataUpdateUI();

          const lines: string[] = [];
          lines.push("***************************************************");
          lines.push("***************************************************");
          lines.push("*.............Debugger Disconnected...............*");
          lines.push("***************************************************");
          lines.push("***************************************************");

          lines.forEach((line) => mainWindow.webContents.send("debug-message", line));
        }
        break;
      case "save-connections":
        {
          context.appSettings.setSync("gdb.connections", msg.data.connections);
        }
        break;
      case "save-app-show-debug-info":
        {
          context.appSettings.setSync("gdb.gui.showDebugInfo", msg.data);
        }
        break;
      case "save-app-theme":
        {
          context.appSettings.setSync("gdb.gui.applicationTheme", msg.data);
        }
        break;
      case "save-cmd-history":
        {
          context.appSettings.setSync("gdb.command.history", msg.data);
        }
        break;
      case "save-source-viewer-theme":
        {
          context.appSettings.setSync("gdb.gui.sourceViewerTheme", msg.data);
        }
        break;
      case "save-source-viewer-font-size":
        {
          context.appSettings.setSync("gdb.gui.sourceViewerFontSize", msg.data);
        }
        break;
      case "save-source-viewer-font-name":
        {
          context.appSettings.setSync("gdb.gui.sourceViewerFontName", msg.data);
        }
        break;
      case "save-main-theme":
        {
          context.appSettings.setSync("gdb.gui.mainTheme", msg.data);
        }
        break;
      case "save-dock-layout":
        {
          context.appSettings.setSync("gdb.gui.dockLayout", msg.data);

          const winPos = {
            x: mainWindow.getPosition()[0],
            y: mainWindow.getPosition()[1],
            width: mainWindow.getSize()[0] - 2,
            height: mainWindow.getSize()[1] - 2,
            fullscreen: mainWindow.fullScreen,
          };
          context.appSettings.setSync("gdb.gui.windowSize", winPos);
        }
        break;
      case "renderStart":
        {
          console.log("Notifying GDB Interface that rendering is starting.");
        }
        break;
      case "renderEnd":
        {
          console.log("Notifying GDB Interface that rendering is complete.");
          mainWindow.webContents.send("notify-render", {
            command: "command-entry",
          });
        }
        break;
    }
  });

  context.ipcMain.on("gdb-command", (_event: GdbAny, command: string) => {
    onGdbCommand(command, context);
  });
}
