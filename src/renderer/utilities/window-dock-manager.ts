import { BrowserWindow } from "electron";
//import { IPC_CHANNELS } from "../../common/ipc-contracts";

export class WindowDockManager {
  // fallow-ignore-next-line unused-class-member
  static windowNumber: number = 1;

  private mainWindow: BrowserWindow | null = null;
  private secondaryWindows: BrowserWindow[] = [];

  constructor() {
    // Initialization code here
  }

  // fallow-ignore-next-line unused-class-member
  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  // fallow-ignore-next-line unused-class-member
  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  // fallow-ignore-next-line unused-class-member
  addSecondaryWindow(window: BrowserWindow, _title?: string) {
    this.secondaryWindows.push(window);
  }

  // fallow-ignore-next-line unused-class-member
  deleteSecondaryWindow(window: BrowserWindow) {
    this.secondaryWindows = this.secondaryWindows.filter((w) => w !== window);
  }
}
