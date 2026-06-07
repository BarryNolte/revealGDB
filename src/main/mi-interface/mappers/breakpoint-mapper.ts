/**
 * Implements breakpoint mapper logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `mapRegexGroupsToBreakpoint`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { gdbBreakpoint } from "../gdb-state-database/types/gdbStateTypes";
/**
 * Performs getGroup as part of this module's internal workflow.
 *
 * @param groups - groups parameter.
 * @param string> | undefined - string> | undefined parameter.
 * @param key - key parameter.
 * @returns The computed result produced by this operation.
 */

function getGroup(groups: Record<string, string> | undefined, key: string): string {
  return groups?.[key] ?? "";
}

/**
 * Maps source input into regex groups to breakpoint output.
 *
 * @remarks
 * Participates in the MI processing pipeline that updates debugger state and notifications.
 *
 * @param groups - Value for `groups` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
/**
 * Performs mapRegexGroupsToBreakpoint as part of this module's internal workflow.
 *
 * @param groups - groups parameter.
 * @param string> | undefined - string> | undefined parameter.
 * @returns The computed result produced by this operation.
 */
export function mapRegexGroupsToBreakpoint(
  groups: Record<string, string> | undefined,
): gdbBreakpoint {
  return {
    number: getGroup(groups, "number"),
    type: getGroup(groups, "type"),
    disp: getGroup(groups, "disp"),
    enabled: getGroup(groups, "enabled"),
    addr: getGroup(groups, "addr"),
    func: getGroup(groups, "func"),
    file: getGroup(groups, "file"),
    fullname: getGroup(groups, "fullname"),
    line: getGroup(groups, "line"),
    tg: getGroup(groups, "tg"),
    times: getGroup(groups, "times"),
    installed: getGroup(groups, "installed"),
    orgloc: getGroup(groups, "orgLoc") || getGroup(groups, "orgloc"),
  };
}
