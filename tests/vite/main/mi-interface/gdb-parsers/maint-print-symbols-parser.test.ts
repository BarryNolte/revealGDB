import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import {
  buildLineVarMap,
  extractFieldNames,
  findDeclarationLine,
  findReferences,
  MaintPrintSymbolsParser,
  queryVarAtPosition,
} from "../../../../../src/main/mi-interface/gdb-parsers/maint-print-symbols-parser";

// ─── Test data ────────────────────────────────────────────────────────────────

const corpusPath = join(__dirname, "../../../../../notes/MaintPrintSymbols--source.txt");
const sourcePath = join(__dirname, "../../../../../notes/hello_world_main.c");

const corpusRaw = readFileSync(corpusPath, "utf-8");
const sourceRaw = readFileSync(sourcePath, "utf-8");

// The corpus file is the cleaned output (no MI ~"..." wrapping).
const corpusLines = corpusRaw.split(/\r?\n/);
const sourceLines = sourceRaw.split(/\r?\n/);

// ─── parseHeader ─────────────────────────────────────────────────────────────

describe("MaintPrintSymbolsParser.parse – header", () => {
  it("extracts source file and compilation directory", () => {
    const { header } = MaintPrintSymbolsParser.parse(corpusLines);
    expect(header.sourceFile).toBe("/home/barry/perftool/main/hello_world_main.c");
    expect(header.compilationDir).toBe("/home/barry/perftool/build");
  });
});

// ─── parseLineTable ───────────────────────────────────────────────────────────

describe("MaintPrintSymbolsParser.parse – line table", () => {
  it("produces entries from the line table section", () => {
    const { lineTable } = MaintPrintSymbolsParser.parse(corpusLines);
    expect(lineTable.length).toBeGreaterThan(0);
  });

  it("correctly parses a stmt entry", () => {
    const { lineTable } = MaintPrintSymbolsParser.parse(corpusLines);
    const first = lineTable[0];
    expect(first.lineNum).toBe(53);
    expect(first.address).toBe("0x400d6108");
    expect(first.isStmt).toBe(true);
  });

  it("correctly parses a non-stmt entry", () => {
    const { lineTable } = MaintPrintSymbolsParser.parse(corpusLines);
    // Second entry is "line 53 at 0x400d6108" without (stmt)
    const second = lineTable[1];
    expect(second.lineNum).toBe(53);
    expect(second.isStmt).toBe(false);
  });

  it("excludes line-0 sentinel entries", () => {
    const { lineTable } = MaintPrintSymbolsParser.parse(corpusLines);
    expect(lineTable.every((e) => e.lineNum !== 0)).toBe(true);
  });
});

// ─── parseBlockvector ─────────────────────────────────────────────────────────

describe("MaintPrintSymbolsParser.parse – blockvector", () => {
  it("finds function-scoped blocks", () => {
    const { blocks } = MaintPrintSymbolsParser.parse(corpusLines);
    const funcNames = blocks.map((b) => b.functionName).filter(Boolean);
    expect(funcNames).toContain("app_main");
    expect(funcNames).toContain("foo");
  });

  it("finds app_main locals", () => {
    const { blocks } = MaintPrintSymbolsParser.parse(corpusLines);
    const appMainBlock = blocks.find(
      (b) => b.functionName === "app_main" && b.vars.some((v) => v.name === "mbs"),
    );
    expect(appMainBlock).toBeDefined();
    const varNames = appMainBlock!.vars.map((v) => v.name);
    expect(varNames).toContain("mbs");
    expect(varNames).toContain("chip_info");
    expect(varNames).toContain("flash_size");
    expect(varNames).toContain("major_rev");
    expect(varNames).toContain("minor_rev");
  });

  it("finds the for-loop sub-block with int i", () => {
    const { blocks } = MaintPrintSymbolsParser.parse(corpusLines);
    const subBlock = blocks.find((b) => b.vars.some((v) => v.name === "i"));
    expect(subBlock).toBeDefined();
    expect(subBlock!.functionName).toBe("app_main");
  });

  it("finds foo's parameter x", () => {
    const { blocks } = MaintPrintSymbolsParser.parse(corpusLines);
    const fooBlock = blocks.find((b) => b.functionName === "foo");
    expect(fooBlock).toBeDefined();
    expect(fooBlock!.vars.map((v) => v.name)).toContain("x");
  });

  it("does not include typedef-only symbols as variables", () => {
    const { blocks } = MaintPrintSymbolsParser.parse(corpusLines);
    const allVarNames = blocks.flatMap((b) => b.vars.map((v) => v.name));
    // These are type names from the global block — should not appear
    expect(allVarNames).not.toContain("_mbstate_t");
    expect(allVarNames).not.toContain("esp_flash_io_mode_t");
  });
});

