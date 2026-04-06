/**
 * Implements stack frame store logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `StackFrameStore`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { gdbStackFrame } from "../types/gdbStateTypes";

export class StackFrameStore {
  readonly stackFrames: gdbStackFrame[] = [];

  /**
   * Clears the operation from managed state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  clear(): void {
    this.stackFrames.length = 0;
  }

  /**
   * Performs add as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param frame - Value for `frame` consumed by this operation.
   */
  add(frame: gdbStackFrame): void {
    this.stackFrames.push(frame);
  }

  /**
   * Sets active frame on current state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param af - Value for `af` consumed by this operation.
   */
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
