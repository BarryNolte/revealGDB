import {
  gdbBreakpoint,
  gdbRegisters,
  gdbStackFrame,
  gdbThread,
  gdbThreadGroup,
} from "../../main/mi-interface/gdb-state-database/types/gdbStateTypes";

// ─── Callstack ──────────────────────────────────────────────

export type CallstackGridRow = {
  active: string;
  level: string;
  func: string;
  addr: string;
  args: string;
  file: string;
  fullName: string;
  line: string;
  from: string;
  arch: string;
};

export function mapStackFrameToGridRow(frame: gdbStackFrame): CallstackGridRow {
  return {
    active: frame.active ? "*" : "",
    level: frame.level,
    func: frame.func,
    addr: frame.addr,
    args: frame.args,
    file: frame.file,
    fullName: frame.fullName,
    line: frame.line,
    from: frame.from,
    arch: frame.arch,
  };
}

export function mapStackFramesToGridRows(frames: gdbStackFrame[]): CallstackGridRow[] {
  return frames.map(mapStackFrameToGridRow);
}

// ─── Threads ────────────────────────────────────────────────

export type ThreadGridRow = {
  groupId: string;
  active: boolean;
  id: string;
  targetId: string;
  details: string;
  name: string;
  state: string;
  frame: string;
};

export function mapThreadToGridRow(thread: gdbThread, groupId: string): ThreadGridRow {
  return {
    groupId,
    active: thread.active,
    id: thread.id,
    targetId: thread.targetId,
    details: thread.details,
    name: thread.name,
    state: thread.state,
    frame: `${thread.frame.func}:${thread.frame.line}`,
  };
}

export function mapThreadDataToGridRows(
  threads: Map<string, gdbThread> | gdbThread[],
  groups: Map<string, gdbThreadGroup> | gdbThreadGroup[],
): ThreadGridRow[] {
  const rows: ThreadGridRow[] = [];
  const groupArray = groups instanceof Map ? Array.from(groups.values()) : groups;
  const threadArray = threads instanceof Map ? Array.from(threads.values()) : threads;

  for (const group of groupArray) {
    for (const thread of threadArray) {
      rows.push(mapThreadToGridRow(thread, group.gid));
    }
  }
  return rows;
}

// ─── Registers ──────────────────────────────────────────────

export type RegisterGridRow = {
  name: string;
  value: string;
  changed: boolean;
};

export function mapRegisterToGridRow(reg: gdbRegisters): RegisterGridRow {
  return {
    name: reg.name,
    value: reg.value,
    changed: reg.changed,
  };
}

/**
 * Maps register data to grid rows, filtering out entries with empty names.
 * Accepts either an array or a Map (as sent over IPC).
 */
export function mapRegistersToGridRows(
  registers: gdbRegisters[] | Map<string, gdbRegisters>,
): RegisterGridRow[] {
  const arr = registers instanceof Map ? Array.from(registers.values()) : registers;
  return arr.filter((reg) => reg.name !== "").map(mapRegisterToGridRow);
}

// ─── Breakpoints ────────────────────────────────────────────

export type BreakpointGridRow = {
  number: string;
  type: string;
  disp: string;
  enabled: boolean;
  addr: string;
  func: string;
  file: string;
  fullName: string;
  line: string;
  tg: string;
  times: string;
  installed: string;
  orgloc: string;
};

export function mapBreakpointToGridRow(bp: gdbBreakpoint): BreakpointGridRow {
  return {
    number: bp.number,
    type: bp.type,
    disp: bp.disp,
    enabled: bp.enabled === "y",
    addr: bp.addr,
    func: bp.func,
    file: bp.file.replace(/^.*[\\/]/, ""),
    fullName: bp.fullname,
    line: bp.line,
    tg: bp.tg.slice(1, -1),
    times: bp.times,
    installed: bp.installed || "--",
    orgloc: bp.orgloc,
  };
}

export function mapBreakpointsToGridRows(
  breakpoints: Map<string, gdbBreakpoint>,
): BreakpointGridRow[] {
  const rows: BreakpointGridRow[] = [];
  breakpoints.forEach((bp) => {
    rows.push(mapBreakpointToGridRow(bp));
  });
  return rows;
}
