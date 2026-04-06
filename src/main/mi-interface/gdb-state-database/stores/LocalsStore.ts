/**
 * Implements locals store logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `LocalsStore`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { LocalsContainer } from "../../gdb-parsers/gdb-locals";

export class LocalsStore {
  locals: LocalsContainer | undefined = undefined;

  /**
   * Parses input into and store locals data.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param localsStr - Value for `localsStr` consumed by this operation.
   */
  parseAndStoreLocals(localsStr: string): void {
    this.locals = new LocalsContainer(localsStr);
  }

  /**
   * Returns locals from current state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @returns The computed result produced by this operation.
   */
  getLocals(): LocalsContainer | undefined {
    return this.locals;
  }

  /**
   * Clears locals from managed state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  clearLocals(): void {
    this.locals = undefined;
  }
}
