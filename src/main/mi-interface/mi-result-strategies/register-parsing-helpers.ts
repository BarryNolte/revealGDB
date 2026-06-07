/**
 * Implements register parsing helpers logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `ParsedRegisterPayload`, `parseRegisterPayload`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { getRegexGroups, getRegexMatches } from "./regex-parsing-helpers";

export type ParsedRegisterPayload = {
  names: string[];
  values: Array<{ number: string; value: string }>;
};

/**
 * Parses input into register payload data.
 *
 * @remarks
 * Participates in the MI processing pipeline that updates debugger state and notifications.
 *
 * @param resList - Value for `resList` consumed by this operation.
 * @param rgxCleanList - Value for `rgxCleanList` consumed by this operation.
 * @param rgxRegisterValues - Value for `rgxRegisterValues` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
/**
 * Performs parseRegisterPayload as part of this module's internal workflow.
 *
 * @param resList - resList parameter.
 * @param rgxCleanList - rgxCleanList parameter.
 * @param rgxRegisterValues - rgxRegisterValues parameter.
 * @returns The computed result produced by this operation.
 */
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
