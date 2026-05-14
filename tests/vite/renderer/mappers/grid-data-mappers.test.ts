import { describe, expect, it } from "vitest";
import {
  mapBreakpointToGridRow,
  mapBreakpointsToGridRows,
  mapRegisterToGridRow,
  mapRegistersToGridRows,
  mapStackFrameToGridRow,
  mapStackFramesToGridRows,
  mapThreadDataToGridRows,
  mapThreadToGridRow,
} from "../../../../src/renderer/mappers/grid-data-mappers";
import type {
  gdbBreakpoint,
  gdbRegisters,
  gdbStackFrame,
  gdbThread,
  gdbThreadGroup,
} from "../../../../src/common/gdb-state-types";

// ─── Helpers ────────────────────────────────────────────────

function makeFrame(overrides: Partial<gdbStackFrame> = {}): gdbStackFrame {
  return {
    active: false,
    level: "0",
    func: "main",
    addr: "0x1000",
    args: "",
    file: "main.c",
    fullName: "/src/main.c",
    line: "42",
    from: "",
    arch: "i386:x86-64",
    ...overrides,
  };
}

function makeThread(overrides: Partial<gdbThread> = {}): gdbThread {
  return {
    active: false,
    id: "1",
    targetId: "Thread 1",
    details: "detail",
    name: "thread-name",
    state: "stopped",
    frame: makeFrame(),
    ...overrides,
  };
}

function makeGroup(overrides: Partial<gdbThreadGroup> = {}): gdbThreadGroup {
  return {
    gid: "i1",
    threads: new Map(),
    ...overrides,
  };
}

function makeRegister(overrides: Partial<gdbRegisters> = {}): gdbRegisters {
  return { name: "rax", value: "0x00", changed: false, ...overrides };
}

function makeBreakpoint(overrides: Partial<gdbBreakpoint> = {}): gdbBreakpoint {
  return {
    number: "1",
    type: "breakpoint",
    disp: "keep",
    enabled: "y",
    addr: "0x400500",
    func: "main",
    file: "/src/main.c",
    fullname: "/src/main.c",
    line: "10",
    tg: "[i1]",
    times: "0",
    installed: "y",
    orgloc: "",
    ...overrides,
  };
}

// ─── Stack frames ────────────────────────────────────────────

describe("mapStackFrameToGridRow", () => {
  it("maps all fields from a stack frame", () => {
    const frame = makeFrame({ active: true, level: "1", func: "foo", addr: "0x2000" });
    const row = mapStackFrameToGridRow(frame);

    expect(row.active).toBe("*");
    expect(row.level).toBe("1");
    expect(row.func).toBe("foo");
    expect(row.addr).toBe("0x2000");
    expect(row.args).toBe("");
    expect(row.file).toBe("main.c");
    expect(row.fullName).toBe("/src/main.c");
    expect(row.line).toBe("42");
    expect(row.from).toBe("");
    expect(row.arch).toBe("i386:x86-64");
  });

  it("sets active to empty string when frame is not active", () => {
    const row = mapStackFrameToGridRow(makeFrame({ active: false }));
    expect(row.active).toBe("");
  });
});

describe("mapStackFramesToGridRows", () => {
  it("maps an empty array to an empty array", () => {
    expect(mapStackFramesToGridRows([])).toEqual([]);
  });

  it("maps multiple frames in order", () => {
    const frames = [makeFrame({ level: "0" }), makeFrame({ level: "1" }), makeFrame({ level: "2" })];
    const rows = mapStackFramesToGridRows(frames);
    expect(rows).toHaveLength(3);
    expect(rows[0].level).toBe("0");
    expect(rows[1].level).toBe("1");
    expect(rows[2].level).toBe("2");
  });
});

// ─── Threads ─────────────────────────────────────────────────

describe("mapThreadToGridRow", () => {
  it("maps all thread fields with groupId", () => {
    const thread = makeThread({ active: true, id: "2", state: "running" });
    const row = mapThreadToGridRow(thread, "i2");

    expect(row.groupId).toBe("i2");
    expect(row.active).toBe(true);
    expect(row.id).toBe("2");
    expect(row.targetId).toBe("Thread 1");
    expect(row.state).toBe("running");
    expect(row.frame).toContain("main");
  });

  it("formats frame as func:line", () => {
    const thread = makeThread({ frame: makeFrame({ func: "foo", line: "99" }) });
    const row = mapThreadToGridRow(thread, "i1");
    expect(row.frame).toBe("foo:99");
  });
});

