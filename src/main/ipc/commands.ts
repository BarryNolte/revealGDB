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
import { GeneralInfoSender } from "../utilities/GeneralInfoSender";
import { formatGeneralError } from "../utilities/html-error-formatter";
import { debugLog } from "../utilities/logger";
import { onGdbCommand, onGdbControlD } from "./on-gdb-command";
import { IpcRegistrationContext } from "./types";
import { registerWorkspaceCommandHandlers } from "./workspace";
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
      | "save-floating-windows-state"
      | "save-grid-columns"
      | "reset-grid-columns"
      | "save-sections-view-options"
      | "save-auto-symbol-loading"
      | "save-workspace"
      | "workspace-create-host"
      | "workspace-delete-host"
      | "workspace-move-pane"
      | "workspace-save-host-layout"
      | "workspace-open-host";
  }
>;
/**
 * Performs handleSaveSettings as part of this module's internal workflow.
 *
 * @param msg - msg parameter.
 * @param context - context parameter.
 * @returns The computed result produced by this operation.
 */

function handleConnectionSettings(msg: SaveSettingsRequest, context: IpcRegistrationContext): void {
  switch (msg.command) {
    case "save-connections":
      context.appSettings.setSync("gdb.connections", msg.data.connections as never);
      break;
    case "save-last-used-connection":
      context.appSettings.setSync("gdb.lastUsedConnection", msg.data as never);
      break;
  }
}

function handleAppearanceSettings(msg: SaveSettingsRequest, context: IpcRegistrationContext): void {
  switch (msg.command) {
    case "save-app-show-debug-info":
      context.appSettings.setSync(`${GDB_GUI_PREFIX}showDebugInfo`, msg.data as never);
      break;
    case "save-auto-symbol-loading":
      context.appSettings.setSync(`${GDB_GUI_PREFIX}disableAutoSymbolLoading`, msg.data as never);
      break;
    case "save-app-theme":
      context.appSettings.setSync(`${GDB_GUI_PREFIX}applicationTheme`, msg.data as never);
      setNativeThemeFromAppTheme(msg.data);
      break;
  }
}

function handleSourceViewerSettings(
  msg: SaveSettingsRequest,
  context: IpcRegistrationContext,
): void {
  switch (msg.command) {
    case "save-source-viewer-theme":
      context.appSettings.setSync(`${GDB_GUI_PREFIX}sourceViewerTheme`, msg.data as never);
      break;
    case "save-source-viewer-font-size":
      context.appSettings.setSync(`${GDB_GUI_PREFIX}sourceViewerFontSize`, msg.data as never);
      break;
    case "save-source-viewer-font-name":
      context.appSettings.setSync(`${GDB_GUI_PREFIX}sourceViewerFontName`, msg.data as never);
      break;
  }
}

function handleGridSettings(msg: SaveSettingsRequest, context: IpcRegistrationContext): void {
  switch (msg.command) {
    case "save-grid-columns":
      context.appSettings.setSync(
        `${GDB_GUI_PREFIX}gridColumns.${msg.data.gridName}`,
        msg.data.columns as never,
      );
      break;
    case "reset-grid-columns":
      if (msg.data) {
        context.appSettings.unsetSync(`${GDB_GUI_PREFIX}gridColumns.${msg.data}`);
      } else {
        context.appSettings.unsetSync(`${GDB_GUI_PREFIX}gridColumns`);
      }
      break;
  }
}

function handleLayoutSettings(msg: SaveSettingsRequest, context: IpcRegistrationContext): void {
  switch (msg.command) {
    case "save-dock-layout": {
      // Legacy no-op: authoritative dock layout persistence lives in workspace.saveHostLayout.
      break;
    }
    case "save-floating-windows-state":
      context.appSettings.setSync(`${GDB_GUI_PREFIX}floatingWindows`, msg.data as never);
      break;
  }
}

function handleSaveSettings(msg: SaveSettingsRequest, context: IpcRegistrationContext): void {
  // Use a map-based dispatch to reduce complexity
  const connectionCommands = new Set(["save-connections", "save-last-used-connection"]);
  const appearanceCommands = new Set([
    "save-app-show-debug-info",
    "save-auto-symbol-loading",
    "save-app-theme",
  ]);
  const sourceViewerCommands = new Set([
    "save-source-viewer-theme",
    "save-source-viewer-font-size",
    "save-source-viewer-font-name",
  ]);
  const gridCommands = new Set(["save-grid-columns", "reset-grid-columns"]);
  const layoutCommands = new Set(["save-dock-layout", "save-floating-windows-state"]);
  const workspaceCommands = new Set([
    "workspace-create-host",
    "workspace-delete-host",
    "workspace-move-pane",
    "workspace-save-host-layout",
    "workspace-open-host",
  ]);

  if (connectionCommands.has(msg.command)) {
    handleConnectionSettings(msg, context);
  } else if (appearanceCommands.has(msg.command)) {
    handleAppearanceSettings(msg, context);
  } else if (sourceViewerCommands.has(msg.command)) {
    handleSourceViewerSettings(msg, context);
  } else if (gridCommands.has(msg.command)) {
    handleGridSettings(msg, context);
  } else if (layoutCommands.has(msg.command)) {
    handleLayoutSettings(msg, context);
  } else if (workspaceCommands.has(msg.command)) {
    // Workspace commands are handled through IPC handlers in workspace.ts
    // These notification messages should be routed through the workspaceService instead
    debugLog(`Workspace command received through notification channel: ${msg.command}`);
  } else if (msg.command === "save-cmd-history") {
    context.appSettings.setSync("gdb.command.history", msg.data as never);
  } else if (msg.command === "save-sections-view-options") {
    const data = msg.data as { showEmptySpace: unknown; showLegend: unknown };
    context.appSettings.setSync(
      `${GDB_GUI_PREFIX}sectionsView.showEmptySpace`,
      data.showEmptySpace as never,
    );
    context.appSettings.setSync(
      `${GDB_GUI_PREFIX}sectionsView.showLegend`,
      data.showLegend as never,
    );
  } else if (msg.command === "save-workspace") {
    context.appSettings.setSync(`${GDB_GUI_PREFIX}workspace`, msg.data as never);
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
    case "connections-dialog":
      sendNotifyRender(context, { command: "connections-dialog" });
      break;
    case "connect-selected-connection":
      handleConnectSelectedConnection(msg, context);
      break;
    case "cancel-connection":
      handleCancelConnection(context);
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
 * Registers app-level commands
 *
 * @param context - IPC registration context
 */
function registerAppCommands(context: IpcRegistrationContext): void {
  context.ipcMain.on(
    IPC_CHANNELS.rendererToMain.commands.app.notify,
    (_event: IpcMainEvent, msg: NotifyMainRequest) => {
      handleNotifyMain(msg, context);
    },
  );

  context.ipcMain.on(
    IPC_CHANNELS.rendererSend.appLog,
    (_event: IpcMainEvent, payload: { message: string }) => {
      console.log(payload.message);
    },
  );
}

/**
 * Registers debugger commands
 *
 * @param context - IPC registration context
 */
function registerDebuggerCommands(context: IpcRegistrationContext): void {
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

/**
 * Performs registerIpcCommandHandlers as part of this module's internal workflow.
 *
 * @param context - context parameter.
 * @returns The computed result produced by this operation.
 */
export function registerIpcCommandHandlers(context: IpcRegistrationContext): void {
  registerAppCommands(context);
  registerDebuggerCommands(context);

  if (context.workspaceService) {
    registerWorkspaceCommandHandlers(context, context.workspaceService);
  }
}
