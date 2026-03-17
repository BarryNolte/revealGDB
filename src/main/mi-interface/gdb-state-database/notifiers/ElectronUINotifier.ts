import { mainWindow } from "../../../main";
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
  sendLocals(locals: LocalsContainer | undefined): void {
    mainWindow.webContents.send("data-locals", locals?.locals);
  }

  sendStackFrames(frames: gdbStackFrame[]): void {
    mainWindow.webContents.send("stack-frames", frames);
  }

  sendBreakpoints(bkpts: Map<string, gdbBreakpoint>): void {
    mainWindow.webContents.send("data-brkpts", bkpts);
  }

  sendRegisters(regs: Map<string, gdbRegisters>): void {
    mainWindow.webContents.send("data-register", regs);
  }

  sendThreads(threads: Map<string, gdbThread>, groups: Map<string, gdbThreadGroup>): void {
    mainWindow.webContents.send("data-threads", {
      th: threads,
      grp: groups,
    });
  }

  sendSourceFile(info: gdbShowSourceInfo): void {
    mainWindow.webContents.send("source-file", info);
  }
}
