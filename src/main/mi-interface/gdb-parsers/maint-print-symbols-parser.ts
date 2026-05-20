/**
 * Implements maint-print-symbols-parser logic for processing GDB `maint print symbols` output.
 *
 * @remarks
 * Exported symbols include `MaintPrintSymbolsParser`, `buildLineVarMap`, `extractFieldNames`, `findDeclarationLine`, `findReferences`, `queryVarAtPosition`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import {
  gdbLineEntry,
  gdbLineVarMap,
  gdbSymbolBlock,
  gdbVarDecl,
  gdbVarLocation,
  gdbVarReference,
} from "../../../common/gdb-state-types";

// ─── Header ──────────────────────────────────────────────────────────────────

export type MaintSymbolsHeader = {
  sourceFile: string;
  compilationDir: string;
};

const rgxSymtab = /^Symtab for file\s+(?<file>\S+)/m;
const rgxCompDir = /^Compilation directory is (?<dir>.+)$/m;

function parseHeader(lines: string[]): MaintSymbolsHeader {
  const text = lines.join("\n");
  const sourceFile = rgxSymtab.exec(text)?.groups?.file ?? "";
  const compilationDir = rgxCompDir.exec(text)?.groups?.dir ?? "";
  return { sourceFile, compilationDir };
}

// ─── Line Table ──────────────────────────────────────────────────────────────

const rgxLineEntry = /^\s+line\s+(?<num>\d+)\s+at\s+(?<addr>0x[0-9a-f]+)(?<stmt>\s+\(stmt\))?/i;

function parseLineTable(lines: string[]): gdbLineEntry[] {
  const entries: gdbLineEntry[] = [];
  let inTable = false;
  for (const line of lines.join("\n").split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "Line table:") {
      inTable = true;
      continue;
    }
    if (inTable && trimmed === "Blockvector:") break;

    if (inTable) {
      const m = rgxLineEntry.exec(line); // use original line — regex expects leading whitespace
      if (!m?.groups) continue;
      const num = parseInt(m.groups.num, 10);
      if (num === 0) continue; // end-of-sequence sentinel
      entries.push({
        lineNum: num,
        address: m.groups.addr,
        isStmt: m.groups.stmt !== undefined,
      });
    }
  }
  return entries;
}

// ─── Blockvector parser ───────────────────────────────────────────────────────

/**
 * Matches a `block #N` header anywhere in text (global flag).
 * The actual GDB output can place multiple block headers on the same line or
 * split a single header across two lines, so we work on the full BV text blob.
 *
 * Captures: start addr, end addr, optional function name (first word after
 * "function ").
 */
const rgxBlockEntry =
  /block #\d+[,\s]+object at [^,]+,\s*\d+ symbols in (?<start>0x[0-9a-f]+)\.\.(?<end>0x[0-9a-f]+)(?:[^,\n]*,\s*function\s+(?<func>\S+))?/gi;

function resolveSubBlockNames(blocks: gdbSymbolBlock[]): void {
  for (const block of blocks) {
    if (block.functionName !== undefined) continue;
    if (block.vars.length === 0) continue;
    const parent = blocks.find(
      (b) =>
        b.functionName !== undefined &&
        addrLe(b.startAddr, block.startAddr) &&
        addrLe(block.endAddr, b.endAddr),
    );
    if (parent) block.functionName = parent.functionName;
  }
}

