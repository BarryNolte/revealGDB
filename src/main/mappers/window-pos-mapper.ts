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
 * @param window - Value for `mainWindow` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
/**
 * Performs mapElectronWindowToWinPos as part of this module's internal workflow.
 *
 * @param window - mainWindow parameter.
 * @returns The computed result produced by this operation.
 */
export function mapElectronWindowToWinPos(window: {
  getPosition(): number[];
  getSize(): number[];
  fullScreen: boolean;
}): WinPos {
  const [x, y] = window.getPosition();
  const [width, height] = window.getSize();

  return {
    x,
    y,
    width,
    height,
    fullscreen: window.fullScreen,
  };
}
