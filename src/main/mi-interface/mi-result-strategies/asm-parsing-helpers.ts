/**
 * Implements asm parsing helpers logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `parseAsmRows`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { gdbAsmRow } from "../gdb-state-database/gdbStateDatabase";
import { getRegexGroups, getRegexMatches } from "./regex-parsing-helpers";

/**
 * Parses input into asm rows data.
 *
 * @remarks
 * Participates in the MI processing pipeline that updates debugger state and notifications.
 *
 * @param output - Value for `output` consumed by this operation.
 * @param rgxAsmData - Value for `rgxAsmData` consumed by this operation.
 * @param rgxAsmRow - Value for `rgxAsmRow` consumed by this operation.
 * @param parseInstructions - Callback invoked when the associated event occurs.
 * @returns The resulting collection produced by this operation.
 */
export function parseAsmRows(
  output: string,
  rgxAsmData: RegExp,
  rgxAsmRow: RegExp,
  parseInstructions: (inst: string) => gdbAsmRow["instructions"],
): gdbAsmRow[] {
  const asmList = getRegexGroups(output, rgxAsmData)?.asm_list || "";
  const asmRows = getRegexMatches(asmList, rgxAsmRow);

  let currentFunc = "";
  let currentFuncFirstAddress = "";

  return asmRows.map((asmRow) => {
    const address = asmRow.groups?.address || "";
    const func = asmRow.groups?.func || "";
    const offset = asmRow.groups?.offset || "";
    const opcodes = asmRow.groups?.opcodes || "";
    const inst = asmRow.groups?.inst || "";

    if (func !== currentFunc) {
      currentFunc = func;
      currentFuncFirstAddress = address;
    }

    const funcWithAddress = currentFuncFirstAddress ? `${currentFuncFirstAddress}-${func}` : func;

    return {
      address,
      func: funcWithAddress,
      offset,
      opcodes,
      instructions: parseInstructions(inst),
    };
  });
}