function parseBlockvector(lines: string[]): gdbSymbolBlock[] {
  // Collect the blockvector section — split on \n first so section headers
  // are found even when multiple logical lines share one array element
  let inBlockvector = false;
  const bvLines: string[] = [];
  for (const line of lines.join("\n").split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "Blockvector:") {
      inBlockvector = true;
      continue;
    }
    if (inBlockvector) bvLines.push(line);
  }

  if (bvLines.length === 0) return [];

  // Join into a single text blob — block headers can span lines or share lines
  const bvText = bvLines.join("\n");

  // Find all block #N positions and their parsed metadata
  type BlockMeta = { start: string; end: string; func?: string; textOffset: number };
  const metas: BlockMeta[] = [];

  rgxBlockEntry.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = rgxBlockEntry.exec(bvText)) !== null) {
    metas.push({
      start: m.groups!.start,
      end: m.groups!.end,
      func: m.groups!.func,
      textOffset: m.index + m[0].length, // start of symbol content (after header)
    });
  }

  if (metas.length === 0) return [];

  // Record where each block header starts in the text so we can slice symbol content
  // We re-scan to collect match start positions
  const matchStarts: number[] = [];
  {
    const rgx2 = /block #\d+/gi;
    let ms: RegExpExecArray | null;
    while ((ms = rgx2.exec(bvText)) !== null) {
      matchStarts.push(ms.index);
    }
  }

  const blocks: gdbSymbolBlock[] = [];
  for (let idx = 0; idx < metas.length; idx++) {
    const meta = metas[idx];
    // Symbol content ends where the next block header keyword starts
    const contentEnd = matchStarts[idx + 1] ?? bvText.length;
    const chunkText = bvText.slice(meta.textOffset, contentEnd);
    const vars = extractVarsFromChunk(chunkText.split("\n"));

    blocks.push({
      startAddr: meta.start,
      endAddr: meta.end,
      functionName: meta.func ?? undefined,
      vars,
    });
  }

  // Resolve sub-blocks: blocks without a functionName that fall inside a
  // named function block. Assign them the parent function name.
  resolveSubBlockNames(blocks);

  // Keep only blocks that have a function name (direct or resolved) and at
  // least one variable.
  return blocks.filter((b) => b.functionName !== undefined && b.vars.length > 0);
}

/** Unsigned hex address comparison: is a <= b? */
function addrLe(a: string, b: string): boolean {
  return BigInt(a) <= BigInt(b);
}

function processSemicolonToken(
  text: string,
  tokenStart: number,
  semiIndex: number,
): gdbVarDecl | null {
  const token = text.slice(tokenStart, semiIndex).trim();
  let j = semiIndex + 1;
  while (j < text.length && (text[j] === "\n" || text[j] === " " || text[j] === "\t")) j++;
  const nlPos = text.indexOf("\n", j);
  const disposition = (nlPos === -1 ? text.slice(j) : text.slice(j, nlPos)).trim();
  const isLocal = disposition.startsWith("computed at runtime");
  const isStatic = /^const \d/.test(disposition);
  if (isLocal || isStatic) {
    const nameMatch = /(?:^|\s)(\w+)\s*$/.exec(token);
    if (nameMatch) {
      return { name: nameMatch[1], typeStr: token, fields: extractFieldNames(token) };
    }
  }
  return null;
}

/**
 * Extract local variables from the symbol lines of one block chunk.
 *
 * The output format for each symbol is:
 *   <type-expr> <name>;
 *   <next-line>  (either "computed at runtime" for locals, or "const N(0xN)" for statics)
 *
 * Type expressions can be multi-line (nested structs/unions), so we use
 * brace-depth tracking to find the end of each type.
 */
function extractVarsFromChunk(lines: string[]): gdbVarDecl[] {
  const vars: gdbVarDecl[] = [];

  // Re-join lines into a single string so we can scan across line boundaries.
  // We use a sentinel newline between lines to make the regex easier.
  const text = lines.join("\n");

  // We process token by token at depth 0.
  // A "symbol record" ends with `<name>;\n<disposition>` where disposition is
  // "computed at runtime" (local) or "const N(0xN)" (static/global) or
  // "block object..." (inner block reference — skip).
  //
  // We walk character by character, tracking brace depth.

  let depth = 0;
  let tokenStart = 0;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    if (ch === "{") {
      depth++;
      i++;
      continue;
    }
    if (ch === "}") {
      depth--;
      i++;
      continue;
    }

    // At depth 0, look for the pattern: <identifier>;\n<disposition>
    if (depth === 0 && ch === ";") {
      const varDecl = processSemicolonToken(text, tokenStart, i);
      if (varDecl) vars.push(varDecl);
      tokenStart = i + 1;
      i++;
      continue;
    }

    i++;
  }

  return vars;
}

// ─── Field name extraction ───────────────────────────────────────────────────

/**
 * Extract the names of struct/union fields from a GDB type expression.
 *
 * `maint print symbols` emits the full struct body in the variable's type
 * string, e.g. `typedef struct { char *pd; MyStruct_t ms; int arr[6]; } MyBigStruct`.
 * This function walks that string, finds declarations at brace-depth 1, and
 * returns the last identifier before each semicolon as the field name.
 *
 * Returns an empty array for scalar types that contain no braces.
 */
