/**
 * Implements uinotifier logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `UINotifier`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { LocalsContainer } from "../../gdb-parsers/gdb-locals";
import {
  gdbBreakpoint,
  gdbRegisters,
  gdbShowSourceInfo,
  gdbStackFrame,
  gdbThread,
  gdbThreadGroup,
} from "../types/gdbStateTypes";

export interface UINotifier {
  sendLocals(locals: LocalsContainer | undefined): void;
  sendStackFrames(frames: gdbStackFrame[]): void;
  sendBreakpoints(bkpts: Map<string, gdbBreakpoint>): void;
  sendRegisters(regs: Map<string, gdbRegisters>): void;
  sendThreads(threads: Map<string, gdbThread>, groups: Map<string, gdbThreadGroup>): void;
  sendSourceFile(info: gdbShowSourceInfo): void;
}
