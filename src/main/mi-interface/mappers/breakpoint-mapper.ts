/**
 * Implements breakpoint mapper logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `mapRegexGroupsToBreakpoint`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { gdbBreakpoint } from "../gdb-state-database/types/gdbStateTypes";

/**
 * Maps source input into regex groups to breakpoint output.
 *
 * @remarks
 * Participates in the MI processing pipeline that updates debugger state and notifications.
 *
 * @param groups - Value for `groups` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
export function mapRegexGroupsToBreakpoint(
  groups: Record<string, string> | undefined,
): gdbBreakpoint {
  return {
    number: groups?.number ?? "",
    type: groups?.type ?? "",
    disp: groups?.disp ?? "",
    enabled: groups?.enabled ?? "",
    addr: groups?.addr ?? "",
    func: groups?.func ?? "",
    file: groups?.file ?? "",
    fullname: groups?.fullname ?? "",
    line: groups?.line ?? "",
    tg: groups?.tg ?? "",
    times: groups?.times ?? "",
    installed: groups?.installed ?? "",
    orgloc: groups?.orgLoc ?? groups?.orgloc ?? "",
  };
}
