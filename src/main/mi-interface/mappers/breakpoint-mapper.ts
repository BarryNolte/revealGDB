import { gdbBreakpoint } from "../gdb-state-database/types/gdbStateTypes";

/**
 * Safely maps regex named-capture groups to a typed gdbBreakpoint,
 * replacing unsafe `as gdbBreakpoint` casts.
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
