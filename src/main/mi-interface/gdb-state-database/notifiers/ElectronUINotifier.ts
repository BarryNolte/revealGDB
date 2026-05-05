/**
 * Implements electron uinotifier logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `ElectronUINotifier`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { sendToRenderer } from "../../../ipc-sender";
import { LocalsContainer } from "../../gdb-parsers/gdb-locals";
import {
  gdbBreakpoint,
  gdbRegisters,
  gdbShowSourceInfo,
  gdbStackFrame,
  gdbThread,
  gdbThreadGroup,
} from "../types/gdbStateTypes";
import { UINotifier } from "./UINotifier";

export class ElectronUINotifier implements UINotifier {
  /**
   * Performs send locals as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param locals - Value for `locals` consumed by this operation.
   */
  sendLocals(locals: LocalsContainer | undefined): void {
    sendToRenderer("data-locals", locals?.locals);
  }

  /**
   * Performs send stack frames as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param frames - Value for `frames` consumed by this operation.
   */
  sendStackFrames(frames: gdbStackFrame[]): void {
    sendToRenderer("stack-frames", frames);
  }

  /**
   * Performs send breakpoints as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param bkpts - Map of keyed values consumed or updated by this operation.
   */
  sendBreakpoints(bkpts: Map<string, gdbBreakpoint>): void {
    sendToRenderer("data-brkpts", bkpts);
  }

  /**
   * Performs send registers as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param regs - Map of keyed values consumed or updated by this operation.
   */
  sendRegisters(regs: Map<string, gdbRegisters>): void {
    sendToRenderer("data-register", regs);
  }

  /**
   * Performs send threads as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param threads - Map of keyed values consumed or updated by this operation.
   * @param groups - Map of keyed values consumed or updated by this operation.
   */
  sendThreads(threads: Map<string, gdbThread>, groups: Map<string, gdbThreadGroup>): void {
    sendToRenderer("data-threads", {
      th: threads,
      grp: groups,
    });
  }

  /**
   * Performs send source file as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param info - Value for `info` consumed by this operation.
   */
  sendSourceFile(info: gdbShowSourceInfo): void {
    sendToRenderer("source-file", info);
  }
}