// ─── findDeclarationLine ──────────────────────────────────────────────────────

describe("findDeclarationLine", () => {
  // In hello_world_main.c (1-based), app_main starts at line 72.
  // Actual declaration lines in the *current* source file:
  //   MyBigStruct mbs  → line 74 (72 + 2)
  //   chip_info        → line 85
  //   flash_size       → line 86
  //   major_rev        → line 95
  //   minor_rev        → line 96
  //   int i            → line 109

  it("finds mbs declaration", () => {
    const loc = findDeclarationLine(sourceLines, "mbs", 72, 117);
    // Should be the line "    MyBigStruct mbs;"
    expect(loc).not.toBeNull();
    expect(loc!.line).toBeGreaterThan(72);
    expect(loc!.colStart).toBeGreaterThanOrEqual(0);
    expect(loc!.colEnd).toBe(loc!.colStart + "mbs".length);
    expect(sourceLines[loc!.line - 1]).toMatch(/\bmbs\b/);
    // Must not be a field access line like mbs.ms.a
    expect(sourceLines[loc!.line - 1]).not.toMatch(/mbs\./);
  });

  it("finds chip_info declaration", () => {
    const loc = findDeclarationLine(sourceLines, "chip_info", 72, 117);
    expect(loc).not.toBeNull();
    expect(loc!.line).toBeGreaterThan(72);
    expect(sourceLines[loc!.line - 1]).toMatch(/chip_info/);
    expect(sourceLines[loc!.line - 1]).not.toMatch(/[.>]chip_info/);
  });

  it("finds flash_size declaration", () => {
    const loc = findDeclarationLine(sourceLines, "flash_size", 72, 117);
    expect(loc).not.toBeNull();
    expect(loc!.line).toBeGreaterThan(72);
    expect(sourceLines[loc!.line - 1]).toMatch(/flash_size/);
  });

  it("finds for-loop variable i", () => {
    const loc = findDeclarationLine(sourceLines, "i", 72, 117);
    expect(loc).not.toBeNull();
    expect(loc!.line).toBeGreaterThan(72);
    expect(sourceLines[loc!.line - 1]).toMatch(/\bi\b/);
  });

  it("returns null for a name not in range", () => {
    const loc = findDeclarationLine(sourceLines, "nonexistent_var_xyz", 1, 117);
    expect(loc).toBeNull();
  });
});

// ─── buildLineVarMap – Approach B (no source) ────────────────────────────────

describe("buildLineVarMap – Approach B (no source)", () => {
  it("assigns all app_main vars to the function start line (approx)", () => {
    const { header, lineTable, blocks } = MaintPrintSymbolsParser.parse(corpusLines);
    const map = buildLineVarMap(blocks, lineTable, header);

    // In ELF, app_main starts at line 64 (stmt). All vars in the function block
    // without a sub-block should end up on that line.
    const allVarNames = Array.from(map.lineVars.values())
      .flat()
      .map((v) => v.name);
    expect(allVarNames).toContain("mbs");
    expect(allVarNames).toContain("chip_info");
  });

  it("returns a map keyed by compiled line numbers", () => {
    const { header, lineTable, blocks } = MaintPrintSymbolsParser.parse(corpusLines);
    const map = buildLineVarMap(blocks, lineTable, header);
    expect(map.lineVars.size).toBeGreaterThan(0);
    expect(map.sourceFile).toBe(header.sourceFile);
  });
});

// ─── buildLineVarMap – Approach C (with source) ──────────────────────────────

