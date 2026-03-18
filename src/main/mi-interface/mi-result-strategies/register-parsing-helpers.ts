import { getRegexGroups, getRegexMatches } from "./regex-parsing-helpers";

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
