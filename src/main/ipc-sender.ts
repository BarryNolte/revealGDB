/**
 * Central IPC sender for main-process modules that need to push data to the renderer.
 *
 * @remarks
 * Call `setIpcWindow(mainWindow)` once from main.ts after the window is created.
 * All subsequent `sendToRenderer` calls are no-ops if the window is not yet set.
 */
import { BrowserWindow } from "electron";

let browserWindow: BrowserWindow | null = null;

/**
 * Sets the target BrowserWindow for IPC sends. Call once from main.ts.
 *
 * @param w - The main BrowserWindow instance.
 */
export function setIpcWindow(w: BrowserWindow): void {
  browserWindow = w;
}

/**
 * Sends a message to the renderer process.
 *
 * @param channel - IPC channel name.
 * @param args - Data payload.
 */
export function sendToRenderer(channel: string, ...args: unknown[]): void {
  browserWindow?.webContents.send(channel, ...args);
}
