/**
 * HexEditorKeymap.test module.
 *
 * @remarks
 * Source module for HexEditorKeymap.test.
 */

/**
 * @file HexEditorKeymap.test.ts
 * @description Source module for HexEditorKeymap.test.
 */

import { describe, expect, it } from "vitest";
import { resolveKeyAction } from "../../../../../src/renderer/Components/HexEditor/HexEditorKeymap";

describe("HexEditorKeymap", () => {
  const hexChars = /^[0-9a-fA-F]$/;

  it("maps navigation keys to move actions", () => {
    expect(resolveKeyAction("ArrowUp", hexChars)).toEqual({ type: "move", delta: -16 });
    expect(resolveKeyAction("ArrowDown", hexChars)).toEqual({ type: "move", delta: 16 });
    expect(resolveKeyAction("ArrowLeft", hexChars)).toEqual({ type: "move", delta: -1 });
    expect(resolveKeyAction("ArrowRight", hexChars)).toEqual({
      type: "move",
      delta: 1,
      preventDefault: true,
    });
  });

  it("maps Enter and Tab to next-cell navigation", () => {
    expect(resolveKeyAction("Enter", hexChars)).toEqual({
      type: "move",
      delta: 1,
      preventDefault: true,
    });
    expect(resolveKeyAction("Tab", hexChars)).toEqual({
      type: "move",
      delta: 1,
      preventDefault: true,
    });
  });

  it("maps Escape to cancel", () => {
    expect(resolveKeyAction("Escape", hexChars)).toEqual({ type: "cancel" });
  });

  it("accepts valid input chars and ignores others", () => {
    expect(resolveKeyAction("a", hexChars)).toEqual({ type: "input", value: "a" });
    expect(resolveKeyAction("G", hexChars)).toEqual({ type: "ignore" });
  });
});
