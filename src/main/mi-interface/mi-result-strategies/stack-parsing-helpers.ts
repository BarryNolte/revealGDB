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

export function parseStackFrameFromGroups(
  groups: RegExpExecArray["groups"],
  defaultArgs = "",
): ParsedStackFrameData {
  return {
    level: groups?.level || "",
    addr: groups?.addr || "",
    func: groups?.func || "",
    args: groups?.args || defaultArgs,
    file: groups?.file || "",
    fullName: groups?.fullname || "",
    line: groups?.line || "",
    from: groups?.from || "",
    arch: groups?.arch || "",
  };
}