export function extractFieldNames(typeStr: string): string[] {
  const fields: string[] = [];
  let depth = 0;
  let declStart = -1;

  for (let i = 0; i < typeStr.length; i++) {
    const ch = typeStr[i];
    if (ch === "{") {
      depth++;
      if (depth === 1) declStart = i + 1; // start collecting after outer opening brace
    } else if (ch === "}") {
      depth--;
    } else if (ch === ";" && depth === 1) {
      // This semicolon closes a field declaration at depth 1
      const decl = typeStr.slice(declStart, i).trim();
      declStart = i + 1; // next field declaration starts after this semicolon
      // Match the last identifier before an optional array size, bitfield width, or end
      // Handles: `char *pd`, `MyStruct_t ms`, `int arr[6]`, `struct {...} bf1`, `unsigned a:3`
      const nameMatch = /(\w+)\s*(?:\[[^\]]*\]|:\s*\d+\s*)?\s*$/.exec(decl);
      if (nameMatch && nameMatch[1] !== "struct" && nameMatch[1] !== "union") {
        fields.push(nameMatch[1]);
      }
    }
  }

  return fields;
}

// ─── Source scanner (Approach C) ─────────────────────────────────────────────

/**
 * True when the character immediately before the match looks like a field access.
 *
 * A match is a field access only when a `.` or `->` operator immediately precedes
 * the identifier name (e.g. `foo.bar` or `ptr->bar` — `bar` is the field).
 * We do NOT look at what follows the name: `mbs` in `mbs.field` is a root variable
 * reference, not a field access, even though `.` follows it.
 */
function isFieldAccess(line: string, matchIndex: number, _varName: string): boolean {
  const before = line.slice(0, matchIndex).trimEnd();
  return /[.(>]$/.test(before);
}

/**
 * Scan source lines for the first occurrence of `varName` that looks like a
 * declaration (not a field access, function call, or assignment target).
 *
 * Returns a `gdbVarLocation` with the 1-based line and 0-based column range
 * (and an empty `references` array), or `null` if not found.
 */
export function findDeclarationLine(
  sourceLines: string[],
  varName: string,
  startLine: number,
  endLine: number,
): gdbVarLocation | null {
  const start = Math.max(0, startLine - 1);
  const end = Math.min(sourceLines.length - 1, endLine - 1);

  const nameRe = new RegExp(`\\b${varName}\\b`);

  for (let i = start; i <= end; i++) {
    const line = sourceLines[i];
    const match = nameRe.exec(line);
    if (!match) continue;

    if (isFieldAccess(line, match.index, varName)) continue;

    const afterIdx = match.index + varName.length;
    const afterChar = line[afterIdx];
    if (afterChar === "(") continue;

    return {
      name: varName,
      line: i + 1, // 1-based
      colStart: match.index, // 0-based
      colEnd: afterIdx, // 0-based exclusive
      references: [],
    };
  }
  return null;
}

/**
 * Find all references (usages) of `varName` within [startLine, endLine] (1-based, inclusive).
 *
 * Excludes field accesses (`foo.name`, `ptr->name`) but includes all other
 * identifier occurrences — declarations, reads, writes, and uses as arguments.
 */
export function findReferences(
  sourceLines: string[],
  varName: string,
  startLine: number,
  endLine: number,
): gdbVarReference[] {
  const start = Math.max(0, startLine - 1);
  const end = Math.min(sourceLines.length - 1, endLine - 1);

  const nameRe = new RegExp(`\\b${varName}\\b`, "g");
  const refs: gdbVarReference[] = [];

  for (let i = start; i <= end; i++) {
    const line = sourceLines[i];
    nameRe.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = nameRe.exec(line)) !== null) {
      if (isFieldAccess(line, match.index, varName)) continue;
      const afterIdx = match.index + varName.length;
      refs.push({ line: i + 1, colStart: match.index, colEnd: afterIdx });
    }
  }

  return refs;
}

// ─── Line→address lookup ──────────────────────────────────────────────────────

/**
 * Given a hex address string, find the source line number using the line table.
 * Returns the lineNum of the nearest stmt entry whose address is <= targetAddr,
 * or the first entry if none is found.
 */
