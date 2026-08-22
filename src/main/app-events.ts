/**
 * Implements app events for revealGDB runtime behavior.
 *
 * @remarks
 * Exported symbols include `registerAppEvents`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { App, BrowserWindow, NativeTheme } from "electron";
import { IPC_CHANNELS } from "../common/ipc-contracts";

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
  getSecondaryWindows: () => BrowserWindow[] = () => [],
): void {
  const broadcastToWindows = (channel: string, payload: unknown): void => {
    const windows = [getMainWindow(), ...getSecondaryWindows()].filter(
      (window): window is BrowserWindow => !!window && !window.isDestroyed(),
    );

    windows.forEach((window) => {
      window.webContents.send(channel, payload);
    });
  };

  appInstance.on("did-resign-active", () => {
    broadcastToWindows(IPC_CHANNELS.mainToRenderer.notifications.render, {
      command: "theme-changed",
      data: nativeTheme,
    });
  });

  appInstance.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      appInstance.quit();
    }
  });

  nativeTheme.on("updated", () => {
    broadcastToWindows(IPC_CHANNELS.mainToRenderer.notifications.themeChanged, {
      shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
    });
  });
}
