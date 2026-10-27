/**
 * Implements theme manager for revealGDB runtime behavior.
 *
 * @remarks
 * Exported symbols include `AppTheme`, `shouldUseDark`, `applyTheme`, `setSyncfusionDark`, `getSystemDarkMode`, `toNativeThemeSource`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import syncfusionDarkCss from "./syncfusion-dark.css?inline";

export type AppTheme = "Light" | "Dark" | "Auto";

const SYNCFUSION_DARK_STYLE_ID = "syncfusion-dark-style";

/**
 * Performs should use dark as part of this module's public API.
 *
 * @param theme - Value for `theme` consumed by this operation.
 * @param systemDark - Value for `systemDark` consumed by this operation.
 * @returns True when the operation succeeds; otherwise false.
 */
/**
 * Performs shouldUseDark as part of this module's internal workflow.
 *
 * @param theme - theme parameter.
 * @param systemDark? - systemDark? parameter.
 * @returns The computed result produced by this operation.
 */
/** @public */
export function shouldUseDark(theme: AppTheme, systemDark?: boolean): boolean {
  if (theme === "Dark") return true;
  if (theme === "Light") return false;
  // Auto — fall back to the system/OS preference
  return systemDark ?? getSystemDarkMode();
}

/**
 * Performs apply theme as part of this module's public API.
 *
 * @param theme - Value for `theme` consumed by this operation.
 * @param systemDark - Value for `systemDark` consumed by this operation.
 */
/**
 * Performs applyTheme as part of this module's internal workflow.
 *
 * @param theme - theme parameter.
 * @param systemDark? - systemDark? parameter.
 * @returns The computed result produced by this operation.
 */
export function applyTheme(theme: AppTheme, systemDark?: boolean): void {
  const dark = shouldUseDark(theme, systemDark);

  // 1. CSS custom-property overrides via data-theme attribute
  if (dark) {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }

  // 2. Inject or remove the SyncFusion dark theme stylesheet
  setSyncfusionDark(dark);
}

/**
 * Sets syncfusion dark on current state.
 *
 * @param dark - Value for `dark` consumed by this operation.
 */
/** @public */
export function setSyncfusionDark(dark: boolean): void {
  const existing = document.getElementById(SYNCFUSION_DARK_STYLE_ID);

  if (dark && !existing) {
    const style = document.createElement("style");
    style.id = SYNCFUSION_DARK_STYLE_ID;
    style.textContent = syncfusionDarkCss;
    document.head.appendChild(style);
  } else if (!dark && existing) {
    existing.remove();
  }
}

/**
 * Returns system dark mode from current state.
 *
 * @returns True when the operation succeeds; otherwise false.
 */
/** @public */
export function getSystemDarkMode(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Performs to native theme source as part of this module's public API.
 *
 * @param theme - Value for `theme` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
/**
 * Performs toNativeThemeSource as part of this module's internal workflow.
 *
 * @param theme - theme parameter.
 * @returns The computed result produced by this operation.
 */
/** @public */
export function toNativeThemeSource(theme: AppTheme): "light" | "dark" | "system" {
  switch (theme) {
    case "Light":
      return "light";
    case "Dark":
      return "dark";
    default:
      return "system";
  }
}
