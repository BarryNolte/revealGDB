import { gdbAsmRow } from "../gdb-state-database/gdbStateDatabase";

export type ParsedFrameData = {
  level: string;
  addr: string;
  func: string;
  args: string;
  file: string;
  fullName: string;
  line: string;
  from: string;
  arch: string;
};

export function getRegexGroups(input: string, rgx: RegExp): RegExpMatchArray["groups"] {
  return rgx.exec(input)?.groups;
}

export function getRegexMatches(input: string, rgx: RegExp): RegExpExecArray[] {
  return Array.from(input.matchAll(rgx));
}

export function parseFrameDataFromGroups(
  groups: RegExpExecArray["groups"],
  defaultArgs = "",
): ParsedFrameData {
  return {
    level: groups?.level || "",
    addr: groups?.addr || "",
    func: groups?.func || "",
    args: groups?.args || defaultArgs,
    file: groups?.file || "",
    fullName: groups?.fullname || "",
    line: groups?.line || "",
    from: groups?.from || "",
    arch: groups?.arch || "",
  };
}

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

export type ParsedRegisterPayload = {
  names: string[];
  values: Array<{ number: string; value: string }>;
};

export function parseRegisterPayload(
  resList: string,
  rgxCleanList: RegExp,
  rgxRegisterValues: RegExp,
): ParsedRegisterPayload {
  if (resList.startsWith('["')) {
    const cleanList = getRegexGroups(resList, rgxCleanList)?.list || "";
    return {
      names: cleanList.split(",").map((registerName) => registerName.replaceAll('"', "")),
      values: [],
    };
  }

  return {
    names: [],
    values: getRegexMatches(resList, rgxRegisterValues)
      .map((regChunk) => ({
        number: regChunk.groups?.number || "",
        value: regChunk.groups?.value || "",
      }))
      .filter((regValue) => regValue.number.length > 0 && regValue.value.length > 0),
  };
}
