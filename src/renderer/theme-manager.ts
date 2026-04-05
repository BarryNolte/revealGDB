/**
 * Theme manager for RevealGDB.
 *
 * Centralises all theme-switching logic:
 *  - Sets the `data-theme` attribute on the document root
 *  - Injects / removes SyncFusion Material-Dark CSS via a `<style>` element
 *  - Queries the OS colour-scheme preference via matchMedia
 *
 * The light SyncFusion CSS is bundled normally by Vite (imported in main.tsx).
 * The dark SyncFusion CSS is imported with `?inline` so Vite resolves all
 * @import statements at build time and gives us the processed CSS as a string.
 * We inject it into a `<style>` tag when dark mode is active and remove it
 * when switching back to light.
 */

// Vite ?inline import: resolved at build time, returned as a string.
import syncfusionDarkCss from "./syncfusion-dark.css?inline";

export type AppTheme = "Light" | "Dark" | "Auto";

const SYNCFUSION_DARK_STYLE_ID = "syncfusion-dark-style";

/**
 * Resolve whether dark mode should be active.
 */
export function shouldUseDark(theme: AppTheme, systemDark?: boolean): boolean {
  if (theme === "Dark") return true;
  if (theme === "Light") return false;
  // Auto — fall back to the system/OS preference
  return systemDark ?? getSystemDarkMode();
}

/**
 * Apply the given application theme immediately.
 *
 * @param theme  - The user-selected theme ("Light" | "Dark" | "Auto").
 * @param systemDark - Optional override for the current OS dark-mode state.
 *                     When omitted the value is read via `matchMedia`.
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
 * Add or remove the SyncFusion Material-Dark `<style>` element.
 *
 * When dark is true, the element is added (if not already present).
 * When dark is false, the element is removed (if present).
 * The dark styles cascade over the always-loaded light styles because
 * they use identical selectors and appear later in the document.
 */
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
 * Read the current OS colour-scheme preference.
 */
export function getSystemDarkMode(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Map a user-facing theme string to the Electron `nativeTheme.themeSource` value.
 */
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
