/**
 * Named constants for custom window events dispatched within the renderer.
 *
 * @remarks
 * Centralising these literals prevents duplication and typo-related bugs
 * when wiring event dispatchers to listeners across components.
 */

export const UPDATE_WINDOW_LIST = "update-window-list";
export const SAVE_DOCK_LAYOUT = "save-dock-layout";
export const TOGGLE_WINDOW = "toggle-window";
