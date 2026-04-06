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
    level: groups?.level || "",
    addr: groups?.addr || "",
    func: groups?.func || "",
    args: groups?.args || "",
    file: groups?.file || "",
    fullName: groups?.fullname || "",
    line: groups?.line || "",
    arch: groups?.arch || "",
  };
}