describe("mapThreadDataToGridRows", () => {
  it("returns empty array for empty inputs", () => {
    expect(mapThreadDataToGridRows([], [])).toEqual([]);
    expect(mapThreadDataToGridRows(new Map(), new Map())).toEqual([]);
  });

  it("cross-joins threads and groups from arrays", () => {
    const threads = [makeThread({ id: "1" }), makeThread({ id: "2" })];
    const groups = [makeGroup({ gid: "i1" }), makeGroup({ gid: "i2" })];
    const rows = mapThreadDataToGridRows(threads, groups);
    expect(rows).toHaveLength(4); // 2 threads × 2 groups
  });

  it("cross-joins threads and groups from Maps", () => {
    const threads = new Map([["1", makeThread({ id: "1" })], ["2", makeThread({ id: "2" })]]);
    const groups = new Map([["i1", makeGroup({ gid: "i1" })]]);
    const rows = mapThreadDataToGridRows(threads, groups);
    expect(rows).toHaveLength(2); // 2 threads × 1 group
  });
});

// ─── Registers ───────────────────────────────────────────────

describe("mapRegisterToGridRow", () => {
  it("maps register fields", () => {
    const reg = makeRegister({ name: "rbx", value: "0xff", changed: true });
    const row = mapRegisterToGridRow(reg);
    expect(row.name).toBe("rbx");
    expect(row.value).toBe("0xff");
    expect(row.changed).toBe(true);
  });
});

describe("mapRegistersToGridRows", () => {
  it("returns empty array for empty input", () => {
    expect(mapRegistersToGridRows([])).toEqual([]);
  });

  it("filters out registers with empty name", () => {
    const regs = [
      makeRegister({ name: "" }),
      makeRegister({ name: "rax" }),
      makeRegister({ name: "" }),
      makeRegister({ name: "rbx" }),
    ];
    const rows = mapRegistersToGridRows(regs);
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe("rax");
    expect(rows[1].name).toBe("rbx");
  });

  it("accepts a Map of registers", () => {
    const regsMap = new Map([
      ["rax", makeRegister({ name: "rax" })],
      ["rbx", makeRegister({ name: "rbx" })],
    ]);
    const rows = mapRegistersToGridRows(regsMap);
    expect(rows).toHaveLength(2);
  });
});

// ─── Breakpoints ─────────────────────────────────────────────

describe("mapBreakpointToGridRow", () => {
  it("maps breakpoint fields including basename extraction from file", () => {
    const bp = makeBreakpoint({ file: "/long/path/to/main.c", enabled: "y", tg: "[i1]" });
    const row = mapBreakpointToGridRow(bp);

    expect(row.number).toBe("1");
    expect(row.type).toBe("breakpoint");
    expect(row.disp).toBe("keep");
    expect(row.enabled).toBe(true);
    expect(row.addr).toBe("0x400500");
    expect(row.func).toBe("main");
    expect(row.file).toBe("main.c"); // basename stripped
    expect(row.line).toBe("10");
    expect(row.tg).toBe("i1"); // brackets stripped
    expect(row.times).toBe("0");
    expect(row.installed).toBe("y");
  });

  it("sets enabled=false when enabled is not 'y'", () => {
    const bp = makeBreakpoint({ enabled: "n" });
    expect(mapBreakpointToGridRow(bp).enabled).toBe(false);
  });

  it("shows '--' for missing installed field", () => {
    const bp = makeBreakpoint({ installed: "" });
    expect(mapBreakpointToGridRow(bp).installed).toBe("--");
  });

  it("strips Windows-style path separators for basename", () => {
    const bp = makeBreakpoint({ file: "C:\\Users\\user\\project\\main.c" });
    expect(mapBreakpointToGridRow(bp).file).toBe("main.c");
  });
});

describe("mapBreakpointsToGridRows", () => {
  it("returns empty array for empty map", () => {
    expect(mapBreakpointsToGridRows(new Map())).toEqual([]);
  });

  it("maps all breakpoints in the map", () => {
    const bps = new Map([
      ["1", makeBreakpoint({ number: "1" })],
      ["2", makeBreakpoint({ number: "2" })],
    ]);
    const rows = mapBreakpointsToGridRows(bps);
    expect(rows).toHaveLength(2);
  });
});
