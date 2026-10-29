/**
 * Defines commands IPC handlers that bridge renderer requests to main-process behavior.
 *
 * @remarks
 * Exported symbols include `handleNotifyMain`, `registerIpcCommandHandlers`. It is responsible for channel registration, payload marshalling, and returning data to renderer callers.
 */
import { IpcMainEvent, IpcMainInvokeEvent, shell } from "electron";
import type { NormalizedConnection } from "../../common/connection-types";
import {
  DangerousCommandEntry,
  DangerousCommandResponse,
  DebuggerCommand,
  IPC_CHANNELS,
  NotifyMainRequest,
  NotifyRenderMessage,
} from "../../common/ipc-contracts";
import { setNativeThemeFromAppTheme } from "../theme-support";
import { disconnectAndResetApplication } from "../utilities/disconnect-helper";
import { debugLog } from "../utilities/logger";
import { createSecondaryWindow, loadSecondaryWindow, resolvePreloadPath } from "../window-manager";
import { onGdbCommand, onGdbControlD } from "./on-gdb-command";
import { IpcRegistrationContext } from "./types";
import { formatGeneralError } from "../utilities/html-error-formatter";
import { GeneralInfoSender } from "../utilities/GeneralInfoSender";
export { onGdbCommand } from "./on-gdb-command";

/**
 * Performs send notify render as part of this module's internal workflow.
 *
 * @remarks
 * Participates in main-process IPC wiring between renderer requests and backend services.
 *
 * @param context - Dependency container used to register handlers and access shared services.
 * @param payload - Value for `payload` consumed by this operation.
 */
/**
 * Performs sendNotifyRender as part of this module's internal workflow.
 *
 * @param context - context parameter.
 * @param payload - payload parameter.
 * @returns The computed result produced by this operation.
 */
function sendNotifyRender(context: IpcRegistrationContext, payload: NotifyRenderMessage): void {
  context
    .getMainWindow()
    .webContents.send(IPC_CHANNELS.mainToRenderer.notifications.render, payload);
}
/**
 * Performs isSafeExternalUrl as part of this module's internal workflow.
 *
 * @param value - value parameter.
 * @returns The computed result produced by this operation.
 */

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
/**
 * Performs doConnection as part of this module's internal workflow.
 *
 * @param selectedConnection - selectedConnection parameter.
 * @param context - context parameter.
 * @returns The computed result produced by this operation.
 */
