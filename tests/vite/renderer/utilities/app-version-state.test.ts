/**
 * Implements app-version-state.test for revealGDB.
 *
 * @remarks
 * Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  AppMainVersionInfo,
  setAppMainVersionInfo,
} from "../../../../src/renderer/utilities/app-version-state";

describe("app-version-state", () => {
  beforeEach(() => {
    // Reset to undefined before each test by calling with a fresh map trick
    // Actually we can just test the public API directly
  });

  it("AppMainVersionInfo is initially undefined or a Map", () => {
    expect(AppMainVersionInfo === undefined || AppMainVersionInfo instanceof Map).toBe(true);
  });

  it("setAppMainVersionInfo sets the module-level variable", () => {
    const info = new Map([
      ["version", "1.2.3"],
      ["platform", "linux"],
    ]);

    setAppMainVersionInfo(info);

    expect(AppMainVersionInfo).toBe(info);
  });

  it("setAppMainVersionInfo overwrites a previously set value", () => {
    const first = new Map([["key", "first"]]);
    const second = new Map([["key", "second"]]);

    setAppMainVersionInfo(first);
    setAppMainVersionInfo(second);

    expect(AppMainVersionInfo).toBe(second);
  });

  it("setAppMainVersionInfo accepts an empty map", () => {
    const empty = new Map();
    setAppMainVersionInfo(empty);
    expect(AppMainVersionInfo).toBe(empty);
    expect(AppMainVersionInfo?.size).toBe(0);
  });

  it("setAppMainVersionInfo preserves map entries", () => {
    const info = new Map([
      ["name", "revealGDB"],
      ["build", "debug"],
    ]);
    setAppMainVersionInfo(info);
    expect(AppMainVersionInfo?.get("name")).toBe("revealGDB");
    expect(AppMainVersionInfo?.get("build")).toBe("debug");
  });
});
