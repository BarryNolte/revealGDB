/**
 * Implements parameter store logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `ParameterStore`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { gdbParams } from "../types/gdbStateTypes";

export class ParameterStore {
  readonly params: Map<string, gdbParams> = new Map<string, gdbParams>();

  /**
   * Performs add as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param paramName - Value for `paramName` consumed by this operation.
   * @param paramValue - Value for `paramValue` consumed by this operation.
   */
  add(paramName: string, paramValue: string): void {
    this.params.set(paramName, { name: paramName, value: paramValue });
  }

  /**
   * Returns the operation from current state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param paramName - Value for `paramName` consumed by this operation.
   * @returns The computed result produced by this operation.
   */
  get(paramName: string): gdbParams | undefined {
    return this.params.get(paramName);
  }

  list(): gdbParams[] {
    return Array.from(this.params.values());
  }

  /**
   * Clears the operation from managed state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  clear(): void {
    this.params.clear();
  }
}
