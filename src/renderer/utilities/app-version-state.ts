/**
 * Shared App version info state to break the circular dependency between App.tsx and AboutBox.tsx.
 */
import { GdbAny } from "../../common/gdb-common";

export let AppMainVersionInfo: Map<string, GdbAny> | undefined;

/**
 * Sets the app version info map, called from App.tsx after fetching from main.
 *
 * @param info - Version info map from the main process.
 */
export function setAppMainVersionInfo(info: Map<string, GdbAny>): void {
  AppMainVersionInfo = info;
}
