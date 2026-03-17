import { gdbStackFrame } from "../types/gdbStateTypes";

export class StackFrameStore {
  readonly stackFrames: gdbStackFrame[] = [];

  clear(): void {
    this.stackFrames.length = 0;
  }

  add(frame: gdbStackFrame): void {
    this.stackFrames.push(frame);
  }

  setActiveFrame(af: number): void {
    if (af < 0 || af >= this.stackFrames.length) {
      return;
    }

    this.stackFrames.forEach((sf: gdbStackFrame, idx) => {
      sf.active = false;
      if (af == idx) {
        sf.active = true;
      }
    });
  }
}
