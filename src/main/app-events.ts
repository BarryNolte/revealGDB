import { App, BrowserWindow, NativeTheme } from "electron";
import { IPC_CHANNELS } from "../common/ipc-contracts";

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
    mainWindow.webContents.send(IPC_CHANNELS.mainToRenderer.notifyRender, {
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
    const mainWindow = getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }
    mainWindow.webContents.send(IPC_CHANNELS.mainToRenderer.themeChanged, nativeTheme);
  });
}
