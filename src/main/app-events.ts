/**
 * Implements app events for revealGDB runtime behavior.
 *
 * @remarks
 * Exported symbols include `registerAppEvents`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { App, BrowserWindow, NativeTheme } from "electron";
import { IPC_CHANNELS } from "../common/ipc-contracts";
import { multiWindowHub } from "./main";

/**
 * Registers app events for the active runtime context.
 *
 * @param appInstance - Value for `appInstance` consumed by this operation.
 * @param nativeTheme - Value for `nativeTheme` consumed by this operation.
 * @param getMainWindow - Callback invoked when the associated event occurs.
 */
/**
 * Performs registerAppEvents as part of this module's internal workflow.
 *
 * @param appInstance - appInstance parameter.
 * @param nativeTheme - nativeTheme parameter.
 * @param getMainWindow - getMainWindow parameter.
 * @returns The computed result produced by this operation.
 */
export function registerAppEvents(
  appInstance: App,
  nativeTheme: NativeTheme,
  getMainWindow: () => BrowserWindow | undefined,
): void {
  appInstance.on("did-resign-active", () => {
    const mainWindow = getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }
    mainWindow.webContents.send(IPC_CHANNELS.mainToRenderer.notifications.render, {
      command: "theme-changed",
      data: nativeTheme,
    });
  });

  appInstance.on("window-all-closed", () => {
    multiWindowHub.closeAllSecondaryWindows();

    if (process.platform !== "darwin") {
      appInstance.quit();
    }
  });

  nativeTheme.on("updated", () => {
    const mainWindow = getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }
    mainWindow.webContents.send(IPC_CHANNELS.mainToRenderer.notifications.themeChanged, {
      shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
    });
  });
}