function addrToLine(addr: string, lineTable: gdbLineEntry[]): number {
  const target = BigInt(addr);
  let best: gdbLineEntry | undefined;
  for (const entry of lineTable) {
    if (!entry.isStmt) continue;
    const ea = BigInt(entry.address);
    if (ea <= target && (!best || ea >= BigInt(best.address))) {
      best = entry;
    }
  }
  return best?.lineNum ?? lineTable[0]?.lineNum ?? 0;
}

// ─── LineVarMap builder (Approach B + optional C) ────────────────────────────

export function buildLineVarMap(
  blocks: gdbSymbolBlock[],
  lineTable: gdbLineEntry[],
  header: MaintSymbolsHeader,
  sourceLines?: string[],
): gdbLineVarMap {
  const lineVars = new Map<number, gdbVarLocation[]>();

  const addVar = (loc: gdbVarLocation) => {
    const existing = lineVars.get(loc.line) ?? [];
    existing.push(loc);
    lineVars.set(loc.line, existing);
  };

  for (const block of blocks) {
    // Approach B: block start address → nearest stmt line
    const approxLine = addrToLine(block.startAddr, lineTable);

    // Find the function-scoped parent block to bound the source scan range
    const funcBlock =
      block.functionName && block.startAddr === block.startAddr
        ? (blocks.find(
            (b) =>
              b.functionName === block.functionName &&
              addrLe(b.startAddr, block.startAddr) &&
              addrLe(block.endAddr, b.endAddr) &&
              b !== block,
          ) ?? block)
        : block;

    const funcStartLine = addrToLine(funcBlock.startAddr, lineTable);
    const funcEndLine = addrToLine(funcBlock.endAddr, lineTable);

    for (const varDecl of block.vars) {
      const extra = { fields: varDecl.fields, typeStr: varDecl.typeStr };
      if (sourceLines) {
        // Approach C: scan source file for exact declaration location + all references
        const refs = findReferences(sourceLines, varDecl.name, funcStartLine, funcEndLine);
        const loc = findDeclarationLine(sourceLines, varDecl.name, funcStartLine, funcEndLine);
        addVar(
          loc
            ? { ...loc, references: refs, ...extra }
            : {
                name: varDecl.name,
                line: approxLine,
                colStart: -1,
                colEnd: -1,
                references: refs,
                ...extra,
              },
        );
      } else {
        // Approach B: columns and references unknown
        addVar({
          name: varDecl.name,
          line: approxLine,
          colStart: -1,
          colEnd: -1,
          references: [],
          ...extra,
        });
      }
    }
  }

  return { sourceFile: header.sourceFile, compilationDir: header.compilationDir, lineVars };
}

// ─── Position query ───────────────────────────────────────────────────────────

/**
 * Given a `gdbLineVarMap`, return the variable whose declaration or any
 * reference spans the given 1-based `line` and 0-based `col`.
 *
 * Returns `undefined` when no variable covers that position.
 */
export function queryVarAtPosition(
  map: gdbLineVarMap,
  line: number,
  col: number,
): gdbVarLocation | undefined {
  // Check declarations: lineVars is keyed by declaration line.
  const decls = map.lineVars.get(line);
  if (decls) {
    const hit = decls.find((loc) => loc.colStart >= 0 && col >= loc.colStart && col < loc.colEnd);
    if (hit) return hit;
  }

  // Check references: scan all variables for a reference covering this position.
  for (const locs of map.lineVars.values()) {
    for (const loc of locs) {
      if (loc.references.some((r) => r.line === line && col >= r.colStart && col < r.colEnd)) {
        return loc;
      }
    }
  }

  return undefined;
}

// ─── Public parse entry point ─────────────────────────────────────────────────

export type ParsedMaintSymbols = {
  header: MaintSymbolsHeader;
  lineTable: gdbLineEntry[];
  blocks: gdbSymbolBlock[];
};

export class MaintPrintSymbolsParser {
  /**
   * Parse cleaned lines (MI `~"..."` escaping already stripped) from the
   * output of `maint print symbols -source <file>`.
   */
  static parse(lines: string[]): ParsedMaintSymbols {
    const header = parseHeader(lines);
    const lineTable = parseLineTable(lines);
    const blocks = parseBlockvector(lines);
    return { header, lineTable, blocks };
  }
}
