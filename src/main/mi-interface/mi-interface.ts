/**
 * Implements mi interface logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `GdbCommandInterface`, `miInterface`. It sits on the debugger data path that translates MI records into typed stores and notifications.
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

export interface GdbCommandInterface {
  continueExecution(): void;
  stepOver(): void;
  stepInto(): void;
  stepOut(): void;
  pauseExecution(): void;
  stopDebugging(): void;
  runCommand(command: string): void;
}

export class miInterface extends EventEmitter implements GdbCommandInterface {
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

  public onStartup: string[] = ["-list-features", "-data-list-register-names"];
  public onStopped: string[] = [
    "-data-list-register-values x",
    "-stack-list-frames",
    "-stack-list-locals 1",
    "-thread-info",
  ];

  constructor() {
    super();
    this.gdbDB.on("error-stream", (line: string) => {
      this.emit("error-stream", line);
    });
  }

  /**
   * Performs connect as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param selectedConnection - Value for `selectedConnection` consumed by this operation.
   * @returns True when the operation succeeds; otherwise false.
   */
  connect(selectedConnection: SelectedConnection): boolean {
    ConnectionNotifier.getInstance().startWatchingConsole();
    this.conn = new gdbConnectorIdfOnWsl(this.gdbDB);

    this.conn.on("gdb-exit", () => {
      // console.log("GDB exited");
    });

    this.conn.on("gdb-data", (args: OutputAvailableEventArgs): void => {
      this.sendOutputToHandler(args);
    });

    this.conn.on("gdb-error", (args: OutputAvailableEventArgs) => {
      this.sendOutputToHandler(args);
    });

    this.conn.on("gdb-input", (input: string) => {
      this.emit("gdb-input", input);
    });

    this.on("gdb-idle", () => {
      // console.log("GDB is idle");
    });

    return this.conn.Start(selectedConnection);
  }

  /**
   * Performs send output to handler as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param args - Configuration values that control how this operation executes.
   */
  private sendOutputToHandler(args: OutputAvailableEventArgs) {
    if (AppSettings.getSync("gdb.gui.showDebugInfo") as boolean) {
      this.emit(
        "debug-stream",
        `GDB Data (${miInterface.lnum++}): ${args.Output} ${args.Output.endsWith("\n")}`,
      );
    }
    void this.outputProcessor.handleDataChunk(args.Output, (line: string) => {
      return this.outputCapture.CaptureLine(line);
    });
  }

  /**
   * Performs disconnect as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  disconnect(): void {
    // console.log("Disconnecting from GDB");

    ConnectionNotifier.getInstance().endWatchingConsole();

    if (this.conn) {
      this.conn.removeAllListeners();
      this.conn.End();
      this.conn = null;
    }
  }

  /**
   * Performs send as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param data - Structured payload consumed by this operation.
   */
  send(data: string): void {
    if (AppSettings.getSync("gdb.gui.showDebugInfo") as boolean) {
      this.emit("debug-stream", data);
    }
    this.conn?.Send(data);
  }

  /**
   * Performs continue execution as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  public continueExecution(): void {
    this.send("continue");
  }

  /**
   * Performs step over as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  public stepOver(): void {
    this.send("next");
  }

  /**
   * Performs step into as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  public stepInto(): void {
    this.send("step");
  }

  /**
   * Performs step out as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  public stepOut(): void {
    this.send("finish");
  }

  /**
   * Performs pause execution as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  public pauseExecution(): void {
    this.send("signal SIGINT");
  }

  /**
   * Stops debugging for the current workflow.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  public stopDebugging(): void {
    this.send("kill");
  }

  /**
   * Performs run command as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param command - Debugger command text or command descriptor to execute.
   */
  public runCommand(command: string): void {
    this.send(command);
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
  public parseRawOutput(output: string): Promise<boolean> {
    return this.outputProcessor.parseRawOutput(output);
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
  public parseNotifyAsyncRecord(output: string): Promise<boolean> {
    return this.outputProcessor.parseNotifyAsyncRecord(output);
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
  public parseResultRecord(output: string): Promise<boolean> {
    return this.outputProcessor.parseResultRecord(output);
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
  public parseExecAsyncRecord(output: string): boolean {
    return this.outputProcessor.parseExecAsyncRecord(output);
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
  public parseTargetStream(output: string): boolean {
    return this.outputProcessor.parseTargetStream(output);
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
  public parseLogStream(output: string): boolean {
    return this.outputProcessor.parseLogStream(output);
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
  public parseConsoleStream(output: string): boolean {
    return this.outputProcessor.parseConsoleStream(output);
  }
}
