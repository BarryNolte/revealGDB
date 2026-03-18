export function getRegexGroups(input: string, rgx: RegExp): RegExpMatchArray["groups"] {
  return rgx.exec(input)?.groups;
}

export function getRegexMatches(input: string, rgx: RegExp): RegExpExecArray[] {
  return Array.from(input.matchAll(rgx));
}
