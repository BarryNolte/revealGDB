/**
 * Implements logger.test for revealGDB.
 *
 * @remarks
 * Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { debugLog, debugLogLines } from "../../../../src/main/utilities/logger";

describe("logger utilities", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("debugLog", () => {
    it("does not throw when called with no arguments", () => {
      expect(() => debugLog()).not.toThrow();
    });

    it("does not throw when called with a string argument", () => {
      expect(() => debugLog("hello")).not.toThrow();
    });

    it("does not throw when called with multiple arguments", () => {
      expect(() => debugLog("msg", 42, { key: "value" })).not.toThrow();
    });

    it("does not throw when called with undefined", () => {
      expect(() => debugLog(undefined)).not.toThrow();
    });

    it("does not throw when called with null", () => {
      expect(() => debugLog(null)).not.toThrow();
    });
  });

  describe("debugLogLines", () => {
    it("does not throw when called with an empty array", () => {
      expect(() => debugLogLines([])).not.toThrow();
    });

    it("does not throw when called with string lines", () => {
      expect(() => debugLogLines(["line 1", "line 2", "line 3"])).not.toThrow();
    });

    it("does not throw when called with mixed types", () => {
      expect(() => debugLogLines(["msg", 42, null, undefined, { key: "val" }])).not.toThrow();
    });

    it("does not throw with a single-element array", () => {
      expect(() => debugLogLines(["only line"])).not.toThrow();
    });
  });
});
