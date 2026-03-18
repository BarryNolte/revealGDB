/**
 * GDB MI interface: parse MI output and push structured updates to the UI.
 */
import { EventEmitter } from "events";
import { SelectedConnection } from "../../common/gdb-common";
import { AppSettings } from "../main";
import { ConnectionNotifier } from "../utilities/ConnectionNotifier";
import { GdbConnector, OutputAvailableEventArgs } from "./gdb-connector/gdb-connector";
import { gdbConnectorIdfOnWsl } from "./gdb-connector/gdb-connector-general";
import { GdbOutputCapture } from "./gdb-parsers/gdb-output-capture";
import { gdbStateDatabase } from "./gdb-state-database/gdbStateDatabase";
import { gdbShowSourceInfo, MiOutputProcessor } from "./mi-output-processor";

export type { gdbShowSourceInfo };

export class miInterface extends EventEmitter {
  private static lnum: number = 0;
  private conn: GdbConnector | null = null;
  readonly gdbDB: gdbStateDatabase = new gdbStateDatabase();
  // Captures multi-line MI outputs (e.g., symbol files, function list).
  private outputCapture: GdbOutputCapture = new GdbOutputCapture(this.gdbDB);
  private readonly outputProcessor: MiOutputProcessor = new MiOutputProcessor({
    gdbDB: this.gdbDB,
    emit: (eventName: string, ...args: unknown[]) => {
      this.emit(eventName, ...args);
    },
    send: (data: string) => {
      this.send(data);
    },
  });

  constructor() {
    super();
  }

  connect(selectedConnection: SelectedConnection): boolean {
    ConnectionNotifier.getInstance().startWatchingConsole();
    this.conn = new gdbConnectorIdfOnWsl(this.gdbDB);

    this.conn.on("gdb-exit", () => {
      console.log("GDB exited");
    });

    this.conn.on("gdb-data", (args: OutputAvailableEventArgs): void => {
      if (AppSettings.getSync("gdb.gui.showDebugInfo") as boolean) {
        this.emit(
          "debug-stream",
          `GDB Data (${miInterface.lnum++}): ${args.Output} ${args.Output.endsWith("\n")}`,
        );
      }
      void this.outputProcessor.handleDataChunk(args.Output, (line: string) => {
        return this.outputCapture.CaptureLine(line);
      });
    });

    this.conn.on("gdb-input", (input: string) => {
      this.emit("gdb-input", input);
    });

    this.conn.on("gdb-error", (args: OutputAvailableEventArgs) => {
      console.error(`GDB Error: ${args.Output}`);
      //throw new Error(`GDB Error: ${args.Output}`);
    });

    this.on("gdb-idle", () => {
      console.log("GDB is idle");
    });

    return this.conn.Start(selectedConnection);
  }

  disconnect(): void {
    console.log("Disconnecting from GDB");

    ConnectionNotifier.getInstance().endWatchingConsole();

    if (this.conn) {
      this.conn.removeAllListeners();
      this.conn.End();
      this.conn = null;
    }
  }

  send(data: string): void {
    if (AppSettings.getSync("gdb.gui.showDebugInfo") as boolean) {
      this.emit("debug-stream", data);
    }
    this.conn?.Send(data);
  }

  public parseRawOutput(output: string): Promise<boolean> {
    return this.outputProcessor.parseRawOutput(output);
  }

  public parseNotifyAsyncRecord(output: string): Promise<boolean> {
    return this.outputProcessor.parseNotifyAsyncRecord(output);
  }

  public parseResultRecord(output: string): Promise<boolean> {
    return this.outputProcessor.parseResultRecord(output);
  }
  public parseExecAsyncRecord(output: string): boolean {
    return this.outputProcessor.parseExecAsyncRecord(output);
  }

  public parseTargetStream(output: string): boolean {
    return this.outputProcessor.parseTargetStream(output);
  }

  public parseLogStream(output: string): boolean {
    return this.outputProcessor.parseLogStream(output);
  }

  public parseConsoleStream(output: string): boolean {
    return this.outputProcessor.parseConsoleStream(output);
  }
}
