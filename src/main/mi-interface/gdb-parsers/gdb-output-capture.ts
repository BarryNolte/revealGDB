/**
 * Implements gdb output capture logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `CaptureType`, `GdbOutputCapture`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { sendToRenderer } from "../../ipc-sender";
import { gdbStateDatabase } from "../gdb-state-database/gdbStateDatabase";

export type CaptureType = "" | "file-info" | "function-names" | "source-files" | "line-vars";
type ActiveCaptureType = Exclude<CaptureType, "">;

export class GdbOutputCapture {
  private static readonly captureStartMarkers: ReadonlyArray<[string, ActiveCaptureType]> = [
    ["<<<<file-info>>>>", "file-info"],
    ["<<<<function-names>>>>", "function-names"],
    ["<<<<source-files>>>>", "source-files"],
    ["<<<<line-vars>>>>", "line-vars"],
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
    "source-files": (capArray: string[]) => {
      this.CaptureSourceFiles(capArray);
    },
    "line-vars": (capArray: string[]) => {
      this.CaptureLineVars(capArray);
    },
  };

  /** Strip MI `~"..."` wrapping and decode escape sequences from a single raw line. */
  private static stripMiEscaping(raw: string): string {
    // Lines arrive as ~"<content>" — strip the leading ~" and trailing "
    const m = /^~"(?<content>.*)"$/.exec(raw);
    const content = m?.groups?.content ?? raw;
    return content
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }

  constructor(db: gdbStateDatabase) {
    this.gdbDB = db;
  }

  /**
   * List the BFD sections of the exec and core files.

     Usage: maintenance info sections [-all-objects] [FILTERS]

     FILTERS is a list of words, each word is either:
       + A section name - any section with this name will be printed, or
       + A section flag - any section with this flag will be printed.  The
	     known flags are:
	       ALLOC LOAD RELOC READONLY CODE DATA ROM CONSTRUCTOR
	       HAS_CONTENTS NEVER_LOAD COFF_SHARED_LIBRARY IS_COMMON

     Sections matching any of the FILTERS will be listed (no FILTERS implies
     all sections should be printed).

     Options:
       -all-objects
         Display information from all loaded object files.
   */

  CaptureSourceFiles(capArray: string[]): void {
    const lines = capArray.filter((line) => line.length > 0 && !line.match(/~"\\n"/));

    for (let i = 0; i < lines.length; i += 3) {
      const symfile = lines[i]?.match(/~"(?<symfile>[^:]+):\\n/)?.groups?.symfile;
      if (symfile) console.log("Found symbol file: ", symfile);

      const symstatus = lines[i + 1]?.match(/~"\((?<symstatus>[^:]+)\)\\n"/)?.groups?.symstatus;
      if (symstatus) console.log("Found symbol status: ", symstatus);

      const sourceFiles = lines[i + 2]?.match(/~"(?<sourcefiles>[^"]+)"/)?.groups?.sourcefiles;
      if (sourceFiles) {
        console.log("Found source files: ");
        for (const file of sourceFiles.split(", ")) {
          console.log("  Source file: ", file.replace(/\\n/g, ""));
        }
      }
    }
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

  CaptureLineVars(capArray: string[]): void {
    const cleanLines = capArray.map((raw) => GdbOutputCapture.stripMiEscaping(raw));
    console.warn("Captured line vars: ", cleanLines);
    this.gdbDB.addRawLineVarData(cleanLines);
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
