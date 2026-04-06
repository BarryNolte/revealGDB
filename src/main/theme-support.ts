/**
 * Implements theme support for revealGDB runtime behavior.
 *
 * @remarks
 * Exported symbols include `setNativeThemeFromAppTheme`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { nativeTheme } from "electron";

/**
 * Sets native theme from app theme on current state.
 *
 * @param theme - Value for `theme` consumed by this operation.
 */
export function setNativeThemeFromAppTheme(theme: string): void {
  switch (theme) {
    case "Light":
      nativeTheme.themeSource = "light";
      break;
    case "Dark":
      nativeTheme.themeSource = "dark";
      break;
    default:
      nativeTheme.themeSource = "system";
      break;
  }
}
