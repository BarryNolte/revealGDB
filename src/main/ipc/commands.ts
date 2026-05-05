/**
 * Defines commands IPC handlers that bridge renderer requests to main-process behavior.
 *
 * @remarks
 * Exported symbols include `onGdbCommand`, `handleNotifyMain`, `registerIpcCommandHandlers`. It is responsible for channel registration, payload marshalling, and returning data to renderer callers.
 */
import { screen, shell } from "electron";
import { GdbAny, SelectedConnection } from "../../common/gdb-common";
import { GridColumnState, GridName } from "../../common/grid-column-types";
import { IPC_CHANNELS, NotifyMainRequest, NotifyRenderMessage } from "../../common/ipc-contracts";
import { mapElectronWindowToWinPos } from "../mappers/window-pos-mapper";
import { setNativeThemeFromAppTheme } from "../theme-support";
import { GeneralInfoSender } from "../utilities/GeneralInfoSender";
import { debugLog } from "../utilities/logger";
import { WslUtilities } from "../utilities/wsl-utilities";
import { IpcRegistrationContext } from "./types";
import { HTMLTableGenerator } from "../../common/HtmlTableGenerator";

const DEBUGGER_DISCONNECTED_BANNER = "".padStart(51, "*"); //" "***************************************************";

/**
 * Performs send notify render as part of this module's internal workflow.
 *
 * @remarks
 * Participates in main-process IPC wiring between renderer requests and backend services.
 *
 * @param context - Dependency container used to register handlers and access shared services.
 * @param payload - Value for `payload` consumed by this operation.
 */
function sendNotifyRender(context: IpcRegistrationContext, payload: NotifyRenderMessage): void {
  context
    .getMainWindow()
    .webContents.send(IPC_CHANNELS.mainToRenderer.notifications.render, payload);
}

function isSafeExternalUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Performs do connection as part of this module's internal workflow.
 *
 * @remarks
 * Participates in main-process IPC wiring between renderer requests and backend services.
 *
 * @param selectedConnection - Value for `selectedConnection` consumed by this operation.
 * @param context - Dependency container used to register handlers and access shared services.
 */
function doConnection(
  selectedConnection: SelectedConnection,
  context: IpcRegistrationContext,
): void {
  const gdbInterface = context.getGdbInterface();

  // console.log(`Connecting using profile: ${selectedConnection.name} (${selectedConnection.shell})`);

  sendNotifyRender(context, { command: "connection-started" });

  const connected = gdbInterface.connect(selectedConnection);

  sendNotifyRender(context, {
    command: connected ? "connection-success" : "connection-failed",
  });
}

/**
 * Performs on gdb command as part of this module's public API.
 *
 * @remarks
 * Participates in main-process IPC wiring between renderer requests and backend services.
 *
 * @param command - Debugger command text or command descriptor to execute.
 * @param context - Dependency container used to register handlers and access shared services.
 */
