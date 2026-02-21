/**
 * Captures multi-line gdb outputs and extracts symbol/function metadata.
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

  CaptureSymbolFiles(capArray: string[]): void {
    for (const line of capArray) {
      const symMatch = line.match(/Symbols from \\"(?<path>[^\\"]*)/);
      if (symMatch && symMatch.groups) {
        this.gdbDB.addMainSymbolFile(symMatch.groups.path);
      }
      const inMatch =
        /\\t(?<startaddr>[^\s]*) - (?<endaddr>[^\s]*) is (?<section>[^\s]*)( in (?<file>.*))?\\n"$/.exec(
          line,
        );

      if (inMatch && inMatch.groups) {
        this.gdbDB.addSection({
          startAddr: inMatch.groups.startaddr,
          endAddr: inMatch.groups.endaddr,
          section: inMatch.groups.section,
          file: inMatch.groups.file,
        });
      }
    }
  }

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

    // Implementation goes here
    capArray.forEach((line) => {
      if (fileTagRegex.test(line)) {
        currentState = state.file;
        return;
      }

      switch (currentState) {
        case state.file:
          {
            const fileMatch = fileRegex.exec(line);
            if (fileMatch && fileMatch.groups) {
              currentState = state.functions;
              currentFile = fileMatch.groups.file;
            }
          }
          break;
        case state.functions:
          {
            const funcLineMatch = lineFuncRegex.exec(line);
            if (funcLineMatch && funcLineMatch.groups) {
              const funcMatch = funcRegex.exec(funcLineMatch.groups.function);
              if (funcMatch && funcMatch.groups) {
                this.gdbDB.addFunctionNames(
                  currentFile,
                  funcLineMatch.groups.lineno || "",
                  funcMatch.groups.func,
                );
              }
            }
          }
          break;
      }
    });
    mainWindow.webContents.send("data-disasm-functions", this.gdbDB.getAllFunctionNames());
  }

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
        this.output.push(line);
        break;
      case "function-names":
        this.output.push(line);
        break;
      case "":
        return false;
    }

    return true;
  }
}
