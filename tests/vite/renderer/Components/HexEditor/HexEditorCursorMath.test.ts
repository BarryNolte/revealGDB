/**
 * HexEditorCursorMath.test module.
 *
 * @remarks
 * Source module for HexEditorCursorMath.test.
 */

/**
 * @file HexEditorCursorMath.test.ts
 * @description Source module for HexEditorCursorMath.test.
 */

import { describe, expect, it } from "vitest";
import {
  clampIndex,
  getColumnFromIndex,
  getRowFromIndex,
  HEX_EDITOR_ROW_WIDTH,
  parseIndexFromId,
} from "../../../../../src/renderer/Components/HexEditor/HexEditorCursorMath";

describe("HexEditorCursorMath", () => {
  it("clamps index to valid range", () => {
    expect(clampIndex(-1, 64)).toBe(0);
    expect(clampIndex(10, 64)).toBe(10);
    expect(clampIndex(80, 64)).toBe(63);
  });

  it("parses element IDs into numeric indices", () => {
    expect(parseIndexFromId("dIdx-42")).toBe(42);
    expect(parseIndexFromId("tIdx-0")).toBe(0);
    expect(parseIndexFromId("invalid")).toBeNull();
    expect(parseIndexFromId("dIdx-not-a-number")).toBeNull();
  });

  it("derives row and column from index", () => {
    const index = HEX_EDITOR_ROW_WIDTH + 3;
    expect(getRowFromIndex(index)).toBe(1);
    expect(getColumnFromIndex(index)).toBe(3);
  });
});