export function onGdbCommand(command: string, context: IpcRegistrationContext): void {
  const gdbInterface = context.getGdbInterface();
  const defaultOptions = {
    titleHeaderBgColor: "blue",
    titleTextColor: "yellow",
    headerBgColor: "green",
    headerTextColor: "yellow",
    tdPadding: "2px",
    tdFontWeight: "bold",
    tdColor: "#000000",
    tableWidth: "auto",
    showTableHeader: false,
  };

  if (command.startsWith(".")) {
    const cmdrgx = /.(?<cmd>.*)/.exec(command);
    const cmd = cmdrgx?.groups?.cmd || "";
    switch (cmd) {
      case "db":
        {
          GeneralInfoSender.instance.addHeader("GDB State Database Dump");
          gdbInterface.gdbDB.dump().forEach((line) => GeneralInfoSender.instance.addLine(line));
          GeneralInfoSender.instance.sendOutput();
        }
        break;
      case "debug":
        {
          GeneralInfoSender.instance.addHeader("Breaking into Debugger");
          GeneralInfoSender.instance.sendOutput();
          // eslint-disable-next-line no-debugger
          debugger;
        }
        break;
      case "wsl":
        {
          const distros = WslUtilities.getWslDistributions();
          const distroData = {
            title: "WSL Distros",
            header: ["default", "name", "version", "state"],
            content: distros.map((d) => ({
              default: d.default === true ? "*" : "",
              name: d.name,
              version: d.version,
              state: d.state,
            })),
          };
          const distroOptions = { ...defaultOptions, showTableHeader: true };
          const distroTable = new HTMLTableGenerator(distroData, distroOptions);
          const distroHtml = distroTable.createTableHTML();
          GeneralInfoSender.instance.sendHtmlBlock(distroHtml);

          const sports = WslUtilities.getWslSerialPorts();
          const spData = {
            title: "WSL Serial Ports",
            header: ["col"],
            content: sports.map((s) => ({ col: s })),
          };

          const spTable = new HTMLTableGenerator(spData, defaultOptions);
          const spHtml = spTable.createTableHTML();
          GeneralInfoSender.instance.sendHtmlBlock(spHtml);
        }
        break;
      case "screen":
        {
          const allDisplays = screen.getAllDisplays();
          GeneralInfoSender.instance.addHeader("Main Window Screen Info");

          // Open a full-size window on each screen available to the device
          for (const display of allDisplays) {
            GeneralInfoSender.instance.addLine(`Screen: ${display.id}`);
            GeneralInfoSender.instance.addLine(`  Bounds: ${JSON.stringify(display.bounds)}`);
            GeneralInfoSender.instance.addLine(`  Work Area: ${JSON.stringify(display.workArea)}`);
            GeneralInfoSender.instance.addLine(`  Scale Factor: ${display.scaleFactor}`);
          }
          GeneralInfoSender.instance.sendOutput();
        }
        break;
    }
  } else {
    gdbInterface.runCommand(command);
  }
}

const GDB_GUI_PREFIX = "gdb.gui.";

function handleConnectSelectedConnection(
  msg: NotifyMainRequest,
  context: IpcRegistrationContext,
): void {
  const selectedConnection: unknown = (msg?.data as { connection?: unknown } | undefined)
    ?.connection;
  debugLog("Received selected connection from renderer", selectedConnection);
  if (context.isSelectedConnection(selectedConnection)) {
    doConnection(selectedConnection, context);
  } else {
    console.error("Invalid selected connection payload", selectedConnection);
  }
}

function handleCancelConnection(msg: NotifyMainRequest, context: IpcRegistrationContext): void {
  const mainWindow = context.getMainWindow();
  const gdbInterface = context.getGdbInterface();

  gdbInterface.disconnect();
  sendNotifyRender(context, { command: "cancel-connection" });

  gdbInterface.gdbDB.clearDatabase();
  gdbInterface.gdbDB.allDataUpdateUI();

  const lines: string[] = [
    DEBUGGER_DISCONNECTED_BANNER,
    DEBUGGER_DISCONNECTED_BANNER,
    "*             Debugger Disconnected               *",
    DEBUGGER_DISCONNECTED_BANNER,
    DEBUGGER_DISCONNECTED_BANNER,
  ];

  lines.forEach((line) =>
    mainWindow.webContents.send(IPC_CHANNELS.mainToRenderer.console.debug, line),
  );
}

