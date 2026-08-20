/**
 * Defines commands IPC handlers that bridge renderer requests to main-process behavior.
 *
 * @remarks
 * Exported symbols include `handleNotifyMain`, `registerIpcCommandHandlers`. It is responsible for channel registration, payload marshalling, and returning data to renderer callers.
 */
import { IpcMainEvent, IpcMainInvokeEvent, shell } from "electron";
import { join } from "path";
import type { NormalizedConnection } from "../../common/connection-types";
import {
  DangerousCommandEntry,
  DangerousCommandResponse,
  DebuggerCommand,
  IPC_CHANNELS,
  NotifyMainRequest,
  NotifyRenderMessage,
} from "../../common/ipc-contracts";
import type { DockHostLayout } from "../../common/workspace-types";
import { setNativeThemeFromAppTheme } from "../theme-support";
import { disconnectAndResetApplication } from "../utilities/disconnect-helper";
import { GeneralInfoSender } from "../utilities/GeneralInfoSender";
import { formatGeneralError } from "../utilities/html-error-formatter";
import { debugLog } from "../utilities/logger";
import { WorkspaceService } from "../workspaceService";
import { onGdbCommand, onGdbControlD } from "./on-gdb-command";
import { IpcRegistrationContext } from "./types";
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

  if (!connected) {
    sendNotifyRender(context, { command: "connection-failed" });
  }
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
      | "save-grid-columns"
      | "reset-grid-columns"
      | "save-sections-view-options"
      | "save-auto-symbol-loading"
      | "save-window-bounds";
  }
>;
/**
 * Performs handleSaveSettings as part of this module's internal workflow.
 *
 * @param msg - msg parameter.
 * @param context - context parameter.
 * @returns The computed result produced by this operation.
 */

