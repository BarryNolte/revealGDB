import { GdbAny, SelectedConnection } from "../../common/gdb-common";
import { IPC_CHANNELS, NotifyMainRequest, NotifyRenderMessage } from "../../common/ipc-contracts";
import { WslUtilities } from "../utilities/wsl-utilities";
import { IpcRegistrationContext } from "./types";

function sendNotifyRender(context: IpcRegistrationContext, payload: NotifyRenderMessage): void {
  context.getMainWindow().webContents.send(IPC_CHANNELS.mainToRenderer.notifyRender, payload);
}

function doConnection(
  selectedConnection: SelectedConnection,
  context: IpcRegistrationContext,
): void {
  const gdbInterface = context.getGdbInterface();

  console.log(`Connecting using profile: ${selectedConnection.name} (${selectedConnection.shell})`);

  sendNotifyRender(context, { command: "connection-started" });

  const connected = gdbInterface.connect(selectedConnection);

  sendNotifyRender(context, {
    command: connected ? "connection-success" : "connection-failed",
  });
}

export function onGdbCommand(command: string, context: IpcRegistrationContext): void {
  const mainWindow = context.getMainWindow();
  const gdbInterface = context.getGdbInterface();

  if (command.startsWith(".")) {
    const cmdrgx = /.(?<cmd>.*)/.exec(command);
    const cmd = cmdrgx?.groups?.cmd || "";
    switch (cmd) {
      case "db":
        gdbInterface.gdbDB.dump();
        break;
      case "debug":
        // eslint-disable-next-line no-debugger
        debugger;
        break;
      case "wsl": {
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
        break;
      }
      case "screen":
        console.log("*********************************************************");
        console.log("Main Window Bounds: " + JSON.stringify(mainWindow.getBounds()));
        console.log("Full Screen       : " + JSON.stringify(mainWindow.fullScreen));
        console.log("*********************************************************");
        break;
    }
  } else {
    gdbInterface.send(command);
  }
}

export function handleNotifyMain(msg: NotifyMainRequest, context: IpcRegistrationContext): void {
  const mainWindow = context.getMainWindow();
  const gdbInterface = context.getGdbInterface();

  switch (msg?.command) {
    case "connect-selected-connection": {
      const selectedConnection: unknown = (msg?.data as { connection?: unknown } | undefined)
        ?.connection;
      console.log("Received selected connection from renderer", selectedConnection);
      if (context.isSelectedConnection(selectedConnection)) {
        doConnection(selectedConnection, context);
      } else {
        console.error("Invalid selected connection payload", selectedConnection);
      }
      break;
    }
    case "cancel-connection": {
      gdbInterface.disconnect();
      sendNotifyRender(context, { command: "cancel-connection" });

      gdbInterface.gdbDB.clearDatabase();
      gdbInterface.gdbDB.allDataUpdateUI();

      const lines: string[] = [
        "***************************************************",
        "***************************************************",
        "*.............Debugger Disconnected...............*",
        "***************************************************",
        "***************************************************",
      ];

      lines.forEach((line) =>
        mainWindow.webContents.send(IPC_CHANNELS.mainToRenderer.debugMessage, line),
      );
      break;
    }
    case "save-connections":
      context.appSettings.setSync(
        "gdb.connections",
        (msg.data as { connections?: unknown } | undefined)?.connections as never,
      );
      break;
    case "save-app-show-debug-info":
      context.appSettings.setSync("gdb.gui.showDebugInfo", msg.data as never);
      break;
    case "save-app-theme":
      context.appSettings.setSync("gdb.gui.applicationTheme", msg.data as never);
      break;
    case "save-cmd-history":
      context.appSettings.setSync("gdb.command.history", msg.data as never);
      break;
    case "save-source-viewer-theme":
      context.appSettings.setSync("gdb.gui.sourceViewerTheme", msg.data as never);
      break;
    case "save-source-viewer-font-size":
      context.appSettings.setSync("gdb.gui.sourceViewerFontSize", msg.data as never);
      break;
    case "save-source-viewer-font-name":
      context.appSettings.setSync("gdb.gui.sourceViewerFontName", msg.data as never);
      break;
    case "save-main-theme":
      context.appSettings.setSync("gdb.gui.mainTheme", msg.data as never);
      break;
    case "save-dock-layout": {
      context.appSettings.setSync("gdb.gui.dockLayout", msg.data as never);

      const winPos = {
        x: mainWindow.getPosition()[0],
        y: mainWindow.getPosition()[1],
        width: mainWindow.getSize()[0] - 2,
        height: mainWindow.getSize()[1] - 2,
        fullscreen: mainWindow.fullScreen,
      };
      context.appSettings.setSync("gdb.gui.windowSize", winPos);
      break;
    }
    case "renderStart":
      console.log("Notifying GDB Interface that rendering is starting.");
      break;
    case "renderEnd":
      console.log("Notifying GDB Interface that rendering is complete.");
      sendNotifyRender(context, { command: "command-entry" });
      break;
  }
}

export function registerIpcCommandHandlers(context: IpcRegistrationContext): void {
  context.ipcMain.on(
    IPC_CHANNELS.rendererSend.notifyMain,
    (_event: GdbAny, msg: NotifyMainRequest) => {
      handleNotifyMain(msg, context);
    },
  );

  context.ipcMain.on(IPC_CHANNELS.rendererSend.gdbCommand, (_event: GdbAny, command: string) => {
    onGdbCommand(command, context);
  });
}