describe("buildLineVarMap – Approach C (with source)", () => {
  it("places mbs, chip_info, flash_size, major_rev, minor_rev on distinct lines", () => {
    const { header, lineTable, blocks } = MaintPrintSymbolsParser.parse(corpusLines);
    const map = buildLineVarMap(blocks, lineTable, header, sourceLines);

    const allEntries = Array.from(map.lineVars.entries());
    const lineOf = (name: string) =>
      allEntries.find(([, locs]) => locs.some((l) => l.name === name))?.[0] ?? -1;

    const mbsLine = lineOf("mbs");
    const chipLine = lineOf("chip_info");
    const flashLine = lineOf("flash_size");

    // Each should be on a distinct line
    expect(mbsLine).toBeGreaterThan(0);
    expect(chipLine).toBeGreaterThan(0);
    expect(flashLine).toBeGreaterThan(0);
    expect(mbsLine).not.toBe(chipLine);
    expect(chipLine).not.toBe(flashLine);
  });

  it("places the for-loop variable i on its own line", () => {
    const { header, lineTable, blocks } = MaintPrintSymbolsParser.parse(corpusLines);
    const map = buildLineVarMap(blocks, lineTable, header, sourceLines);

    const allEntries = Array.from(map.lineVars.entries());
    const lineOf = (name: string) =>
      allEntries.find(([, locs]) => locs.some((l) => l.name === name))?.[0] ?? -1;

    const iLine = lineOf("i");
    expect(iLine).toBeGreaterThan(0);
    // i must be after mbs and chip_info
    const mbsLine = lineOf("mbs");
    expect(iLine).toBeGreaterThan(mbsLine);
  });
});

// ─── findReferences ───────────────────────────────────────────────────────────

describe("findReferences", () => {
  it("returns at least one reference for mbs within app_main", () => {
    const refs = findReferences(sourceLines, "mbs", 72, 117);
    expect(refs.length).toBeGreaterThan(0);
  });

  it("includes the declaration line in the references", () => {
    const declLoc = findDeclarationLine(sourceLines, "mbs", 72, 117);
    expect(declLoc).not.toBeNull();
    const refs = findReferences(sourceLines, "mbs", 72, 117);
    const declRef = refs.find((r) => r.line === declLoc!.line);
    expect(declRef).toBeDefined();
  });

  it("each reference has correct colEnd = colStart + name.length", () => {
    const refs = findReferences(sourceLines, "chip_info", 72, 117);
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) {
      expect(ref.colEnd).toBe(ref.colStart + "chip_info".length);
    }
  });

  it("does not include field accesses of mbs as references", () => {
    // Lines like `mbs.ms.a = ...` should NOT generate a reference to `mbs` as a field
    // but SHOULD generate a reference to `mbs` as the outer variable being accessed.
    // Lines like `foo.mbs` would be excluded; verify no such false positives exist.
    const refs = findReferences(sourceLines, "mbs", 72, 117);
    for (const ref of refs) {
      const text = sourceLines[ref.line - 1];
      // Check the text before the match is not a field dereference
      const before = text.slice(0, ref.colStart).trimEnd();
      expect(/[.(>]$/.test(before)).toBe(false);
    }
  });

  it("returns empty array for an unknown variable name", () => {
    const refs = findReferences(sourceLines, "nonexistent_var_xyz", 72, 117);
    expect(refs).toHaveLength(0);
  });

  it("returns empty array when range has no lines", () => {
    const refs = findReferences(sourceLines, "mbs", 1000, 900);
    expect(refs).toHaveLength(0);
  });
});

// ─── buildLineVarMap – Approach C references ─────────────────────────────────

describe("buildLineVarMap – Approach C references", () => {
  it("each gdbVarLocation has a references array", () => {
    const { header, lineTable, blocks } = MaintPrintSymbolsParser.parse(corpusLines);
    const map = buildLineVarMap(blocks, lineTable, header, sourceLines);
    for (const locs of map.lineVars.values()) {
      for (const loc of locs) {
        expect(Array.isArray(loc.references)).toBe(true);
      }
    }
  });

  it("mbs has multiple references in the function scope", () => {
    const { header, lineTable, blocks } = MaintPrintSymbolsParser.parse(corpusLines);
    const map = buildLineVarMap(blocks, lineTable, header, sourceLines);
    const allLocs = Array.from(map.lineVars.values()).flat();
    const mbsLoc = allLocs.find((l) => l.name === "mbs");
    expect(mbsLoc).toBeDefined();
    expect(mbsLoc!.references.length).toBeGreaterThan(0);
  });

  it("Approach B produces empty references arrays", () => {
    const { header, lineTable, blocks } = MaintPrintSymbolsParser.parse(corpusLines);
    const map = buildLineVarMap(blocks, lineTable, header); // no sourceLines
    for (const locs of map.lineVars.values()) {
      for (const loc of locs) {
        expect(loc.references).toHaveLength(0);
      }
    }
  });
});

// ─── queryVarAtPosition ───────────────────────────────────────────────────────

