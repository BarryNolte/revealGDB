import { beforeEach, describe, expect, it } from "vitest";
import { LineVarStore } from "../../../../../../src/main/mi-interface/gdb-state-database/stores/LineVarStore";
import type { gdbLineVarMap } from "../../../../../../src/main/mi-interface/gdb-state-database/types/gdbStateTypes";

function makeLineVarMap(sourceFile: string): gdbLineVarMap {
  return {
    sourceFile,
    compilationDir: "/tmp",
    lineVars: new Map<number, unknown[]>([
      [10, [{ name: "x", type: "int" }]],
      [20, [{ name: "y", type: "float" }]],
    ]),
  } as unknown as gdbLineVarMap;
}

describe("LineVarStore", () => {
  let store: LineVarStore;

  beforeEach(() => {
    store = new LineVarStore();
  });

  it("starts empty", () => {
    expect(store.has("main.c")).toBe(false);
    expect(store.get("main.c")).toBeUndefined();
  });

  it("adds and retrieves a line-var map by source file", () => {
    const map = makeLineVarMap("main.c");
    store.add(map);

    expect(store.has("main.c")).toBe(true);
    expect(store.get("main.c")).toBe(map);
  });

  it("overwrites an existing entry when added again with the same source file", () => {
    const map1 = makeLineVarMap("main.c");
    const map2 = makeLineVarMap("main.c");

    store.add(map1);
    store.add(map2);

    expect(store.get("main.c")).toBe(map2);
  });

  it("stores multiple source files independently", () => {
    const mapA = makeLineVarMap("a.c");
    const mapB = makeLineVarMap("b.c");

    store.add(mapA);
    store.add(mapB);

    expect(store.get("a.c")).toBe(mapA);
    expect(store.get("b.c")).toBe(mapB);
  });

  it("returns undefined for unknown source files", () => {
    store.add(makeLineVarMap("main.c"));
    expect(store.get("unknown.c")).toBeUndefined();
  });

  it("clear removes all entries", () => {
    store.add(makeLineVarMap("main.c"));
    store.add(makeLineVarMap("other.c"));

    store.clear();

    expect(store.has("main.c")).toBe(false);
    expect(store.has("other.c")).toBe(false);
    expect(store.get("main.c")).toBeUndefined();
  });

  it("has returns false after clear", () => {
    store.add(makeLineVarMap("test.c"));
    store.clear();
    expect(store.has("test.c")).toBe(false);
  });
});
