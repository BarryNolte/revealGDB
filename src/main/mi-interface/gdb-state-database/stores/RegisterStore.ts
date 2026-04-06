/**
 * Implements register store logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `RegisterStore`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { mapToRegisterEntry } from "../../mappers/register-mapper";
import { gdbRegisters } from "../types/gdbStateTypes";

export class RegisterStore {
  readonly registers: Map<string, gdbRegisters> = new Map<string, gdbRegisters>();

  /**
   * Performs add register as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param index - Zero-based index used to address a specific item.
   * @param regName - Value for `regName` consumed by this operation.
   */
  addRegister(index: string, regName: string): void {
    const reg = this.registers.get(index);
    if (reg) {
      reg.name = regName;
    } else {
      this.registers.set(index, { name: regName, value: "", changed: false });
    }
  }

  /**
   * Performs add register value as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param index - Zero-based index used to address a specific item.
   * @param regValue - Value for `regValue` consumed by this operation.
   */
  addRegisterValue(index: string, regValue: string): void {
    this.registers.set(index, mapToRegisterEntry(index, regValue, this.registers.get(index)));
  }

  /**
   * Returns the operation from current state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param index - Zero-based index used to address a specific item.
   * @returns The computed result produced by this operation.
   */
  get(index: string): gdbRegisters | undefined {
    return this.registers.get(index);
  }

  /**
   * Clears the operation from managed state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  clear(): void {
    this.registers.clear();
  }
}
