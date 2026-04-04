/**
 * Main-process helper for mapping the user-facing theme value
 * ("Light" | "Dark" | "Auto") to Electron's nativeTheme.themeSource.
 */
import { nativeTheme } from "electron";

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