function handleSaveSettings(msg: NotifyMainRequest, context: IpcRegistrationContext): void {
  const mainWindow = context.getMainWindow();
  const command = msg?.command || "";

  switch (command) {
    case "save-connections":
      context.appSettings.setSync(
        "gdb.connections",
        (msg.data as { connections?: unknown } | undefined)?.connections as never,
      );
      break;
    case "save-last-used-connection":
      context.appSettings.setSync("gdb.lastUsedConnection", msg.data as never);
      break;
    case "save-app-show-debug-info":
      context.appSettings.setSync(`${GDB_GUI_PREFIX}showDebugInfo`, msg.data as never);
      break;
    case "save-app-theme":
      context.appSettings.setSync(`${GDB_GUI_PREFIX}applicationTheme`, msg.data as never);
      setNativeThemeFromAppTheme(msg.data as string);
      break;
    case "save-cmd-history":
      context.appSettings.setSync("gdb.command.history", msg.data as never);
      break;
    case "save-source-viewer-theme":
      context.appSettings.setSync(`${GDB_GUI_PREFIX}sourceViewerTheme`, msg.data as never);
      break;
    case "save-source-viewer-font-size":
      context.appSettings.setSync(`${GDB_GUI_PREFIX}sourceViewerFontSize`, msg.data as never);
      break;
    case "save-source-viewer-font-name":
      context.appSettings.setSync(`${GDB_GUI_PREFIX}sourceViewerFontName`, msg.data as never);
      break;
    case "save-dock-layout":
      context.appSettings.setSync(`${GDB_GUI_PREFIX}dockLayout`, msg.data as never);
      context.appSettings.setSync(
        `${GDB_GUI_PREFIX}windowSize`,
        mapElectronWindowToWinPos(mainWindow),
      );
      break;
    case "save-grid-columns": {
      const { gridName, columns } = msg.data as {
        gridName: GridName;
        columns: GridColumnState[];
      };
      context.appSettings.setSync(`${GDB_GUI_PREFIX}gridColumns.${gridName}`, columns as never);
      break;
    }
    case "reset-grid-columns": {
      const resetGridName = msg.data as GridName | undefined;
      if (resetGridName) {
        context.appSettings.unsetSync(`${GDB_GUI_PREFIX}gridColumns.${resetGridName}`);
      } else {
        context.appSettings.unsetSync(`${GDB_GUI_PREFIX}gridColumns`);
      }
      break;
    }
  }
}

function handleShowSourceAt(msg: NotifyMainRequest, context: IpcRegistrationContext): void {
  const mainWindow = context.getMainWindow();
  const gdbInterface = context.getGdbInterface();
  const { fileName, line } = msg.data as { fileName: string; line: string };

  void (async () => {
    const contents = await gdbInterface.gdbDB.getSourceFileContents(fileName);
    mainWindow.webContents.send(IPC_CHANNELS.mainToRenderer.debuggerData.sourceFile, {
      fileName,
      line,
      contents,
    });
  })();
}

/**
 * Performs handle notify main as part of this module's public API.
 *
 * @remarks
 * Participates in main-process IPC wiring between renderer requests and backend services.
 *
 * @param msg - Message payload received from debugger output or renderer events.
 * @param context - Dependency container used to register handlers and access shared services.
 */
export function handleNotifyMain(msg: NotifyMainRequest, context: IpcRegistrationContext): void {
  switch (msg?.command) {
    case "connect-selected-connection":
      handleConnectSelectedConnection(msg, context);
      break;
    case "cancel-connection":
      handleCancelConnection(msg, context);
      break;
    case "command-entry":
      sendNotifyRender(context, { command: "command-entry" });
      break;
    case "open-external":
      if (isSafeExternalUrl(msg.data)) {
        void shell.openExternal(msg.data);
      } else {
        console.error("Invalid external URL payload", msg.data);
      }
      break;
    case "renderStart":
      debugLog("[startup] renderer-start");
      debugLog("Notifying GDB Interface that rendering is starting.");
      break;
    case "renderEnd":
      debugLog("[startup] renderer-end");
      debugLog("Notifying GDB Interface that rendering is complete.");
      sendNotifyRender(context, { command: "command-entry" });
      break;
    case "show-source-at":
      handleShowSourceAt(msg, context);
      break;
    default:
      handleSaveSettings(msg, context);
      break;
  }
}

/**
 * Registers ipc command handlers for the active runtime context.
 *
 * @remarks
 * Participates in main-process IPC wiring between renderer requests and backend services.
 *
 * @param context - Dependency container used to register handlers and access shared services.
 */
export function registerIpcCommandHandlers(context: IpcRegistrationContext): void {
  context.ipcMain.on(
    IPC_CHANNELS.rendererToMain.commands.app.notify,
    (_event: GdbAny, msg: NotifyMainRequest) => {
      handleNotifyMain(msg, context);
    },
  );

  context.ipcMain.on(
    IPC_CHANNELS.rendererToMain.commands.debugger.send,
    (_event: GdbAny, command: string) => {
      onGdbCommand(command, context);
    },
  );
}
