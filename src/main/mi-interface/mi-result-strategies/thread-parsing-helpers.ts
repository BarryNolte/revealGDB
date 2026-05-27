/**
 * Implements thread parsing helpers logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `ParsedThreadFrameData`, `parseThreadFrameFromGroups`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
export type ParsedThreadFrameData = {
  level: string;
  addr: string;
  func: string;
  args: string;
  file: string;
  fullName: string;
  line: string;
  arch: string;
};

function grp(groups: RegExpExecArray["groups"], key: string): string {
  return groups?.[key] || "";
}

/**
 * Parses input into thread frame from groups data.
 *
 * @remarks
 * Participates in the MI processing pipeline that updates debugger state and notifications.
 *
 * @param groups - Value for `groups` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
export function parseThreadFrameFromGroups(
  groups: RegExpExecArray["groups"],
): ParsedThreadFrameData {
  return {
    level: grp(groups, "level"),
    addr: grp(groups, "addr"),
    func: grp(groups, "func"),
    args: grp(groups, "args"),
    file: grp(groups, "file"),
    fullName: grp(groups, "fullname"),
    line: grp(groups, "line"),
    arch: grp(groups, "arch"),
  };
}
