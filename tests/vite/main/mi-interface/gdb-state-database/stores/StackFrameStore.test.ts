import { describe, expect, it } from "vitest";
import { StackFrameStore } from "../../../../../../src/main/mi-interface/gdb-state-database/stores/StackFrameStore";

describe("StackFrameStore", () => {
  function createFrame(level: string) {
    return {
      active: false,
      level,
      func: "main",
      addr: "0x1000",
      args: "",
      file: "main.c",
      fullName: "/tmp/main.c",
      line: "12",
      from: "",
      arch: "arm",
    };
  }

  it("adds and clears stack frames", () => {
    const store = new StackFrameStore();

    store.add(createFrame("0"));
    store.add(createFrame("1"));
    expect(store.stackFrames).toHaveLength(2);

    store.clear();
    expect(store.stackFrames).toHaveLength(0);
  });

  it("sets a single active frame when the index is valid", () => {
    const store = new StackFrameStore();
    store.add(createFrame("0"));
    store.add(createFrame("1"));
    store.add(createFrame("2"));

    store.setActiveFrame(1);

    expect(store.stackFrames.map((frame) => frame.active)).toEqual([false, true, false]);
  });

  it("ignores invalid active frame indexes", () => {
    const store = new StackFrameStore();
    store.add(createFrame("0"));

    store.setActiveFrame(-1);
    store.setActiveFrame(2);

    expect(store.stackFrames[0].active).toBe(false);
  });
});
