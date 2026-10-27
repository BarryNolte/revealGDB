/**
 * Implements window manager for revealGDB runtime behavior.
 *
 * @remarks
 * Exported symbols include `createMainWindow`, `createDebugWindow`, `loadMainWindow`, `restoreWindowBounds`, `wireWindowCloseHandlers`, `resolvePreloadPath`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */

import { BrowserWindow } from "electron";
import path, { join } from "path";
import { multiWindowHub } from "./main";
//import { dockWindowManager } from "../renderer/utilities/window-dock-manager";

const MAIN_WINDOW_SIZE_PREFIX = "gdb.gui.layout.main.windowSize";

export type WindowSizeSettings = {
  getSync: (key: string) => unknown;
};

/**
 * Creates main window for downstream use.
 *
 * @param preloadPath - Filesystem or source path used to locate the target resource.
 * @returns The computed result produced by this operation.
 */

/**
 * Performs createMainWindow as part of this module's internal workflow.
 *
 * @param preloadPath - preloadPath parameter.
 * @returns The computed result produced by this operation.
 */
export function createMainWindow(preloadPath: string): BrowserWindow {
  const window = new BrowserWindow({
    webPreferences: {
      preload: preloadPath,
    },
    show: false,
  });

  window.on("move", () => {
    multiWindowHub.saveWindowInfo(null);
  });

  return window;
}

/**
 * Performs createSecondaryWindow as part of this module's internal workflow.
 *
 * @param preloadPath - preloadPath parameter.
 * @returns The computed result produced by this operation.
 */
export function createSecondaryWindow(preloadPath: string): BrowserWindow {
  const window = new BrowserWindow({
    webPreferences: {
      preload: preloadPath,
    },
    show: false,
    autoHideMenuBar: true,
  });
  const uniqueNumber = Date.now();
  multiWindowHub.add(window, uniqueNumber.toString(20));

  window.on("move", () => {
    multiWindowHub.saveWindowInfo(null);
  });

  return window;
}

/**
 * Creates debug window for downstream use.
 *
 * @param mainWindow - Value for `mainWindow` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
/**
 * Performs createDebugWindow as part of this module's internal workflow.
 *
 * @param mainWindow - mainWindow parameter.
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

  debugWindow.on("move", () => {
    multiWindowHub.saveWindowInfo(null);
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
    // console.log("Loading URL:", devUrl);
    mainWindow.loadURL(devUrl);
    return;
  }

  // console.log("Loading file:", join(__dirname, "..", "..", "out", "renderer", "index.html"));
  devUrl = join(__dirname, "..", "..", "out", "renderer", "index.html");
  mainWindow.loadFile(devUrl);
}

/**
 * Performs load main window as part of this module's public API.
 *
 * @param secondaryWindow - Value for `mainWindow` consumed by this operation.
 */
export function loadSecondaryWindow(secondaryWindow: BrowserWindow): void {
  const devUrl = join(__dirname, "..", "..", "out", "renderer", "secondary.html");
  secondaryWindow.loadURL(devUrl);
}
/**
 * Performs restore window bounds as part of this module's public API.
 *
 * @param window - Value for `mainWindow` consumed by this operation.
 * @param appSettings - Value for `appSettings` consumed by this operation.
 */
/**
 * Performs restoreWindowBounds as part of this module's internal workflow.
 *
 * @param window - mainWindow parameter.
 * @param appSettings - appSettings parameter.
 * @returns The computed result produced by this operation.
 */
export function restoreWindowBounds(window: BrowserWindow, appSettings: WindowSizeSettings): void {
  const x = appSettings.getSync(`${MAIN_WINDOW_SIZE_PREFIX}.x`) as number;
  const y = appSettings.getSync(`${MAIN_WINDOW_SIZE_PREFIX}.y`) as number;
  const w = appSettings.getSync(`${MAIN_WINDOW_SIZE_PREFIX}.width`) as number;
  const h = appSettings.getSync(`${MAIN_WINDOW_SIZE_PREFIX}.height`) as number;

  if (x && y) {
    window.setPosition(x, y);
  }

  if (w && h) {
    window.setSize(w, h);
  }

  window.fullScreen = appSettings.getSync(`${MAIN_WINDOW_SIZE_PREFIX}.fullscreen`) as boolean;
}

/**
 * Performs wire window close handlers as part of this module's public API.
 *
 * @param mainWindow - Value for `mainWindow` consumed by this operation.
 * @param debugWindow - Value for `debugWindow` consumed by this operation.
 */
/**
 * Performs wireWindowCloseHandlers as part of this module's internal workflow.
 *
 * @param mainWindow - mainWindow parameter.
 * @param debugWindow - debugWindow parameter.
 * @returns The computed result produced by this operation.
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
  return path.join(__dirname, "..", "preload", "preload.js");
}
