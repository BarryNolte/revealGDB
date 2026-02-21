/**
 * Tokenizes gdb disassembly lines for renderer highlighting.
 */
import { DisasmToken } from "../gdb-state-database/gdbStateDatabase";

const tokenRegex = /[^\s]+\\t|<[^>]+>|0x[0-9A-Fa-f]+|\(|\)|\S+/g;

export function parseDisasmTokens(input: string): DisasmToken[] {
  if (!input) {
    return [];
  }

  const tokens: DisasmToken[] = [];
  const matches = input.match(tokenRegex) ?? [];

  if (matches.length === 1) {
    const token = matches[0];
    tokens.push({ value: token, type: "instruction" });
    return tokens;
  }

  for (const token of matches) {
    if (token.endsWith("\\t")) {
      tokens.push({ value: token.slice(0, -2), type: "instruction" });
      continue;
    }
    if (token === "(") {
      tokens.push({ value: token, type: "leftparen" });
      continue;
    }
    if (token === ")") {
      tokens.push({ value: token, type: "rightparen" });
      continue;
    }
    if (token.startsWith("0x")) {
      tokens.push({ value: token, type: "address" });
      continue;
    }
    if (token.startsWith("<") && token.endsWith(">")) {
      tokens.push({ value: token, type: "function" });
      continue;
    }

    tokens.push({ value: token, type: "text" });
  }

  return tokens;
}
