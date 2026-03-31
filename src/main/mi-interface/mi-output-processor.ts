import { MiExecAsyncHandler } from "./mi-exec-handler";
import { MiNotifyAsyncHandler } from "./mi-notify-handler";
import { MiOutputHost, gdbShowSourceInfo } from "./mi-output-types";
import { MiResultRecordHandler } from "./mi-result-handler";
import { MiStatusAsyncHandler } from "./mi-status-handler";

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
        await this.parseRawOutput(line);
      } catch (ex) {
        this.host.emit(
          "error-stream",
          `\n*************************************\nEXCEPTION: ${ex}\n*************************************\n`,
        );
      }
    }, Promise.resolve());
  }

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
        await this.parseNotifyAsyncRecord(output);
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
        // console.error(`Raw Output Type Unknown: ${output}`);
        this.host.emit("error-stream", output);
        return false;
      }
    }

    return true;
  }

  parseTargetStream(output: string): boolean {
    this.host.emit("log-error", `Target Stream: ${output}`);
    return true;
  }

  parseLogStream(output: string): boolean {
    const chunks = this.rgxLogStream.exec(output);
    const strLine = chunks?.groups?.line || "";

    if (strLine.endsWith("\\n")) {
      const lines: string[] = strLine.replaceAll('\\"', '"').replaceAll("\\t", "\t").split("\\n");
      if (lines[lines.length - 1] === "") {
        lines.pop();
      }
      lines.forEach((line: string) => {
        this.host.emit("log-stream", line);
      });
    }

    return true;
  }

  parseConsoleStream(output: string): boolean {
    const chunks = this.rgxConsoleStream.exec(output);
    const line = chunks?.groups?.line || "";
    this.savedConsoleStr += line;

    if (this.savedConsoleStr.endsWith("\\n")) {
      const lines: string[] = this.savedConsoleStr
        .replaceAll('\\"', '"')
        .replaceAll("\\t", "\t")
        .split("\\n");

      if (lines[lines.length - 1] === "") {
        lines.pop();
      }

      lines.forEach((currentLine: string) => {
        this.host.emit("console-stream", currentLine);
      });
      this.savedConsoleStr = "";
    }

    return true;
  }

  private parseStatusAsyncRecord(output: string): boolean {
    return this.statusHandler.parseStatusAsyncRecord(output);
  }

  parseNotifyAsyncRecord(output: string): Promise<boolean> {
    return this.notifyHandler.parseNotifyAsyncRecord(output);
  }

  parseResultRecord(output: string): Promise<boolean> {
    return this.resultHandler.parseResultRecord(output);
  }

  parseExecAsyncRecord(output: string): boolean {
    return this.execHandler.parseExecAsyncRecord(output);
  }
}
