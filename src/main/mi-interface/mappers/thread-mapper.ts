import { AddThreadArgs, gdbThread } from "../gdb-state-database/types/gdbStateTypes";

/**
 * Maps AddThreadArgs to a fully-formed gdbThread, replacing
 * manual property-by-property assignment in ThreadStore.
 */
export function mapAddThreadArgsToThread(args: AddThreadArgs): gdbThread {
  return {
    active: args.active,
    id: args.id,
    targetId: args.targetId,
    details: args.details,
    name: args.name,
    state: args.state,
    frame: {
      active: false,
      level: args.frame.level,
      func: args.frame.func,
      addr: args.frame.addr,
      args: args.frame.args,
      file: args.frame.file,
      fullName: args.frame.fullName,
      line: args.frame.line,
      from: "",
      arch: args.frame.arch,
    },
  };
}

/**
 * Maps regex named-capture groups from a thread result into
 * AddThreadArgs suitable for ThreadStore.addThread().
 */
export function mapRegexGroupsToAddThreadArgs(
  groups: Record<string, string> | undefined,
  frameGroups: {
    level: string;
    addr: string;
    func: string;
    args: string;
    file: string;
    fullName: string;
    line: string;
    arch: string;
  },
  active: boolean,
): AddThreadArgs {
  return {
    id: groups?.tid ?? "",
    targetId: groups?.targId ?? "",
    name: groups?.name ?? "",
    details: groups?.details ?? "",
    frame: frameGroups,
    state: groups?.state ?? "",
    active,
  };
}
