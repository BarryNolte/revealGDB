/**
 * Shared connection teardown helper for main-process disconnect flows.
 *
 * @remarks
 * Keeps UI-triggered disconnects and unexpected process-end disconnects on the same cleanup path.
 */
import { BrowserWindow } from "electron";
import { IPC_CHANNELS } from "../../common/ipc-contracts";
import { miInterface } from "../mi-interface/mi-interface";

const DEBUGGER_DISCONNECTED_BANNER = "".padStart(51, "*");

/**
 * Performs the full disconnect cleanup sequence used by the application.
 *
 * @param mainWindow - Main BrowserWindow used for renderer notifications.
 * @param gdbInterface - Active debugger interface to disconnect and reset.
 */
export function disconnectAndResetApplication(
  mainWindow: BrowserWindow,
  gdbInterface: miInterface,
): void {
  gdbInterface.disconnect();
  gdbInterface.gdbDB.clearDatabase();
  gdbInterface.gdbDB.allDataUpdateUI();

  mainWindow.webContents.send(IPC_CHANNELS.mainToRenderer.notifications.render, {
    command: "cancel-connection",
  });

  [
    DEBUGGER_DISCONNECTED_BANNER,
    DEBUGGER_DISCONNECTED_BANNER,
    "*             Debugger Disconnected               *",
    DEBUGGER_DISCONNECTED_BANNER,
    DEBUGGER_DISCONNECTED_BANNER,
  ].forEach((line) => mainWindow.webContents.send(IPC_CHANNELS.mainToRenderer.console.debug, line));
}