describe("queryVarAtPosition", () => {
  // Build the Approach C map once for all tests in this block
  const { header, lineTable, blocks } = MaintPrintSymbolsParser.parse(corpusLines);
  const map = buildLineVarMap(blocks, lineTable, header, sourceLines);

  it("returns the variable when col hits its declaration range", () => {
    const mbsDecl = findDeclarationLine(sourceLines, "mbs", 72, 117);
    expect(mbsDecl).not.toBeNull();
    const result = queryVarAtPosition(map, mbsDecl!.line, mbsDecl!.colStart);
    expect(result).toBeDefined();
    expect(result!.name).toBe("mbs");
  });

  it("returns the variable when col hits the end of its declaration range (exclusive end - 1)", () => {
    const mbsDecl = findDeclarationLine(sourceLines, "mbs", 72, 117);
    expect(mbsDecl).not.toBeNull();
    const result = queryVarAtPosition(map, mbsDecl!.line, mbsDecl!.colEnd - 1);
    expect(result).toBeDefined();
    expect(result!.name).toBe("mbs");
  });

  it("returns undefined when col is at the exclusive end of the declaration range", () => {
    const mbsDecl = findDeclarationLine(sourceLines, "mbs", 72, 117);
    expect(mbsDecl).not.toBeNull();
    const result = queryVarAtPosition(map, mbsDecl!.line, mbsDecl!.colEnd);
    // colEnd is exclusive — should not match
    expect(result?.name).not.toBe("mbs");
  });

  it("returns the variable when col hits a reference (not the declaration position)", () => {
    // `flash_size` is declared at one line and referenced on other lines within the
    // function scan range (lines 64-105). This exercises the reference-lookup code
    // path in queryVarAtPosition (falls through the declaration check, then matches
    // via the reference loop).
    const varName = "flash_size";
    const decl = findDeclarationLine(sourceLines, varName, 72, 117);
    expect(decl).not.toBeNull();
    const allLocs = Array.from(map.lineVars.values()).flat();
    const flashLoc = allLocs.find((l) => l.name === varName);
    expect(flashLoc).toBeDefined();
    const refOnOtherLine = flashLoc!.references.find((r) => r.line !== decl!.line);
    expect(refOnOtherLine).toBeDefined();
    const result = queryVarAtPosition(map, refOnOtherLine!.line, refOnOtherLine!.colStart);
    expect(result).toBeDefined();
    expect(result!.name).toBe(varName);
  });

  it("returns undefined for a line that has no variables", () => {
    // Line 1 of the source file is well before app_main
    const result = queryVarAtPosition(map, 1, 0);
    expect(result).toBeUndefined();
  });

  it("returns undefined when col is before any variable on the line", () => {
    const mbsDecl = findDeclarationLine(sourceLines, "mbs", 72, 117);
    expect(mbsDecl).not.toBeNull();
    // col 0 is before the variable name (which starts at colStart > 0 due to indentation)
    const result = queryVarAtPosition(map, mbsDecl!.line, 0);
    expect(result?.name).not.toBe("mbs");
  });

  it("returns undefined for Approach B map (no column data)", () => {
    const { header: hB, lineTable: ltB, blocks: blB } = MaintPrintSymbolsParser.parse(corpusLines);
    const mapB = buildLineVarMap(blB, ltB, hB); // no sourceLines
    // Every line in mapB has colStart = -1, so nothing should match
    for (const [lineNum, locs] of mapB.lineVars.entries()) {
      for (const loc of locs) {
        const result = queryVarAtPosition(mapB, lineNum, 0);
        expect(result?.name).not.toBe(loc.name);
      }
    }
  });
});

// ─── findReferences – struct base-variable fix ────────────────────────────────

