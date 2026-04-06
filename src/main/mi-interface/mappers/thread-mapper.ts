/**
 * Implements thread mapper logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `mapAddThreadArgsToThread`, `mapRegexGroupsToAddThreadArgs`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { AddThreadArgs, gdbThread } from "../gdb-state-database/types/gdbStateTypes";

/**
 * Maps source input into add thread args to thread output.
 *
 * @remarks
 * Participates in the MI processing pipeline that updates debugger state and notifications.
 *
 * @param args - Configuration values that control how this operation executes.
 * @returns The computed result produced by this operation.
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
 * Maps source input into regex groups to add thread args output.
 *
 * @remarks
 * Participates in the MI processing pipeline that updates debugger state and notifications.
 *
 * @param groups - Value for `groups` consumed by this operation.
 * @param frameGroups - Value for `frameGroups` consumed by this operation.
 * @param active - Value for `active` consumed by this operation.
 * @returns The computed result produced by this operation.
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
