import { BrowserWindow } from "electron";
import { mapElectronWindowToWinPos } from "./mappers/window-pos-mapper";
import { MAIN_WINDOW_LAYOUT_PREFIX } from "./ipc/commands";
import { AppSettings } from "./main";
import { GdbAny } from "../common/gdb-common";

export type WindowInfo = {
  window: BrowserWindow;
  uniqueId?: string;
};
export class MultiWindowHub {
  private windows: WindowInfo[] = [];

  constructor() {
    // Initialize the multi-window hub
  }

  add(win: BrowserWindow, uniqueId?: string): void {
    const windowInfo: WindowInfo = { window: win, uniqueId: uniqueId };
    this.windows.push(windowInfo);
  }

  delete(uniqueId: string): void {
    this.windows = this.windows.filter((w) => w.uniqueId !== uniqueId);
  }

  closeAllSecondaryWindows(): void {
    const browserWindows = BrowserWindow.getAllWindows();
    for (const win of browserWindows) {
      const winInfo: WindowInfo | undefined = this.windows.find((w) => w.window === win);
      if (winInfo && winInfo.uniqueId) {
        win.close(); // only close secondary windows
      }
    }
  }

  saveWindowInfo(_data: GdbAny): void {
    const browserWindows = BrowserWindow.getAllWindows();

    browserWindows.forEach((win) => {
      console.log(win.title);

      let winId = "";
      const winInfo: WindowInfo | undefined = this.windows.find((w) => w.window === win);
      if (!winInfo) {
        winId = win.title;
      } else {
        winId = winInfo.uniqueId!;
      }
      const winPos = mapElectronWindowToWinPos(win);
      win.title = winId;

      AppSettings.setSync(`${MAIN_WINDOW_LAYOUT_PREFIX}${winId}.windowSize`, winPos);
      //AppSettings.setSync(`${MAIN_WINDOW_LAYOUT_PREFIX}${winId}`, data.layout);
    });
  }

  deleteUnusedLayouts(): void {
    const browserWindows = BrowserWindow.getAllWindows();
    const savedWindowLayoutRoot = AppSettings.getSync(
      `${MAIN_WINDOW_LAYOUT_PREFIX}`.slice(0, -1),
    ) as Record<string, unknown> | undefined;
    const savedKeys = Object.keys(savedWindowLayoutRoot ?? {});

    for (const key of savedKeys) {
      console.log(key);

      const foundWindow = browserWindows.find((win) => {
        return win.title === key;
      });
      if (!foundWindow) {
        AppSettings.unsetSync(`${MAIN_WINDOW_LAYOUT_PREFIX}${key}`);
        continue;
      }
    }
  }
}
