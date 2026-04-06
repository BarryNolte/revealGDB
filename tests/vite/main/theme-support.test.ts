/**
 * theme-support.test module.
 *
 * @remarks
 * Source module for theme-support.test.
 */

/**
 * @file theme-support.test.ts
 * @description Source module for theme-support.test.
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("electron", async () => {
  const actual = await vi.importActual<typeof import("electron")>("electron");
  return {
    ...actual,
    nativeTheme: { themeSource: "system" },
  };
});

import { nativeTheme } from "electron";
import { setNativeThemeFromAppTheme } from "../../../src/main/theme-support";

describe("setNativeThemeFromAppTheme", () => {
  it('sets themeSource to "light" for "Light"', () => {
    setNativeThemeFromAppTheme("Light");
    expect(nativeTheme.themeSource).toBe("light");
  });

  it('sets themeSource to "dark" for "Dark"', () => {
    setNativeThemeFromAppTheme("Dark");
    expect(nativeTheme.themeSource).toBe("dark");
  });

  it('sets themeSource to "system" for "Auto"', () => {
    setNativeThemeFromAppTheme("Auto");
    expect(nativeTheme.themeSource).toBe("system");
  });

  it('sets themeSource to "system" for unknown values', () => {
    setNativeThemeFromAppTheme("SomeRandomValue");
    expect(nativeTheme.themeSource).toBe("system");
  });
});
