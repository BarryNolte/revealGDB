/**
 * Implements regex parsing helpers logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `getRegexGroups`, `getRegexMatches`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */

export function getRegexGroups(input: string, rgx: RegExp): RegExpMatchArray["groups"] {
  return rgx.exec(input)?.groups;
}

/**
 * Returns regex matches from current state.
 *
 * @remarks
 * Participates in the MI processing pipeline that updates debugger state and notifications.
 *
 * @param input - Value for `input` consumed by this operation.
 * @param rgx - Value for `rgx` consumed by this operation.
 * @returns The resulting collection produced by this operation.
 */
export function getRegexMatches(input: string, rgx: RegExp): RegExpExecArray[] {
  return Array.from(input.matchAll(rgx));
}