describe("findReferences – struct base-variable references", () => {
  // After fixing isFieldAccess, `mbs` in `mbs.ms.a` must be included as a
  // reference to the outer variable `mbs` (previously it was incorrectly
  // excluded because `.` follows `mbs`).

  it("mbs references include the mbs.ms.a usage lines", () => {
    const refs = findReferences(sourceLines, "mbs", 72, 117);
    // hello_world_main.c has mbs on lines 74 (decl), 75, 76, 77
    const refLines = refs.map((r) => r.line);
    expect(refLines).toContain(75); // mbs.ms.a = 3;
    expect(refLines).toContain(76); // mbs.ms.a++;
    expect(refLines).toContain(77); // mbs.ms.embed_t.o = 2;
  });

  it("field names like ms or a are NOT included in mbs references", () => {
    const refs = findReferences(sourceLines, "mbs", 72, 117);
    // Every reference position must have `mbs` as the token (the preceding
    // char is NOT a field-access operator). Verify by checking the text.
    for (const ref of refs) {
      const text = sourceLines[ref.line - 1];
      // Text at colStart..colEnd must be "mbs"
      expect(text.slice(ref.colStart, ref.colEnd)).toBe("mbs");
      // And what comes before must NOT be `.` or `->`
      const before = text.slice(0, ref.colStart).trimEnd();
      expect(/[.(>]$/.test(before)).toBe(false);
    }
  });

  it("mbs references total count matches usage lines", () => {
    // hello_world_main.c has mbs on lines 74 (decl) + 75 + 76 + 77 = 4 occurrences
    const refs = findReferences(sourceLines, "mbs", 72, 117);
    expect(refs.length).toBe(4);
  });
});

// ─── extractFieldNames ────────────────────────────────────────────────────────

describe("extractFieldNames", () => {
  it("returns empty array for a scalar type", () => {
    expect(extractFieldNames("uint32_t")).toEqual([]);
    expect(extractFieldNames("int")).toEqual([]);
    expect(extractFieldNames("unsigned long flash_size")).toEqual([]);
  });

  it("extracts field names from a simple struct", () => {
    const fields = extractFieldNames("struct { int x; float y; } point");
    expect(fields).toEqual(["x", "y"]);
  });

  it("extracts field names with pointer types", () => {
    const fields = extractFieldNames("struct { char *pd; int count; } s");
    expect(fields).toEqual(["pd", "count"]);
  });

  it("extracts field names including array fields", () => {
    const fields = extractFieldNames("struct { int arr[6]; char name[32]; } s");
    expect(fields).toEqual(["arr", "name"]);
  });

  it("extracts field names from nested structs (nested content is not unwrapped)", () => {
    const fields = extractFieldNames(
      "struct { int a; struct { int x; int y; } inner; int b; } outer",
    );
    expect(fields).toEqual(["a", "inner", "b"]);
  });

  it("extracts field names including bitfield members", () => {
    const fields = extractFieldNames("struct { int x : 4; int y : 3; int z : 1; } bf");
    expect(fields).toEqual(["x", "y", "z"]);
  });

  it("parses the real mbs typeStr from the corpus", () => {
    // The mbs variable in the test corpus has a struct with 5 fields:
    //   char *pd, MyStruct_t ms, int arr[6], struct{...} bf1, struct{...} bf2
    const { blocks } = MaintPrintSymbolsParser.parse(corpusLines);
    const mbsDecl = blocks.flatMap((b) => b.vars).find((v) => v.name === "mbs");
    expect(mbsDecl).toBeDefined();
    expect(mbsDecl!.fields).toBeDefined();
    expect(mbsDecl!.fields).toContain("pd");
    expect(mbsDecl!.fields).toContain("ms");
    expect(mbsDecl!.fields).toContain("arr");
    expect(mbsDecl!.fields).toContain("bf1");
    expect(mbsDecl!.fields).toContain("bf2");
    expect(mbsDecl!.fields!.length).toBe(5);
  });

  it("scalar variables get an empty fields array", () => {
    const { blocks } = MaintPrintSymbolsParser.parse(corpusLines);
    const flashDecl = blocks.flatMap((b) => b.vars).find((v) => v.name === "flash_size");
    expect(flashDecl).toBeDefined();
    expect(flashDecl!.fields).toEqual([]);
  });

  it("buildLineVarMap propagates fields and typeStr to gdbVarLocation", () => {
    const { header, lineTable, blocks } = MaintPrintSymbolsParser.parse(corpusLines);
    const map = buildLineVarMap(blocks, lineTable, header, sourceLines);
    const allLocs = Array.from(map.lineVars.values()).flat();
    const mbsLoc = allLocs.find((l) => l.name === "mbs");
    expect(mbsLoc).toBeDefined();
    expect(mbsLoc!.fields).toContain("ms");
    // GDB expands typedefs in maint print symbols, so typeStr contains the raw
    // struct body followed by the variable name, not the typedef alias.
    expect(mbsLoc!.typeStr).toMatch(/struct/);
    expect(mbsLoc!.typeStr).toMatch(/char \*pd/);
  });
});
