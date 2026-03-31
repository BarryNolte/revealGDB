import { describe, expect, it } from "vitest";
import { ThreadGroupStore } from "./ThreadGroupStore";

describe("ThreadGroupStore", () => {
  it("creates thread groups and manages thread membership", () => {
    const store = new ThreadGroupStore();

    store.addThreadGroup("i1");
    expect(store.hasThreadGroup("i1")).toBe(true);
    expect(store.getThreadGroup("i1")?.gid).toBe("i1");

    store.createThread("1", "i1");
    store.createThread("2", "i1");
    expect(Array.from(store.getThreadGroup("i1")?.threads.keys() ?? [])).toEqual(["1", "2"]);

    store.removeThreadFromGroup("i1", "1");
    expect(Array.from(store.getThreadGroup("i1")?.threads.keys() ?? [])).toEqual(["2"]);

    store.removeThreadGroup("i1");
    expect(store.hasThreadGroup("i1")).toBe(false);
  });

  it("clears all thread groups", () => {
    const store = new ThreadGroupStore();
    store.addThreadGroup("i1");
    store.addThreadGroup("i2");

    store.clear();

    expect(store.threadGroups.size).toBe(0);
  });
});
