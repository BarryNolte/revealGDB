/**
 * Implements breakpoint store logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `BreakpointStore`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { gdbBreakpoint } from "../types/gdbStateTypes";

export class BreakpointStore {
  readonly breakpoints: Map<string, gdbBreakpoint> = new Map<string, gdbBreakpoint>();

  /**
   * Clears the operation from managed state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  clear(): void {
    this.breakpoints.clear();
  }

  /**
   * Creates the operation for downstream use.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param bkpt - Value for `bkpt` consumed by this operation.
   */
  create(bkpt: gdbBreakpoint): void {
    this.breakpoints.set(bkpt.number, bkpt);
  }

  /**
   * Updates the operation using supplied inputs.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param bkpt - Value for `bkpt` consumed by this operation.
   */
  update(bkpt: gdbBreakpoint): void {
    this.breakpoints.set(bkpt.number, bkpt);
  }

  /**
   * Removes the operation from managed state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param id - Unique identifier used to look up the target entity.
   */
  delete(id: string): void {
    this.breakpoints.delete(id);
  }
}
