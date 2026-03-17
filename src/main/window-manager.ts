import { BrowserWindow } from "electron";
import path, { join } from "path";
import { wait } from "../common/gdb-common";

type WindowSizeSettings = {
  getSync: (key: string) => unknown;
};

export function createMainWindow(preloadPath: string): BrowserWindow {
  return new BrowserWindow({
    webPreferences: {
      preload: preloadPath,
    },
    show: false,
  });
}

export function createDebugWindow(mainWindow: BrowserWindow): BrowserWindow {
  const debugWindow = new BrowserWindow({
    x: 0,
    y: 0,
    width: 1200,
    height: 1200,
    autoHideMenuBar: true,
  });
  mainWindow.webContents.setDevToolsWebContents(debugWindow.webContents);
  mainWindow.webContents.openDevTools({
    mode: "detach",
    title: "revealGDB - I'm Special, I know how to debug...",
  });

  return debugWindow;
}

export function loadMainWindow(mainWindow: BrowserWindow, isDebug: boolean): void {
  if (isDebug) {
    wait(5000);
  }

  let devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) {
    console.log("Loading URL:", devUrl);
    mainWindow.loadURL(devUrl);
    return;
  }

  console.log("Loading file:", join(__dirname, "..", "..", "out", "renderer", "index.html"));
  devUrl = join(__dirname, "..", "..", "out", "renderer", "index.html");
  mainWindow.loadFile(devUrl);
}

export function restoreWindowBounds(
  mainWindow: BrowserWindow,
  appSettings: WindowSizeSettings,
): void {
  const x = appSettings.getSync("gdb.gui.windowSize.x") as number;
  const y = appSettings.getSync("gdb.gui.windowSize.y") as number;
  const w = appSettings.getSync("gdb.gui.windowSize.width") as number;
  const h = appSettings.getSync("gdb.gui.windowSize.height") as number;

  if (x && y) {
    mainWindow.setPosition(x, y);
  }

  if (w && h) {
    mainWindow.setSize(w, h);
  }

  mainWindow.fullScreen = appSettings.getSync("gdb.gui.windowSize.fullscreen") as boolean;
}

export function wireWindowCloseHandlers(
  mainWindow: BrowserWindow,
  debugWindow: BrowserWindow | undefined,
): void {
  let debugWindowClosed = false;

  mainWindow.on("closed", () => {
    if (debugWindow && !debugWindowClosed) {
      debugWindow.close();
    }
  });

  if (debugWindow) {
    debugWindow.on("closed", () => {
      debugWindowClosed = true;
    });
  }
}

export function resolvePreloadPath(): string {
  return path.resolve("./out/preload/preload.js");
}
