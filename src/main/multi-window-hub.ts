import { BrowserWindow } from "electron";
import { mapElectronWindowToWinPos } from "./mappers/window-pos-mapper";
import { MAIN_WINDOW_LAYOUT_PREFIX } from "./layout-keys";
import { GdbAny } from "../common/gdb-common";
import type { AppSettingsLike } from "./app-settings";

export const MAIN_WINDOW_UNIQUE_ID = "main";
export const DEVTOOLS_WINDOW_UNIQUE_ID = "devtools";

export type WindowInfo = {
  window: BrowserWindow;
  uniqueId?: string;
  title?: string;
};
export class MultiWindowHub {
  private windows: WindowInfo[] = [];
  private readonly appSettings: AppSettingsLike;

  constructor(appSettings: AppSettingsLike) {
    this.appSettings = appSettings;
  }

  add(win: BrowserWindow, uniqueId?: string, title?: string): void {
    const windowInfo: WindowInfo = { window: win, uniqueId: uniqueId, title: title };
    this.windows.push(windowInfo);
  }

  delete(uniqueId: string): void {
    this.windows = this.windows.filter((w) => w.uniqueId !== uniqueId);
  }

  closeAllSecondaryWindows(): void {
    const browserWindows = BrowserWindow.getAllWindows();
    for (const win of browserWindows) {
      const winInfo: WindowInfo | undefined = this.windows.find((w) => w.window === win);
      if (
        winInfo?.uniqueId &&
        winInfo.uniqueId !== MAIN_WINDOW_UNIQUE_ID &&
        winInfo.uniqueId !== DEVTOOLS_WINDOW_UNIQUE_ID
      ) {
        win.close(); // only close secondary windows, not the main or devtools windows
      }
    }
  }

  saveWindowInfo(_data: GdbAny): void {
    const browserWindows = BrowserWindow.getAllWindows();

    browserWindows.forEach((win) => {
      const winInfo: WindowInfo | undefined = this.windows.find((w) => w.window === win);
      const winId = winInfo?.uniqueId ?? win.title;
      if (!winId) {
        return;
      }

      const trackedTitle = winInfo?.title ?? win.title;
      const winPos = mapElectronWindowToWinPos(win);

      this.appSettings.setSync(`${MAIN_WINDOW_LAYOUT_PREFIX}${winId}.windowSize`, winPos);
      this.appSettings.setSync(`${MAIN_WINDOW_LAYOUT_PREFIX}${winId}.title`, trackedTitle);

      if (
        winInfo?.uniqueId === MAIN_WINDOW_UNIQUE_ID &&
        win.title &&
        win.title !== MAIN_WINDOW_UNIQUE_ID
      ) {
        this.appSettings.unsetSync(`${MAIN_WINDOW_LAYOUT_PREFIX}${win.title}`);
      }
      //AppSettings.setSync(`${MAIN_WINDOW_LAYOUT_PREFIX}${winId}`, data.layout);
    });
  }

  deleteUnusedLayouts(): void {
    const browserWindows = BrowserWindow.getAllWindows();
    const savedWindowLayoutRoot = this.appSettings.getSync(
      `${MAIN_WINDOW_LAYOUT_PREFIX}`.slice(0, -1),
    ) as Record<string, unknown> | undefined;
    const savedKeys = Object.keys(savedWindowLayoutRoot ?? {});

    for (const key of savedKeys) {
      const foundWindow = browserWindows.find((win) => {
        const winInfo: WindowInfo | undefined = this.windows.find((w) => w.window === win);
        const trackedKey = winInfo?.uniqueId ?? win.title;
        return trackedKey === key;
      });
      if (!foundWindow) {
        this.appSettings.unsetSync(`${MAIN_WINDOW_LAYOUT_PREFIX}${key}`);
        continue;
      }
    }
  }
}
