/**
 * Implements platform-info.test for revealGDB.
 *
 * @remarks
 * Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { describe, expect, it } from "vitest";
import { isDebug, isLinux, isMac, isWin } from "../../../src/main/platform-info";

describe("platform-info", () => {
  it("exports boolean platform constants", () => {
    expect(typeof isMac).toBe("boolean");
    expect(typeof isWin).toBe("boolean");
    expect(typeof isLinux).toBe("boolean");
    expect(typeof isDebug).toBe("boolean");
  });

  it("exactly one of isMac, isWin, or isLinux is true", () => {
    const count = [isMac, isWin, isLinux].filter(Boolean).length;
    expect(count).toBe(1);
  });
});
