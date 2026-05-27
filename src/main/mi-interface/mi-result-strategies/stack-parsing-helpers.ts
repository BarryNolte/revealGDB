/**
 * Implements stack parsing helpers logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `ParsedStackFrameData`, `parseStackFrameFromGroups`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
export type ParsedStackFrameData = {
  level: string;
  addr: string;
  func: string;
  args: string;
  file: string;
  fullName: string;
  line: string;
  from: string;
  arch: string;
};

function grp(groups: RegExpExecArray["groups"], key: string, fallback = ""): string {
  return groups?.[key] || fallback;
}

/**
 * Parses input into stack frame from groups data.
 *
 * @remarks
 * Participates in the MI processing pipeline that updates debugger state and notifications.
 *
 * @param groups - Value for `groups` consumed by this operation.
 * @param defaultArgs - Value for `defaultArgs` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
export function parseStackFrameFromGroups(
  groups: RegExpExecArray["groups"],
  defaultArgs = "",
): ParsedStackFrameData {
  return {
    level: grp(groups, "level"),
    addr: grp(groups, "addr"),
    func: grp(groups, "func"),
    args: grp(groups, "args", defaultArgs),
    file: grp(groups, "file"),
    fullName: grp(groups, "fullname"),
    line: grp(groups, "line"),
    from: grp(groups, "from"),
    arch: grp(groups, "arch"),
  };
}
