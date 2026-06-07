/**
 * Implements register mapper logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `mapToRegisterEntry`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { gdbRegisters } from "../gdb-state-database/types/gdbStateTypes";

/**
 * Maps source input into to register entry output.
 *
 * @remarks
 * Participates in the MI processing pipeline that updates debugger state and notifications.
 *
 * @param index - Zero-based index used to address a specific item.
 * @param regValue - Value for `regValue` consumed by this operation.
 * @param existing - Value for `existing` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
/**
 * Performs mapToRegisterEntry as part of this module's internal workflow.
 *
 * @param index - index parameter.
 * @param regValue - regValue parameter.
 * @param existing - existing parameter.
 * @returns The computed result produced by this operation.
 */
export function mapToRegisterEntry(
  index: string,
  regValue: string,
  existing: gdbRegisters | undefined,
): gdbRegisters {
  return {
    name: existing ? existing.name : index,
    value: regValue,
    changed: regValue !== (existing ? existing.value : ""),
  };
}