function handleSaveSettings(msg: SaveSettingsRequest, context: IpcRegistrationContext): void {
  switch (msg.command) {
    case "save-connections":
      context.appSettings.setSync("gdb.connections", msg.data.connections as never);
      break;
    case "save-last-used-connection":
      context.appSettings.setSync("gdb.lastUsedConnection", msg.data as never);
      break;
    case "save-app-show-debug-info":
      context.appSettings.setSync(`${GDB_GUI_PREFIX}showDebugInfo`, msg.data as never);
      break;
    case "save-auto-symbol-loading":
      context.appSettings.setSync(`${GDB_GUI_PREFIX}disableAutoSymbolLoading`, msg.data as never);
      break;
    case "save-sections-view-options":
      context.appSettings.setSync(
        `${GDB_GUI_PREFIX}sectionsView.showEmptySpace`,
        msg.data.showEmptySpace as never,
      );
      context.appSettings.setSync(
        `${GDB_GUI_PREFIX}sectionsView.showLegend`,
        msg.data.showLegend as never,
      );
      break;
    case "save-app-theme":
      context.appSettings.setSync(`${GDB_GUI_PREFIX}applicationTheme`, msg.data as never);
      setNativeThemeFromAppTheme(msg.data);
      break;
    case "save-dock-layout":
      context.appSettings.setSync(`${GDB_GUI_PREFIX}dockLayout`, msg.data as never);
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
    case "save-window-bounds":
      context.appSettings.setSync(`${GDB_GUI_PREFIX}windowSize.x`, msg.data.x as never);
      context.appSettings.setSync(`${GDB_GUI_PREFIX}windowSize.y`, msg.data.y as never);
      context.appSettings.setSync(`${GDB_GUI_PREFIX}windowSize.width`, msg.data.width as never);
      context.appSettings.setSync(`${GDB_GUI_PREFIX}windowSize.height`, msg.data.height as never);
      context.appSettings.setSync(
        `${GDB_GUI_PREFIX}windowSize.fullscreen`,
        msg.data.fullscreen as never,
      );
      break;
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
 * Registers the saveHostLayout workspace command handler.
 *
 * @param context - IPC registration context with workspace persistence.
 */
function registerSaveHostLayoutHandler(context: IpcRegistrationContext): void {
  context.ipcMain.handle(
    IPC_CHANNELS.rendererToMain.commands.workspace?.saveHostLayout || "workspace:saveHostLayout",
    (_event: IpcMainInvokeEvent, hostId: string, layout: DockHostLayout): Promise<void> => {
      return Promise.resolve().then(() => {
        try {
          if (
            !context.workspacePersistence ||
            !context.getWorkspaceState ||
            !context.setWorkspaceState
          ) {
            console.warn("[workspace-commands] Workspace persistence not available");
            return;
          }

          const currentState = context.getWorkspaceState();
          if (!currentState) {
            console.warn("[workspace-commands] No current workspace state");
            return;
          }

          // Update layout for host
          const updatedState = WorkspaceService.setHostLayout(currentState, hostId, layout);
          context.workspacePersistence.save(updatedState);
          context.setWorkspaceState(updatedState);
          debugLog(`[workspace] Saved layout for host: ${hostId}`);
        } catch (error) {
          console.error("[workspace-commands] Failed to save host layout:", error);
          throw error;
        }
      });
    },
  );
}

/**
 * Registers the createNewDockWindow workspace command handler.
 *
 * @param context - IPC registration context with workspace persistence.
 */
function registerCreateNewDockWindowHandler(context: IpcRegistrationContext): void {
  context.ipcMain.handle(
    IPC_CHANNELS.rendererToMain.commands.workspace?.createNewDockWindow ||
      "workspace:createNewDockWindow",
    (_event: IpcMainInvokeEvent): Promise<string | null> => {
      return Promise.resolve().then(() => {
        try {
          if (
            !context.windowManager ||
            !context.workspacePersistence ||
            !context.getWorkspaceState ||
            !context.setWorkspaceState
          ) {
            console.warn("[workspace-commands] Required context not available");
            return null;
          }

          const currentState = context.getWorkspaceState();
          if (!currentState) {
            console.warn("[workspace-commands] No current workspace state");
            return null;
          }

          // Create new host (returns updated state with new host added)
          const updatedState = WorkspaceService.createHost(currentState);
          const newHost = updatedState.hosts[updatedState.hosts.length - 1];

          // Persist the updated state
          context.workspacePersistence.save(updatedState);

          // Update in-memory state
          context.setWorkspaceState(updatedState);

          // Create the new window
          const newWindow = context.windowManager.createDockWindow(newHost);

          // Get the base URL to load
          let baseUrl = process.env.ELECTRON_RENDERER_URL;
          if (!baseUrl) {
            baseUrl = `file://${join(__dirname, "..", "..", "out", "renderer", "index.html")}`;
          }

          // Load the URL with host parameter
          context.windowManager.loadDockWindowUrl(newWindow, newHost.id, baseUrl);

          // Show the window
          newWindow.show();

          debugLog(`[workspace] Created new dock window for host: ${newHost.id}`);

          return newHost.id;
        } catch (error) {
          console.error("[workspace-commands] Failed to create dock window:", error);
          throw error;
        }
      });
    },
  );
}

/**
 * Registers the moveWindowToHost workspace command handler.
 *
 * @param context - IPC registration context with workspace persistence.
 */
function registerMoveWindowToHostHandler(context: IpcRegistrationContext): void {
  context.ipcMain.handle(
    IPC_CHANNELS.rendererToMain.commands.workspace?.moveWindowToHost ||
      "workspace:moveWindowToHost",
    (_event: IpcMainInvokeEvent, windowId: string, targetHostId: string): Promise<void> => {
      return Promise.resolve().then(() => {
        try {
          if (
            !context.workspacePersistence ||
            !context.getWorkspaceState ||
            !context.setWorkspaceState
          ) {
            console.warn("[workspace-commands] Workspace persistence not available");
            return;
          }

          const currentState = context.getWorkspaceState();
          if (!currentState) {
            console.warn("[workspace-commands] No current workspace state");
            return;
          }

          // Move window between hosts
          const updatedState = WorkspaceService.moveWindowToHost(currentState, {
            windowId,
            targetHostId,
          });
          context.workspacePersistence.save(updatedState);
          context.setWorkspaceState(updatedState);
          debugLog(`[workspace] Moved window ${windowId} to host ${targetHostId}`);
        } catch (error) {
          console.error("[workspace-commands] Failed to move window to host:", error);
          throw error;
        }
      });
    },
  );
}

/**
 * Registers workspace-related command handlers.
 *
 * @param context - IPC registration context with workspace persistence.
 */
function registerWorkspaceCommandHandlers(context: IpcRegistrationContext): void {
  registerSaveHostLayoutHandler(context);
  registerCreateNewDockWindowHandler(context);
  registerMoveWindowToHostHandler(context);
}

/**
 * Performs registerIpcCommandHandlers as part of this module's internal workflow.
 *
 * @param context - context parameter.
 * @returns The computed result produced by this operation.
 */
export function registerIpcCommandHandlers(context: IpcRegistrationContext): void {
  if (context.workspacePersistence || context.getWorkspaceState) {
    registerWorkspaceCommandHandlers(context);
  }
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
