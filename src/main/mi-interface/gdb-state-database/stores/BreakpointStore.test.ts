import { describe, expect, it } from "vitest";
import { BreakpointStore } from "./BreakpointStore";

describe("BreakpointStore", () => {
  function createBreakpoint(number: string) {
    return {
      number,
      type: "breakpoint",
      disp: "keep",
      enabled: "y",
      addr: "0x1000",
      func: "main",
      file: "main.c",
      fullname: "/tmp/main.c",
      line: "12",
      tg: "i1",
      times: "0",
      installed: "y",
      orgloc: `main.c:${number}`,
    };
  }

  it("creates, updates, deletes, and clears breakpoints", () => {
    const store = new BreakpointStore();
    const created = createBreakpoint("1");

    store.create(created);
    expect(store.breakpoints.get("1")).toEqual(created);

    store.update({ ...created, enabled: "n", times: "3" });
    expect(store.breakpoints.get("1")?.enabled).toBe("n");
    expect(store.breakpoints.get("1")?.times).toBe("3");

    store.delete("1");
    expect(store.breakpoints.has("1")).toBe(false);

    store.create(createBreakpoint("2"));
    store.clear();
    expect(store.breakpoints.size).toBe(0);
  });
});
