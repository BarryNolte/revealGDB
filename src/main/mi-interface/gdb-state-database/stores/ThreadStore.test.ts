import { describe, expect, it } from "vitest";
import { ThreadGroupStore } from "./ThreadGroupStore";
import { ThreadStore } from "./ThreadStore";

describe("ThreadStore", () => {
  function createThread(id: string, groupId: string) {
    return {
      id,
      targetId: `Thread ${id}`,
      details: `${groupId}-details`,
      name: `Thread ${id}`,
      state: "stopped",
      active: id === "1",
      frame: {
        level: "0",
        addr: "0x1000",
        func: "main",
        args: "",
        file: "main.c",
        fullName: "/tmp/main.c",
        line: "12",
        arch: "arm",
      },
    };
  }

  function createThreadGroups() {
    const groups = new ThreadGroupStore();
    groups.addThreadGroup("i1");
    groups.addThreadGroup("i2");
    groups.createThread("1", "i1");
    groups.createThread("2", "i1");
    groups.createThread("3", "i2");
    return groups;
  }

  it("adds threads with normalized frame shape and supports delete and clear", () => {
    const store = new ThreadStore();

    store.addThread(createThread("1", "i1"));
    expect(store.threads.get("1")).toEqual(
      expect.objectContaining({
        id: "1",
        name: "Thread 1",
        state: "stopped",
        frame: expect.objectContaining({
          active: false,
          from: "",
          func: "main",
        }),
      }),
    );

    store.deleteThread("1");
    expect(store.threads.has("1")).toBe(false);

    store.addThread(createThread("2", "i1"));
    store.clearThreadList();
    expect(store.threads.size).toBe(0);
  });

  it("updates thread state for start and stop operations across groups", () => {
    const store = new ThreadStore();
    const groups = createThreadGroups();

    store.addThread(createThread("1", "i1"));
    store.addThread(createThread("2", "i1"));
    store.addThread(createThread("3", "i2"));

    store.startThreadGroup("i1", groups.threadGroups);
    expect(store.threads.get("1")?.state).toBe("running");
    expect(store.threads.get("2")?.state).toBe("running");
    expect(store.threads.get("3")?.state).toBe("stopped");

    store.stopThreadsAll(groups.threadGroups);
    expect(store.threads.get("1")?.state).toBe("stopped");
    expect(store.threads.get("2")?.state).toBe("stopped");
    expect(store.threads.get("3")?.state).toBe("stopped");

    store.startThreadsAll(groups.threadGroups);
    expect(store.threads.get("1")?.state).toBe("running");
    expect(store.threads.get("2")?.state).toBe("running");
    expect(store.threads.get("3")?.state).toBe("running");
  });

  it("removes only the threads that belong to a stopped group", () => {
    const store = new ThreadStore();
    const groups = createThreadGroups();

    store.addThread(createThread("1", "i1"));
    store.addThread(createThread("2", "i1"));
    store.addThread(createThread("3", "i2"));

    store.stopThreadGroup("i1", groups.threadGroups);

    expect(store.threads.has("1")).toBe(false);
    expect(store.threads.has("2")).toBe(false);
    expect(store.threads.has("3")).toBe(true);
  });
});
