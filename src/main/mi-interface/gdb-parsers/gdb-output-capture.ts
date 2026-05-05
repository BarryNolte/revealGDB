/**
 * Implements gdb output capture logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `CaptureType`, `GdbOutputCapture`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { sendToRenderer } from "../../ipc-sender";
import { gdbStateDatabase } from "../gdb-state-database/gdbStateDatabase";

export type CaptureType = "" | "file-info" | "function-names";
type ActiveCaptureType = Exclude<CaptureType, "">;

export class GdbOutputCapture {
  private static readonly captureStartMarkers: ReadonlyArray<[string, ActiveCaptureType]> = [
    ["<<<<file-info>>>>", "file-info"],
    ["<<<<function-names>>>>", "function-names"],
  ];

  private static readonly captureEndMarker = ">>>>end-capture<<<<";

  private output: string[] = [];
  // Active capture mode, driven by sentinel markers in the output stream.
  private captureType: CaptureType = "";
  private gdbDB: gdbStateDatabase;
  private readonly captureHandlers: Record<ActiveCaptureType, (capArray: string[]) => void> = {
    "file-info": (capArray: string[]) => {
      this.CaptureSymbolFiles(capArray);
    },
    "function-names": (capArray: string[]) => {
      this.CaptureFunctionNames(capArray);
    },
  };

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
    sendToRenderer("data-disasm-functions", this.gdbDB.getAllFunctionNames());
  }

  private getStartCaptureType(line: string): ActiveCaptureType | undefined {
    const marker = GdbOutputCapture.captureStartMarkers.find(([startMarker]) =>
      line.includes(startMarker),
    );
    return marker?.[1];
  }

  private flushCapture(): void {
    if (this.captureType !== "") {
      this.captureHandlers[this.captureType](this.output);
    }

    this.captureType = "";
    this.output = [];
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
    const startCaptureType = this.getStartCaptureType(line);
    if (startCaptureType) {
      // A new start marker always starts a fresh capture session.
      this.captureType = startCaptureType;
      this.output = [];
      return true;
    }

    if (line.includes(GdbOutputCapture.captureEndMarker)) {
      this.flushCapture();
      return true;
    }

    if (this.captureType === "") {
      return false;
    }

    this.output.push(line);
    return true;
  }
}
