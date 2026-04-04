import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the ?inline CSS import before importing the module under test
vi.mock("../../../src/renderer/syncfusion-dark.css?inline", () => ({
  default: ".e-grid { background: #303030; }",
}));

import {
  applyTheme,
  getSystemDarkMode,
  setSyncfusionDark,
  shouldUseDark,
  toNativeThemeSource,
} from "../../../src/renderer/theme-manager";

describe("theme-manager", () => {
  describe("shouldUseDark", () => {
    it('returns true for "Dark" regardless of system setting', () => {
      expect(shouldUseDark("Dark", false)).toBe(true);
      expect(shouldUseDark("Dark", true)).toBe(true);
    });

    it('returns false for "Light" regardless of system setting', () => {
      expect(shouldUseDark("Light", false)).toBe(false);
      expect(shouldUseDark("Light", true)).toBe(false);
    });

    it('returns the system setting for "Auto"', () => {
      expect(shouldUseDark("Auto", true)).toBe(true);
      expect(shouldUseDark("Auto", false)).toBe(false);
    });

    it('"Auto" falls back to matchMedia when systemDark is omitted', () => {
      // jsdom matchMedia always returns false by default
      expect(shouldUseDark("Auto")).toBe(false);
    });
  });

  describe("toNativeThemeSource", () => {
    it('maps "Light" to "light"', () => {
      expect(toNativeThemeSource("Light")).toBe("light");
    });

    it('maps "Dark" to "dark"', () => {
      expect(toNativeThemeSource("Dark")).toBe("dark");
    });

    it('maps "Auto" to "system"', () => {
      expect(toNativeThemeSource("Auto")).toBe("system");
    });
  });

  describe("getSystemDarkMode", () => {
    it("returns false in jsdom (no real matchMedia)", () => {
      expect(getSystemDarkMode()).toBe(false);
    });

    it("returns true when matchMedia reports dark mode", () => {
      const original = window.matchMedia;
      window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as never;
      expect(getSystemDarkMode()).toBe(true);
      window.matchMedia = original;
    });
  });

  describe("setSyncfusionDark", () => {
    afterEach(() => {
      document.getElementById("syncfusion-dark-style")?.remove();
    });

    it("injects a <style> element when dark is true", () => {
      setSyncfusionDark(true);
      const el = document.getElementById("syncfusion-dark-style");
      expect(el).not.toBeNull();
      expect(el?.tagName).toBe("STYLE");
      expect(el?.textContent).toContain(".e-grid");
    });

    it("does not duplicate the <style> element on repeated calls", () => {
      setSyncfusionDark(true);
      setSyncfusionDark(true);
      const els = document.querySelectorAll("#syncfusion-dark-style");
      expect(els.length).toBe(1);
    });

    it("removes the <style> element when dark is false", () => {
      setSyncfusionDark(true);
      expect(document.getElementById("syncfusion-dark-style")).not.toBeNull();

      setSyncfusionDark(false);
      expect(document.getElementById("syncfusion-dark-style")).toBeNull();
    });

    it("does nothing when removing and element is already absent", () => {
      expect(() => setSyncfusionDark(false)).not.toThrow();
    });
  });

  describe("applyTheme", () => {
    beforeEach(() => {
      document.documentElement.removeAttribute("data-theme");
    });

    afterEach(() => {
      document.documentElement.removeAttribute("data-theme");
      document.getElementById("syncfusion-dark-style")?.remove();
    });

    it('sets data-theme="dark" and injects dark stylesheet for Dark theme', () => {
      applyTheme("Dark");

      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
      expect(document.getElementById("syncfusion-dark-style")).not.toBeNull();
    });

    it("removes data-theme and dark stylesheet for Light theme", () => {
      // Start in dark mode
      applyTheme("Dark");

      applyTheme("Light");

      expect(document.documentElement.getAttribute("data-theme")).toBeNull();
      expect(document.getElementById("syncfusion-dark-style")).toBeNull();
    });

    it("uses systemDark parameter for Auto mode", () => {
      applyTheme("Auto", true);
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
      expect(document.getElementById("syncfusion-dark-style")).not.toBeNull();

      applyTheme("Auto", false);
      expect(document.documentElement.getAttribute("data-theme")).toBeNull();
      expect(document.getElementById("syncfusion-dark-style")).toBeNull();
    });
  });
});
