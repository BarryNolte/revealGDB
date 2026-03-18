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
