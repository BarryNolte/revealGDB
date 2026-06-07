/**
 * Implements window pos mapper for revealGDB runtime behavior.
 *
 * @remarks
 * Exported symbols include `WinPos`, `mapElectronWindowToWinPos`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
export type WinPos = {
  x: number;
  y: number;
  width: number;
  height: number;
  fullscreen: boolean;
};

/**
 * Maps source input into electron window to win pos output.
 *
 * @param mainWindow - Value for `mainWindow` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
/**
 * Performs mapElectronWindowToWinPos as part of this module's internal workflow.
 *
 * @param mainWindow - mainWindow parameter.
 * @returns The computed result produced by this operation.
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
