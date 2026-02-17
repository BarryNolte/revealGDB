import { describe, expect, it } from "vitest";
import { gdbStateDatabase } from "../gdb-state-database/gdbStateDatabase";
import { GdbOutputCapture } from "./gdb-output-capture";

describe("GdbOutputCapture", () => {
  it("captures symbol files and sections", () => {
    const db = new gdbStateDatabase();
    const capture = new GdbOutputCapture(db);

    const lines = [
      'Symbols from \\"/path/to/app.elf\\"',
      '\\t0x00001000 - 0x00002000 is .text in /path/to/app.elf\\n"',
      '\\t0x00002000 - 0x00003000 is .data\\n"',
    ];

    capture.CaptureSymbolFiles(lines);

    const sym = db.getSymbolFiles();
    expect(sym.mainSym).toBe("/path/to/app.elf");
    expect(sym.sections).toHaveLength(2);
    expect(sym.sections[0]).toEqual({
      startAddr: "0x00001000",
      endAddr: "0x00002000",
      section: ".text",
      file: "/path/to/app.elf",
    });
    expect(sym.sections[1]).toEqual({
      startAddr: "0x00002000",
      endAddr: "0x00003000",
      section: ".data",
      file: undefined,
    });
  });

  it("captures function names grouped by file", () => {
    const db = new gdbStateDatabase();
    const capture = new GdbOutputCapture(db);

    const lines = [
      '"\\nFile "',
      '"src/main.c:\\n"',
      '"12:\\tmy_func(int);"',
      '"\\tother_func();"',
      '"\\nFile "',
      '"src/other.c:\\n"',
      '"7:\\tthird_func();"',
    ];

    capture.CaptureFunctionNames(lines);

    const mainFuncs = db.getFunctionNames("src/main.c");
    expect(mainFuncs).toBeDefined();
    expect(mainFuncs).toHaveLength(2);
    expect(mainFuncs?.[0]).toEqual({ line: "12", function: "my_func" });
    expect(mainFuncs?.[1]).toEqual({ line: "", function: "other_func" });

    const otherFuncs = db.getFunctionNames("src/other.c");
    expect(otherFuncs).toBeDefined();
    expect(otherFuncs).toHaveLength(1);
    expect(otherFuncs?.[0]).toEqual({ line: "7", function: "third_func" });
  });

  it("routes capture lines and resets state on end marker", () => {
    const db = new gdbStateDatabase();
    const capture = new GdbOutputCapture(db);

    expect(capture.CaptureLine("no-capture")).toBe(false);

    expect(capture.CaptureLine("<<<<file-info>>>>")).toBe(true);
    expect(capture.CaptureLine('\\t0x00001000 - 0x00002000 is .text\\n"')).toBe(true);
    expect(capture.CaptureLine(">>>>end-capture<<<<")).toBe(true);

    expect(db.getSymbolFiles().sections).toHaveLength(1);

    expect(capture.CaptureLine("no-capture-again")).toBe(false);
  });

  it("captures function names via CaptureLine state", () => {
    const db = new gdbStateDatabase();
    const capture = new GdbOutputCapture(db);

    capture.CaptureLine("<<<<function-names>>>>");
    capture.CaptureLine('"\\nFile "');
    capture.CaptureLine('"src/unit.c:\\n"');
    capture.CaptureLine('"1:\\tunit_func();"');
    capture.CaptureLine(">>>>end-capture<<<<");

    const funcs = db.getFunctionNames("src/unit.c");
    expect(funcs).toBeDefined();
    expect(funcs).toHaveLength(1);
    expect(funcs?.[0]).toEqual({ line: "1", function: "unit_func" });
  });
});
