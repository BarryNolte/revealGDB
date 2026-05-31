/**
 * Shared App version info state to break the circular dependency between App.tsx and AboutBox.tsx.
 */

export let AppMainVersionInfo: Map<string, unknown> | undefined;

/**
 * Sets the app version info map, called from App.tsx after fetching from main.
 *
 * @param info - Version info map from the main process.
 */
export function setAppMainVersionInfo(info: Map<string, unknown>): void {
  AppMainVersionInfo = info;
}
