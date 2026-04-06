/**
 * Implements window manager for revealGDB runtime behavior.
 *
 * @remarks
 * Exported symbols include `createMainWindow`, `createDebugWindow`, `loadMainWindow`, `restoreWindowBounds`, `wireWindowCloseHandlers`, `resolvePreloadPath`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { BrowserWindow } from "electron";
import path, { join } from "path";

type WindowSizeSettings = {
  getSync: (key: string) => unknown;
};

/**
 * Creates main window for downstream use.
 *
 * @param preloadPath - Filesystem or source path used to locate the target resource.
 * @returns The computed result produced by this operation.
 */
export function createMainWindow(preloadPath: string): BrowserWindow {
  return new BrowserWindow({
    webPreferences: {
      preload: preloadPath,
    },
    show: false,
  });
}

/**
 * Creates debug window for downstream use.
 *
 * @param mainWindow - Value for `mainWindow` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
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

/**
 * Performs load main window as part of this module's public API.
 *
 * @param mainWindow - Value for `mainWindow` consumed by this operation.
 */
export function loadMainWindow(mainWindow: BrowserWindow): void {
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

/**
 * Performs restore window bounds as part of this module's public API.
 *
 * @param mainWindow - Value for `mainWindow` consumed by this operation.
 * @param appSettings - Value for `appSettings` consumed by this operation.
 */
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

/**
 * Performs wire window close handlers as part of this module's public API.
 *
 * @param mainWindow - Value for `mainWindow` consumed by this operation.
 * @param debugWindow - Value for `debugWindow` consumed by this operation.
 */
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

/**
 * Performs resolve preload path as part of this module's public API.
 *
 * @returns The resulting string value produced by this operation.
 */
export function resolvePreloadPath(): string {
  return path.resolve("./out/preload/preload.js");
}
