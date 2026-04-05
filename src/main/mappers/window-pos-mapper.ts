export type WinPos = {
  x: number;
  y: number;
  width: number;
  height: number;
  fullscreen: boolean;
};

/**
 * Extracts window position and size from an Electron BrowserWindow,
 * applying the 2px inset used when saving dock layout.
 */
export function mapElectronWindowToWinPos(mainWindow: {
  getPosition(): number[];
  getSize(): number[];
  fullScreen: boolean;
}): WinPos {
  return {
    x: mainWindow.getPosition()[0],
    y: mainWindow.getPosition()[1],
    width: mainWindow.getSize()[0] - 2,
    height: mainWindow.getSize()[1] - 2,
    fullscreen: mainWindow.fullScreen,
  };
}
