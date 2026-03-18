import { gdbAsmRow } from "../gdb-state-database/gdbStateDatabase";
import { getRegexGroups, getRegexMatches } from "./regex-parsing-helpers";

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
