/**
 * GdbSourceWindowModel.test module.
 *
 * @remarks
 * Source module for GdbSourceWindowModel.test.
 */

/**
 * @file GdbSourceWindowModel.test.ts
 * @description Source module for GdbSourceWindowModel.test.
 */

import { describe, expect, it } from "vitest";

import {
  applySourceUpdate,
  createInitialSourceWindowState,
  createMarkerForLine,
  getBaseFilename,
  getEditorModeForFile,
  mapBreakpointsToMarkers,
} from "../../../../src/renderer/ToolWindows/GdbSourceWindowModel";

describe("GdbSourceWindowModel", () => {
  it("resolves editor mode from file extension", () => {
    const modes = new Map<string, string>([
      ["c", "c_cpp"],
      ["rs", "rust"],
    ]);

    expect(getEditorModeForFile("main.c", modes, "c_cpp")).toBe("c_cpp");
    expect(getEditorModeForFile("kernel.rs", modes, "c_cpp")).toBe("rust");
    expect(getEditorModeForFile("README", modes, "c_cpp")).toBe("c_cpp");
  });

  it("extracts base filename from full path", () => {
    expect(getBaseFilename("/tmp/main.c")).toBe("main.c");
    expect(getBaseFilename("C:\\work\\foo\\bar.cpp")).toBe("bar.cpp");
  });

  it("creates markers for valid source lines", () => {
    const markerData = createMarkerForLine("10");
    expect(markerData.currentMarker).toBe(9);
    expect(markerData.markers).toEqual([
      expect.objectContaining({
        startRow: 9,
        endRow: 9,
        className: "ace_highlight_line",
      }),
    ]);
  });

  it("returns no marker for invalid source lines", () => {
    const markerData = createMarkerForLine("not-a-line");
    expect(markerData.currentMarker).toBe(-1);
    expect(markerData.markers).toEqual([]);
  });

  it("derives source render state from source-file updates", () => {
    const initial = createInitialSourceWindowState();

    const withSource = applySourceUpdate(initial, {
      fileName: "/tmp/main.c",
      line: "7",
      contents: "int main() { return 0; }",
    });

    expect(withSource.hasSource).toBe(true);
    expect(withSource.fullpath).toBe("/tmp/main.c");
    expect(withSource.filename).toBe("main.c");
    expect(withSource.currentMarker).toBe(6);
    expect(withSource.stackMarkers).toHaveLength(1);

    const noSource = applySourceUpdate(withSource, {
      fileName: "/tmp/missing.c",
      line: "2",
      contents: undefined,
    });

    expect(noSource.hasSource).toBe(false);
    expect(noSource.fullpath).toBe("/tmp/missing.c");
    expect(noSource.line).toBe("2");
  });

  it("maps breakpoint payloads to marker model", () => {
    const data = new Map<string, { line: string; enabled: string; fullname: string }>([
      ["1", { line: "12", enabled: "y", fullname: "/tmp/main.c" }],
      ["2", { line: "20", enabled: "n", fullname: "/tmp/main.c" }],
    ]);

    const markers = mapBreakpointsToMarkers(data as never);

    expect(markers).toEqual([
      { line: 11, type: "ace_breakpoint_enabled", file: "/tmp/main.c" },
      { line: 19, type: "ace_breakpoint_disabled", file: "/tmp/main.c" },
    ]);
  });

  it("returns no marker for line zero (currentMarker < 0 branch)", () => {
    // parseInt("0") - 1 = -1, so currentMarker < 0 is true
    const markerData = createMarkerForLine("0");
    expect(markerData.currentMarker).toBe(-1);
    expect(markerData.markers).toEqual([]);
  });

  it("applySourceUpdate falls back to prevState fileName when data has no fileName", () => {
    const initial = createInitialSourceWindowState();
    const withSource = applySourceUpdate(initial, {
      fileName: "/tmp/main.c",
      line: "5",
      contents: "void f() {}",
    });

    // Update without a fileName — should keep existing fullpath and filename
    const updated = applySourceUpdate(withSource, {
      fileName: undefined,
      line: "8",
      contents: "void g() {}",
    });

    expect(updated.fullpath).toBe("/tmp/main.c");
    expect(updated.filename).toBe("main.c");
    expect(updated.line).toBe("8");
    expect(updated.hasSource).toBe(true);
  });

  it("applySourceUpdate falls back to prevState line when data has no line", () => {
    const initial = createInitialSourceWindowState();
    const withSource = applySourceUpdate(initial, {
      fileName: "/tmp/main.c",
      line: "5",
      contents: "void f() {}",
    });

    // Update without a line — should keep existing line
    const updated = applySourceUpdate(withSource, {
      fileName: "/tmp/main.c",
      line: undefined,
      contents: undefined,
    });

    expect(updated.line).toBe("5");
    expect(updated.hasSource).toBe(false);
    expect(updated.fullpath).toBe("/tmp/main.c");
  });

  it("mapBreakpointsToMarkers returns empty array when called with undefined", () => {
    expect(mapBreakpointsToMarkers(undefined)).toEqual([]);
  });
});
