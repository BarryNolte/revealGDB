/**
 * Implements grid data mappers for revealGDB runtime behavior.
 *
 * @remarks
 * Exported symbols include `CallstackGridRow`, `mapStackFrameToGridRow`, `mapStackFramesToGridRows`, `ThreadGridRow`, `mapThreadToGridRow`, `mapThreadDataToGridRows`, `RegisterGridRow`, `mapRegisterToGridRow`, and others. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import {
  gdbBreakpoint,
  gdbRegisters,
  gdbStackFrame,
  gdbThread,
  gdbThreadGroup,
} from "../../common/gdb-state-types";

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

/**
 * Maps source input into stack frame to grid row output.
 *
 * @param frame - Value for `frame` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
/**
 * Performs mapStackFrameToGridRow as part of this module's internal workflow.
 *
 * @param frame - frame parameter.
 * @returns The computed result produced by this operation.
 */
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

/**
 * Maps source input into stack frames to grid rows output.
 *
 * @param frames - Value for `frames` consumed by this operation.
 * @returns The resulting collection produced by this operation.
 */
/**
 * Performs mapStackFramesToGridRows as part of this module's internal workflow.
 *
 * @param frames - frames parameter.
 * @returns The computed result produced by this operation.
 */
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

/**
 * Maps source input into thread to grid row output.
 *
 * @param thread - Value for `thread` consumed by this operation.
 * @param groupId - Unique identifier used to look up the target entity.
 * @returns The computed result produced by this operation.
 */
/**
 * Performs mapThreadToGridRow as part of this module's internal workflow.
 *
 * @param thread - thread parameter.
 * @param groupId - groupId parameter.
 * @returns The computed result produced by this operation.
 */
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

/**
 * Maps source input into thread data to grid rows output.
 *
 * @param threads - Map of keyed values consumed or updated by this operation.
 * @param groups - Map of keyed values consumed or updated by this operation.
 * @returns The resulting collection produced by this operation.
 */
/**
 * Performs mapThreadDataToGridRows as part of this module's internal workflow.
 *
 * @param threads - threads parameter.
 * @param gdbThread> | gdbThread[] - gdbThread> | gdbThread[] parameter.
 * @param groups - groups parameter.
 * @param gdbThreadGroup> | gdbThreadGroup[] - gdbThreadGroup> | gdbThreadGroup[] parameter.
 * @returns The computed result produced by this operation.
 */
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

/**
 * Maps source input into register to grid row output.
 *
 * @param reg - Value for `reg` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
/**
 * Performs mapRegisterToGridRow as part of this module's internal workflow.
 *
 * @param reg - reg parameter.
 * @returns The computed result produced by this operation.
 */
export function mapRegisterToGridRow(reg: gdbRegisters): RegisterGridRow {
  return {
    name: reg.name,
    value: reg.value,
    changed: reg.changed,
  };
}

/**
 * Maps source input into registers to grid rows output.
 *
 * @param registers - Map of keyed values consumed or updated by this operation.
 * @returns The resulting collection produced by this operation.
 */
/**
 * Performs mapRegistersToGridRows as part of this module's internal workflow.
 *
 * @param registers - registers parameter.
 * @param gdbRegisters> - gdbRegisters> parameter.
 * @returns The computed result produced by this operation.
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

/**
 * Maps source input into breakpoint to grid row output.
 *
 * @param bp - Value for `bp` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
/**
 * Performs mapBreakpointToGridRow as part of this module's internal workflow.
 *
 * @param bp - bp parameter.
 * @returns The computed result produced by this operation.
 */
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

/**
 * Maps source input into breakpoints to grid rows output.
 *
 * @param breakpoints - Map of keyed values consumed or updated by this operation.
 * @returns The resulting collection produced by this operation.
 */
/**
 * Performs mapBreakpointsToGridRows as part of this module's internal workflow.
 *
 * @param breakpoints - breakpoints parameter.
 * @param gdbBreakpoint> - gdbBreakpoint> parameter.
 * @returns The computed result produced by this operation.
 */
export function mapBreakpointsToGridRows(
  breakpoints: Map<string, gdbBreakpoint>,
): BreakpointGridRow[] {
  const rows: BreakpointGridRow[] = [];
  breakpoints.forEach((bp) => {
    rows.push(mapBreakpointToGridRow(bp));
  });
  return rows;
}