function doConnection(
  selectedConnection: NormalizedConnection,
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

const GDB_GUI_PREFIX = "gdb.gui.";

/**
 * Performs handleConnectSelectedConnection as part of this module's internal workflow.
 *
 * @param msg - msg parameter.
 * @param { command - { command parameter.
 * @param context - context parameter.
 * @returns The computed result produced by this operation.
 */

function handleConnectSelectedConnection(
  msg: Extract<NotifyMainRequest, { command: "connect-selected-connection" }>,
  context: IpcRegistrationContext,
): void {
  const { connection } = msg.data;
  debugLog("Received selected connection from renderer", connection);
  if (context.isSelectedConnection(connection)) {
    doConnection(connection, context);
  } else {
    GeneralInfoSender.instance.sendHtmlBlock(
      formatGeneralError(
        "Invalid selected connection payload",
        "Malformed or unrecognized connection object provided.",
      ),
    );
  }
}
/**
 * Performs handleOpenExternal as part of this module's internal workflow.
 *
 * @param msg - msg parameter.
 * @param { command - { command parameter.
 * @returns The computed result produced by this operation.
 */

function handleOpenExternal(msg: Extract<NotifyMainRequest, { command: "open-external" }>): void {
  if (isSafeExternalUrl(msg.data)) {
    void shell.openExternal(msg.data);
  } else {
    GeneralInfoSender.instance.sendHtmlBlock(
      formatGeneralError("Open External File", "Invalid Path Provided"),
    );
  }
}
/**
 * Performs handleCancelConnection as part of this module's internal workflow.
 *
 * @param context - context parameter.
 * @returns The computed result produced by this operation.
 */

function handleCancelConnection(context: IpcRegistrationContext): void {
  const mainWindow = context.getMainWindow();
  const gdbInterface = context.getGdbInterface();

  disconnectAndResetApplication(mainWindow, gdbInterface);
}

function createDefaultSecondaryWindowTitle(uniqueId: string): string {
  return `Secondary Window ${uniqueId}`;
}

function handleNewWindow(
  msg: Extract<NotifyMainRequest, { command: "newWindow" | "new-window" }>,
  context: IpcRegistrationContext,
): void {
  const uniqueId = Date.now().toString(20);
  const requestedTitle =
    typeof msg.data?.title === "string" && msg.data.title.trim().length > 0
      ? msg.data.title.trim()
      : undefined;
  const title = requestedTitle ?? createDefaultSecondaryWindowTitle(uniqueId);
  const window = createSecondaryWindow(
    resolvePreloadPath(),
    () => context.multiWindowHub?.saveWindowInfo(null),
    title,
  );
  context.multiWindowHub?.add(window, uniqueId, title);
  loadSecondaryWindow(window);

  window.once("ready-to-show", () => {
    window.show();
  });
}

type SaveSettingsRequest = Extract<
  NotifyMainRequest,
  {
    command:
      | "save-connections"
      | "save-last-used-connection"
      | "save-app-show-debug-info"
      | "save-app-theme"
      | "save-cmd-history"
      | "save-source-viewer-theme"
      | "save-source-viewer-font-size"
      | "save-source-viewer-font-name"
      | "save-dock-layout"
      | "save-grid-columns"
      | "reset-grid-columns"
      | "save-sections-view-options"
      | "save-auto-symbol-loading";
  }
>;
/**
 * Performs handleSaveSettings as part of this module's internal workflow.
 *
 * @param msg - msg parameter.
 * @param context - context parameter.
 * @returns The computed result produced by this operation.
 */

type SaveSettingsData<K extends SaveSettingsRequest["command"]> = Extract<
  SaveSettingsRequest,
  { command: K }
>["data"];

type SaveSettingsHandler<K extends SaveSettingsRequest["command"]> = (
  data: SaveSettingsData<K>,
  context: IpcRegistrationContext,
) => void;

const saveSettingsHandlers: {
  [K in SaveSettingsRequest["command"]]: SaveSettingsHandler<K>;
} = {
  "save-connections": (data, context) => {
    context.appSettings.setSync("gdb.connections", data.connections as never);
  },
  "save-last-used-connection": (data, context) => {
    context.appSettings.setSync("gdb.lastUsedConnection", data as never);
  },
  "save-app-show-debug-info": (data, context) => {
    context.appSettings.setSync(`${GDB_GUI_PREFIX}showDebugInfo`, data as never);
  },
  "save-auto-symbol-loading": (data, context) => {
    context.appSettings.setSync(`${GDB_GUI_PREFIX}disableAutoSymbolLoading`, data as never);
  },
  "save-sections-view-options": (data, context) => {
    context.appSettings.setSync(
      `${GDB_GUI_PREFIX}sectionsView.showEmptySpace`,
      data.showEmptySpace as never,
    );
    context.appSettings.setSync(
      `${GDB_GUI_PREFIX}sectionsView.showLegend`,
      data.showLegend as never,
    );
  },
  "save-app-theme": (data, context) => {
    context.appSettings.setSync(`${GDB_GUI_PREFIX}applicationTheme`, data as never);
    setNativeThemeFromAppTheme(data);
  },
  "save-cmd-history": (data, context) => {
    context.appSettings.setSync("gdb.command.history", data as never);
  },
  "save-source-viewer-theme": (data, context) => {
    context.appSettings.setSync(`${GDB_GUI_PREFIX}sourceViewerTheme`, data as never);
  },
  "save-source-viewer-font-size": (data, context) => {
    context.appSettings.setSync(`${GDB_GUI_PREFIX}sourceViewerFontSize`, data as never);
  },
  "save-source-viewer-font-name": (data, context) => {
    context.appSettings.setSync(`${GDB_GUI_PREFIX}sourceViewerFontName`, data as never);
  },
  "save-dock-layout": (data, context) => {
    context.appSettings.setSync("gdb.gui.layouts.main.dockLayout", data as never);
    const mainWindow = context.getMainWindow();
    if (!mainWindow || (typeof mainWindow.isDestroyed === "function" && mainWindow.isDestroyed())) {
      return;
    }

    context.appSettings.setSync("gdb.gui.layouts.main.windowSize", {
      ...mainWindow.getBounds(),
      fullscreen: mainWindow.fullScreen,
    } as never);
    context.multiWindowHub?.saveWindowInfo(data as never);
  },
  "save-grid-columns": (data, context) => {
    context.appSettings.setSync(
      `${GDB_GUI_PREFIX}gridColumns.${data.gridName}`,
      data.columns as never,
    );
  },
  "reset-grid-columns": (data, context) => {
    if (data) {
      context.appSettings.unsetSync(`${GDB_GUI_PREFIX}gridColumns.${data}`);
    } else {
      context.appSettings.unsetSync(`${GDB_GUI_PREFIX}gridColumns`);
    }
  },
};

function handleSaveSettings(msg: SaveSettingsRequest, context: IpcRegistrationContext): void {
  const handler = saveSettingsHandlers[msg.command];
  if (handler) {
    handler(msg.data as never, context);
  }
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
/**
 * Performs handleNotifyMain as part of this module's internal workflow.
 *
 * @param msg - msg parameter.
 * @param context - context parameter.
 * @returns The computed result produced by this operation.
 */
export function handleNotifyMain(msg: NotifyMainRequest, context: IpcRegistrationContext): void {
  switch (msg?.command) {
    case "connect-selected-connection":
      handleConnectSelectedConnection(msg, context);
      break;
    case "cancel-connection":
      handleCancelConnection(context);
      break;
    case "newWindow":
    case "new-window":
      handleNewWindow(msg, context);
      break;
    case "command-entry":
      sendNotifyRender(context, { command: "command-entry" });
      break;
    case "open-external":
      handleOpenExternal(msg);
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
    case "secondary-window-loaded":
      debugLog("Secondary window has loaded.");
      break;
    default:
      handleSaveSettings(msg, context);
      break;
  }
}

let _dangerousCommandResolver: ((response: DangerousCommandResponse) => void) | null = null;
/**
 * Performs findMatchingDangerousCommand as part of this module's internal workflow.
 *
 * @param command - command parameter.
 * @param context - context parameter.
 * @returns The computed result produced by this operation.
 */

function findMatchingDangerousCommand(
  command: DebuggerCommand,
  context: IpcRegistrationContext,
): DangerousCommandEntry | undefined {
  if (typeof command !== "string") return undefined;
  const entries = context.appSettings.getSync("gdb.dangerousCommands") as
    | DangerousCommandEntry[]
    | undefined;
  if (!entries) return undefined;
  return entries.find((e) => command.trimStart().toLowerCase().startsWith(e.command.toLowerCase()));
}
/**
 * Performs saveDangerousCommandDefault as part of this module's internal workflow.
 *
 * @param commandPrefix - commandPrefix parameter.
 * @param answer - answer parameter.
 * @param context - context parameter.
 * @returns The computed result produced by this operation.
 */

function saveDangerousCommandDefault(
  commandPrefix: string,
  answer: "yes" | "no",
  context: IpcRegistrationContext,
): void {
  const entries =
    (context.appSettings.getSync("gdb.dangerousCommands") as DangerousCommandEntry[] | undefined) ??
    [];
  const idx = entries.findIndex((e) => e.command.toLowerCase() === commandPrefix.toLowerCase());
  if (idx >= 0) {
    entries[idx] = { ...entries[idx], defaultAnswer: answer };
  } else {
    entries.push({ command: commandPrefix, defaultAnswer: answer });
  }
  context.appSettings.setSync("gdb.dangerousCommands", entries as never);
}

/**
 * Registers ipc command handlers for the active runtime context.
 *
 * @remarks
 * Participates in main-process IPC wiring between renderer requests and backend services.
 *
 * @param context - Dependency container used to register handlers and access shared services.
 */
/**
 * Performs registerIpcCommandHandlers as part of this module's internal workflow.
 *
 * @param context - context parameter.
 * @returns The computed result produced by this operation.
 */
export function registerIpcCommandHandlers(context: IpcRegistrationContext): void {
  context.ipcMain.on(
    IPC_CHANNELS.rendererToMain.commands.app.notify,
    (_event: IpcMainEvent, msg: NotifyMainRequest) => {
      handleNotifyMain(msg, context);
    },
  );

  context.ipcMain.handle(
    IPC_CHANNELS.rendererToMain.commands.debugger.send,
    async (_event: IpcMainInvokeEvent, command: DebuggerCommand) => {
      const dangerous = findMatchingDangerousCommand(command, context);

      if (!dangerous) {
        onGdbCommand(command, context);
        return;
      }

      if (dangerous.defaultAnswer === "yes") {
        onGdbCommand(command, context);
        return;
      }

      if (dangerous.defaultAnswer === "no") {
        return;
      }

      const response = await new Promise<DangerousCommandResponse>((resolve) => {
        _dangerousCommandResolver = resolve;
        context.getMainWindow().webContents.send(IPC_CHANNELS.mainToRenderer.notifications.render, {
          command: "confirm-dangerous-command",
          data: { commandText: command, reason: dangerous.reason },
        } satisfies NotifyRenderMessage);
      });

      if (response.remember) {
        saveDangerousCommandDefault(dangerous.command, response.answer, context);
      }

      if (response.allow) {
        onGdbCommand(command, context);
      }
    },
  );

  context.ipcMain.on(
    IPC_CHANNELS.rendererSend.dangerousCommandResponse,
    (_event: IpcMainEvent, response: DangerousCommandResponse) => {
      _dangerousCommandResolver?.(response);
      _dangerousCommandResolver = null;
    },
  );

  context.ipcMain.on(IPC_CHANNELS.rendererToMain.commands.debugger.sendControlD, () => {
    onGdbControlD(context);
  });
}
