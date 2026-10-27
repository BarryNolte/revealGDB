import { BrowserWindow } from "electron";
//import { IPC_CHANNELS } from "../../common/ipc-contracts";

export class WindowDockManager {
  static windowNumber: number = 1;

  private mainWindow: BrowserWindow | null = null;
  private secondaryWindows: BrowserWindow[] = [];

  constructor() {
    // Initialization code here
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  addSecondaryWindow(window: BrowserWindow, _title?: string) {
    this.secondaryWindows.push(window);
  }

  deleteSecondaryWindow(window: BrowserWindow) {
    this.secondaryWindows = this.secondaryWindows.filter((w) => w !== window);
  }
}
