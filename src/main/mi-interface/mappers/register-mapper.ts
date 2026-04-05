import { gdbRegisters } from "../gdb-state-database/types/gdbStateTypes";

/**
 * Creates a new gdbRegisters entry when a register value update arrives.
 * Computes the `changed` flag by comparing new and previous values.
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
