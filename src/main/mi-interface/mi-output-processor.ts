/**
 * Implements mi output processor logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `MiOutputProcessor`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { ConnectionNotifier } from "../utilities/ConnectionNotifier";
import { formatGeneralError } from "../utilities/html-error-formatter";
import { MiExecAsyncHandler } from "./mi-exec-handler";
import { MiNotifyAsyncHandler } from "./mi-notify-handler";
import { MiOutputHost, gdbShowSourceInfo } from "./mi-output-types";
import { MiResultRecordHandler } from "./mi-result-handler";
import { MiStatusAsyncHandler } from "./mi-status-handler";
import { CONSOLE_STREAM, ERROR_STREAM, HTML_STREAM, LOG_STREAM } from "./mi-stream-events";

export type { MiOutputHost, gdbShowSourceInfo };

export class MiOutputProcessor {
  private streamSave: string[] = [];
  private savedConsoleStr: string = "";

  private readonly rgxLogStream: RegExp = /^&"(?<line>.*?)"$/;
  private readonly rgxConsoleStream: RegExp = /^~"(?<line>.*?)"$/;

  private readonly resultHandler: MiResultRecordHandler;
  private readonly notifyHandler: MiNotifyAsyncHandler;
  private readonly execHandler: MiExecAsyncHandler;
  private readonly statusHandler: MiStatusAsyncHandler;

  constructor(private readonly host: MiOutputHost) {
    this.resultHandler = new MiResultRecordHandler(host);
    this.notifyHandler = new MiNotifyAsyncHandler(host);
    this.execHandler = new MiExecAsyncHandler(host);
    this.statusHandler = new MiStatusAsyncHandler(host);
  }

  /**
   * Performs decode mi escapes as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param input - Value for `input` consumed by this operation.
   * @returns The resulting string value produced by this operation.
   */
  private decodeMiEscapes(input: string): string {
    return input.replace(/\\\\nnn|\\"|\\t|\\n/g, (match) => {
      switch (match) {
        case "\\\\nnn":
          return "\\nnn";
        case '\\"':
          return '"';
        case "\\t":
          return "\t";
        case "\\n":
          return "\n";
        default:
          return match;
      }
    });
  }

  /**
   * Performs handle data chunk as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications. Includes explicit error-handling logic for expected failure paths. Performs asynchronous work and should be used with completion ordering in mind.
   *
   * @param rawOutput - Value for `rawOutput` consumed by this operation.
   * @param captureLine - Line value used for source navigation or rendering.
   * @returns A promise that resolves with the computed result after asynchronous processing completes.
   */
  async handleDataChunk(rawOutput: string, captureLine: (line: string) => boolean): Promise<void> {
    if (!rawOutput.endsWith("\n")) {
      this.streamSave.push(rawOutput);
      return;
    }

    let totalStream = "";
    this.streamSave.forEach((s) => {
      totalStream += s;
    });
    this.streamSave = [];
    totalStream += rawOutput;

    const lines = totalStream.split("\n");
    await lines.reduce<Promise<void>>(async (prev, line) => {
      await prev;
      try {
        if (captureLine(line)) {
          return;
        }

        // console.log(`Raw line received: ${line}`);
        // eslint-disable-next-line no-control-regex
        line = line.replaceAll(/\x1B\[[0-9;?]*[ -/]*[@-~]/g, "");
        // console.log(`Processing line: ${line}`);

        if (this.handleConnectionNotifier(line)) {
          return;
        }

        await this.parseRawOutput(line);
      } catch (ex) {
        this.host.emit(
          ERROR_STREAM,
          `\n*************************************\nEXCEPTION: ${ex}\n*************************************\n`,
        );
      }
    }, Promise.resolve());
  }

  /**
   * Performs handle connection notifier as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param line - Line value used for source navigation or rendering.
   * @returns True when the operation succeeds; otherwise false.
   */
  private handleConnectionNotifier(line: string): boolean {
    const notifier = ConnectionNotifier.getInstance();
    const isAsyncNotifyRecord = /^\d*=/.test(line) || line.startsWith("=");
    const isMiControlRecord = /^\d*[\^*=+]/.test(line);
    const isThreadGroupAdded =
      line.includes("thread-group-added") || line.includes("thread-group-started");

    if (notifier.isWatchingConsole() && isAsyncNotifyRecord && isThreadGroupAdded) {
      notifier.endWatchingConsole();
      notifier.notifyGdbStartup("target-running", "completed");
      return false;
    }

    if (notifier.isWatchingConsole()) {
      // Keep consuming startup console output, but do not swallow MI control records.
      if (!isMiControlRecord) {
        notifier.consoleCapture(false, line);
        return true;
      }

      return false;
    }

    return false;
  }

  /**
   * Parses input into raw output data.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications. Performs asynchronous work and should be used with completion ordering in mind.
   *
   * @param output - Value for `output` consumed by this operation.
   * @returns A promise that resolves with the computed result after asynchronous processing completes.
   */
  async parseRawOutput(output: string): Promise<boolean> {
    if (output.length === 0) {
      return true;
    }

    switch (output[0]) {
      case "~":
        this.parseConsoleStream(output);
        break;
      case "@":
        this.parseTargetStream(output);
        break;
      case "&":
        this.parseLogStream(output);
        break;
      case "^":
        await this.parseResultRecord(output);
        break;
      case "*":
        this.parseExecAsyncRecord(output);
        break;
      case "=":
        this.parseNotifyAsyncRecord(output);
        break;
      case "+":
        this.parseStatusAsyncRecord(output);
        break;
      case "(": {
        if (output.startsWith("(gdb)")) {
          this.host.emit("gdb-idle");
        }
        break;
      }
      default: {
        this.host.emit(HTML_STREAM, formatGeneralError("Unknown MI Output", output));
        return false;
      }
    }

    return true;
  }

  /**
   * Parses input into target stream data.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param output - Value for `output` consumed by this operation.
   * @returns True when the operation succeeds; otherwise false.
   */
  parseTargetStream(output: string): boolean {
    this.host.emit("log-error", `Target Stream: ${output}`);
    return true;
  }

  /**
   * Parses input into log stream data.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param output - Value for `output` consumed by this operation.
   * @returns True when the operation succeeds; otherwise false.
   */
  parseLogStream(output: string): boolean {
    const chunks = this.rgxLogStream.exec(output);
    const strLine = chunks?.groups?.line || "";

    if (strLine.endsWith("\\n")) {
      const lines: string[] = this.decodeMiEscapes(strLine).split("\n");
      if (lines[lines.length - 1] === "") {
        lines.pop();
      }
      lines.forEach((line: string) => {
        this.host.emit(LOG_STREAM, line);
      });
    }

    return true;
  }

  /**
   * Parses input into console stream data.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param output - Value for `output` consumed by this operation.
   * @returns True when the operation succeeds; otherwise false.
   */
  parseConsoleStream(output: string): boolean {
    const chunks = this.rgxConsoleStream.exec(output);
    const line = chunks?.groups?.line || "";
    this.savedConsoleStr += line;

    if (this.savedConsoleStr.endsWith("\\n")) {
      const lines: string[] = this.decodeMiEscapes(this.savedConsoleStr).split("\n");

      if (lines[lines.length - 1] === "") {
        lines.pop();
      }

      lines.forEach((currentLine: string) => {
        this.host.emit(CONSOLE_STREAM, currentLine);
      });
      this.savedConsoleStr = "";
    }

    return true;
  }

  /**
   * Parses input into status async record data.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param output - Value for `output` consumed by this operation.
   * @returns True when the operation succeeds; otherwise false.
   */
  private parseStatusAsyncRecord(output: string): boolean {
    return this.statusHandler.parseStatusAsyncRecord(output);
  }

  /**
   * Parses input into notify async record data.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications. Performs asynchronous work and should be used with completion ordering in mind.
   *
   * @param output - Value for `output` consumed by this operation.
   * @returns A promise that resolves with the computed result after asynchronous processing completes.
   */
  parseNotifyAsyncRecord(output: string): boolean {
    return this.notifyHandler.parseNotifyAsyncRecord(output);
  }

  /**
   * Parses input into result record data.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications. Performs asynchronous work and should be used with completion ordering in mind.
   *
   * @param output - Value for `output` consumed by this operation.
   * @returns A promise that resolves with the computed result after asynchronous processing completes.
   */
  parseResultRecord(output: string): Promise<boolean> {
    return this.resultHandler.parseResultRecord(output);
  }

  /**
   * Parses input into exec async record data.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param output - Value for `output` consumed by this operation.
   * @returns True when the operation succeeds; otherwise false.
   */
  parseExecAsyncRecord(output: string): boolean {
    return this.execHandler.parseExecAsyncRecord(output);
  }
}
