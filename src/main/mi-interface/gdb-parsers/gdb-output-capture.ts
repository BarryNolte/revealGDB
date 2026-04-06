/**
 * Implements gdb output capture logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `CaptureType`, `GdbOutputCapture`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { mainWindow } from "../../main";
import { gdbStateDatabase } from "../gdb-state-database/gdbStateDatabase";

export type CaptureType = "" | "file-info" | "function-names";

export class GdbOutputCapture {
  private output: string[] = [];
  // Active capture mode, driven by sentinel markers in the output stream.
  private captureType: CaptureType = "";
  private gdbDB: gdbStateDatabase;

  constructor(db: gdbStateDatabase) {
    this.gdbDB = db;
  }

  /**
   * Performs capture symbol files as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param capArray - Value for `capArray` consumed by this operation.
   */
  CaptureSymbolFiles(capArray: string[]): void {
    for (const line of capArray) {
      const symGroups = line.match(/Symbols from \\"(?<path>[^\\"]*)/)?.groups;
      if (symGroups) {
        this.gdbDB.addMainSymbolFile(symGroups.path);
      }

      const inGroups =
        /\\t(?<startaddr>[^\s]*) - (?<endaddr>[^\s]*) is (?<section>[^\s]*)( in (?<file>.*))?\\n"$/.exec(
          line,
        )?.groups;
      if (!inGroups) continue;

      this.gdbDB.addSection({
        startAddr: inGroups.startaddr,
        endAddr: inGroups.endaddr,
        section: inGroups.section,
        file: inGroups.file,
      });
    }
  }

  /**
   * Performs capture function names as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param capArray - Value for `capArray` consumed by this operation.
   */
  CaptureFunctionNames(capArray: string[]): void {
    enum state {
      begin,
      file,
      functions,
    }

    let currentState = state.begin;
    let currentFile = "";

    const fileTagRegex: RegExp = /"\\nFile "/;
    const fileRegex: RegExp = /"(?<file>.*?):\\n"/;
    const lineFuncRegex: RegExp = /"((?<lineno>[0-9]*):)?\\t(?<function>.*);/;
    const funcRegex: RegExp = /(?<func>\b([0-9a-zA-Z_]+))\(/;

    capArray.forEach((line) => {
      if (fileTagRegex.test(line)) {
        currentState = state.file;
        return;
      }

      switch (currentState) {
        case state.file: {
          const fileGroups = fileRegex.exec(line)?.groups;
          if (!fileGroups) break;
          currentState = state.functions;
          currentFile = fileGroups.file;
          break;
        }
        case state.functions: {
          const funcLineGroups = lineFuncRegex.exec(line)?.groups;
          if (!funcLineGroups) break;

          const funcGroups = funcRegex.exec(funcLineGroups.function)?.groups;
          if (!funcGroups) break;

          this.gdbDB.addFunctionNames(currentFile, funcLineGroups.lineno || "", funcGroups.func);
          break;
        }
      }
    });
    mainWindow.webContents.send("data-disasm-functions", this.gdbDB.getAllFunctionNames());
  }

  /**
   * Performs capture line as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param line - Line value used for source navigation or rendering.
   * @returns True when the operation succeeds; otherwise false.
   */
  CaptureLine(line: string): boolean {
    if (line.includes("<<<<file-info>>>>")) {
      this.captureType = "file-info";
      return true;
    }

    if (line.includes("<<<<function-names>>>>")) {
      this.captureType = "function-names";
      return true;
    }

    if (line.includes(">>>>end-capture<<<<")) {
      switch (this.captureType) {
        case "file-info":
          this.CaptureSymbolFiles(this.output);
          break;
        case "function-names":
          this.CaptureFunctionNames(this.output);
          break;
      }
      this.captureType = "";
      this.output = [];
      return true;
    }

    switch (this.captureType) {
      case "file-info":
      case "function-names":
        this.output.push(line);
        return true;
      case "":
        return false;
    }

    return true;
  }
}
