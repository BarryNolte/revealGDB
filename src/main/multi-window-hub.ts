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

export type OpenWindowInfo = {
  uniqueId: string;
  title: string;
  webContentsId: number;
};
export class MultiWindowHub {
  private windows: WindowInfo[] = [];
  private readonly appSettings: AppSettingsLike;
  private persistSuspended = 0;
  private readonly windowsClosedDuringShutdown = new WeakSet<BrowserWindow>();

  constructor(appSettings: AppSettingsLike) {
    this.appSettings = appSettings;
  }

  suspendPersistence(): void {
    this.persistSuspended += 1;
  }

  resumePersistence(): void {
    this.persistSuspended = Math.max(0, this.persistSuspended - 1);
  }

  withPersistencePaused<T>(action: () => T): T {
    this.suspendPersistence();
    try {
      return action();
    } finally {
      this.resumePersistence();
    }
  }

  restoreSavedSecondaryWindows(
    createSecondaryWindowFn: (
      title: string,
      uniqueId: string,
      onReadyToShow: (window: BrowserWindow) => void,
    ) => BrowserWindow,
  ): BrowserWindow[] {
    const savedLayouts = this.appSettings.getSync("gdb.gui.layouts") as
      | Record<string, { title?: string; windowSize?: Record<string, unknown> }>
      | undefined;

    if (!savedLayouts || typeof savedLayouts !== "object") {
      return [];
    }

    const restoredWindows: BrowserWindow[] = [];

    for (const [layoutId, layout] of Object.entries(savedLayouts)) {
      if (layoutId === MAIN_WINDOW_UNIQUE_ID || layoutId === DEVTOOLS_WINDOW_UNIQUE_ID) {
        continue;
      }

      const savedTitle =
        typeof layout?.title === "string" && layout.title.trim().length > 0
          ? layout.title
          : `Secondary Window ${layoutId}`;
      const window = createSecondaryWindowFn(savedTitle, layoutId, (createdWindow) => {
        createdWindow.once("ready-to-show", () => {
          createdWindow.show();
        });
      });
      const windowSize = layout?.windowSize;

      if (windowSize && typeof windowSize === "object") {
        const x = Number(windowSize.x);
        const y = Number(windowSize.y);
        const width = Number(windowSize.width);
        const height = Number(windowSize.height);

        if ([x, y, width, height].every(Number.isFinite)) {
          window.setBounds({ x, y, width, height });
        }

        if (typeof windowSize.fullscreen === "boolean") {
          window.setFullScreen(windowSize.fullscreen);
        }
      }

      this.add(window, layoutId, savedTitle);
      restoredWindows.push(window);
    }

    return restoredWindows;
  }

  add(win: BrowserWindow, uniqueId?: string, title?: string): void {
    if (uniqueId) {
      this.windows = this.windows.filter((w) => w.window !== win && w.uniqueId !== uniqueId);
    } else {
      this.windows = this.windows.filter((w) => w.window !== win);
    }

    const windowInfo: WindowInfo = { window: win, uniqueId: uniqueId, title: title };
    this.windows.push(windowInfo);

    if (typeof win.on === "function") {
      win.on("closed", () => {
        this.handleWindowClosed(win, uniqueId);
      });
    }
  }

  setWindowTitle(uniqueId: string, title: string): void {
    const entry = this.getWindowEntryByUniqueId(uniqueId);
    if (!entry) {
      return;
    }

    const normalizedTitle = title.trim();
    if (normalizedTitle.length === 0) {
      return;
    }

    entry.title = normalizedTitle;
    if (typeof entry.window.isDestroyed === "function" && entry.window.isDestroyed()) {
      return;
    }
    entry.window.setTitle(normalizedTitle);
  }

  delete(uniqueId: string): void {
    this.windows = this.windows.filter((w) => w.uniqueId !== uniqueId);
  }

  getWindowEntryByUniqueId(uniqueId: string): WindowInfo | undefined {
    return this.windows.find((entry) => entry.uniqueId === uniqueId);
  }

  getWindowEntryByWebContentsId(webContentsId: number): WindowInfo | undefined {
    return this.windows.find((entry) => entry.window.webContents.id === webContentsId);
  }

  listOpenWindows(): OpenWindowInfo[] {
    const results: OpenWindowInfo[] = [];
    this.windows.forEach((entry) => {
      if (
        !entry.uniqueId ||
        (typeof entry.window.isDestroyed === "function" && entry.window.isDestroyed())
      ) {
        return;
      }

      const browserTitle = (entry.window.title ?? "").trim();
      const trackedTitle = (entry.title ?? "").trim();
      const title = (browserTitle.length > 0 ? browserTitle : trackedTitle).trim();
      results.push({
        uniqueId: entry.uniqueId,
        title: title.length > 0 ? title : entry.uniqueId,
        webContentsId: entry.window.webContents.id,
      });
    });
    return results;
  }

  private isSecondaryWindow(uniqueId: string | undefined): uniqueId is string {
    return (
      typeof uniqueId === "string" &&
      uniqueId !== MAIN_WINDOW_UNIQUE_ID &&
      uniqueId !== DEVTOOLS_WINDOW_UNIQUE_ID
    );
  }

  private handleWindowClosed(win: BrowserWindow, uniqueId?: string): void {
    const closedDuringShutdown = this.windowsClosedDuringShutdown.has(win);
    if (closedDuringShutdown) {
      this.windowsClosedDuringShutdown.delete(win);
      return;
    }

    if (this.isSecondaryWindow(uniqueId)) {
      this.appSettings.unsetSync(`${MAIN_WINDOW_LAYOUT_PREFIX}${uniqueId}`);
    }

    this.windows = this.windows.filter((w) => w.window !== win);
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
        this.windowsClosedDuringShutdown.add(win);
        win.close(); // only close secondary windows, not the main or devtools windows
      }
    }
  }

  shouldSkipTransferOnClose(win: BrowserWindow): boolean {
    return this.windowsClosedDuringShutdown.has(win);
  }

  saveWindowInfo(_data: GdbAny): void {
    if (this.persistSuspended > 0) {
      return;
    }

    const browserWindows = BrowserWindow.getAllWindows();

    browserWindows.forEach((win) => {
      const winInfo: WindowInfo | undefined = this.windows.find((w) => w.window === win);
      const winId = winInfo?.uniqueId ?? win.title;
      if (!winId) {
        return;
      }

      const browserTitle = (win.title ?? "").trim();
      const trackedTitle = (winInfo?.title ?? "").trim();
      const persistedTitle = trackedTitle.length > 0 ? trackedTitle : browserTitle;

      if (winInfo && trackedTitle.length === 0 && browserTitle.length > 0) {
        winInfo.title = browserTitle;
      }
      const winPos = mapElectronWindowToWinPos(win);

      this.appSettings.setSync(`${MAIN_WINDOW_LAYOUT_PREFIX}${winId}.windowSize`, winPos);
      if (persistedTitle.length > 0) {
        this.appSettings.setSync(`${MAIN_WINDOW_LAYOUT_PREFIX}${winId}.title`, persistedTitle);
      }

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
