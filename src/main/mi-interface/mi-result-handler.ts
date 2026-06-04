/**
 * Implements mi result handler logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `MiResultRecordHandler`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { sendToRenderer } from "../ipc-sender";
import { formatGeneralError } from "../utilities/html-error-formatter";
import { debugLog } from "../utilities/logger";
import { mapRegexGroupsToBreakpoint } from "./mappers/breakpoint-mapper";
import { MiOutputHost } from "./mi-output-types";
import { AsmResultStrategy } from "./mi-result-strategies/asm-result-strategy";
import { MemoryResultStrategy } from "./mi-result-strategies/memory-result-strategy";
import { MiDoneResultStrategy } from "./mi-result-strategies/mi-result-strategy-types";
import { RegistersResultStrategy } from "./mi-result-strategies/registers-result-strategy";
import { StackResultStrategy } from "./mi-result-strategies/stack-result-strategy";
import { ThreadsResultStrategy } from "./mi-result-strategies/threads-result-strategy";

import { ERROR_STREAM, HTML_STREAM, LOG_STREAM } from "./mi-stream-events";

export class MiResultRecordHandler {
  private readonly rgxResultRecord: RegExp = /^\^(?<result>[^,]*),?(?<data>.*)?$/;
  private readonly rgxResultList: RegExp = /^(?<result>.*?)=(?<list>.*)$/;
  private readonly rgxBps: RegExp =
    /bkpt={number="(?<number>[^"]*)",type="(?<type>[^"]*)",disp="(?<disp>[^"]*)",enabled="(?<enabled>[^"]*)",addr="(?<addr>[^"]*)",func="(?<func>[^"]*)",file="(?<file>[^"]*)",fullname="(?<fullname>[^"]*)",line="(?<line>[^"]*)",thread-groups=\[(?<tg>[^\]]*)],times="(?<times>[^"]*)",original-location="(?<orgLoc>[^"]*)"}/g;
  private readonly rgxCleanList: RegExp = /\[(?<list>.*)\]/;
  private readonly rgxErrorMsg: RegExp = /^msg="(?<msg>[^"]*)"$/;
  private readonly doneResultStrategies: MiDoneResultStrategy[];

  constructor(private readonly host: MiOutputHost) {
    this.doneResultStrategies = [
      new AsmResultStrategy(),
      new MemoryResultStrategy(),
      new ThreadsResultStrategy(),
      new RegistersResultStrategy(),
      new StackResultStrategy(),
    ];
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
  async parseResultRecord(output: string): Promise<boolean> {
    const chunks = this.rgxResultRecord.exec(output);
    const result = chunks?.groups?.result || "";
    const data = chunks?.groups?.data || "";

    switch (result) {
      case "done":
        return await this.handleDone(data, output);
      case "running":
        this.host.emit("gdb-running", data);
        break;
      case "connected":
        this.host.emit("gdb-connected", data);
        break;
      case "error":
        this.handleError(data);
        break;
      case "exit":
        this.host.emit("gdb-exit", data);
        break;
      default: {
        this.host.emit(
          HTML_STREAM,
          formatGeneralError("Unknown MI Result Record", `Result: ${result}`, `Data: ${data}`),
        );
        return false;
      }
    }
    return true;
  }

  private async handleDone(data: string, output: string): Promise<boolean> {
    const resChunks = this.rgxResultList.exec(data);
    const resResult: string = resChunks?.groups?.result || "";
    const resList: string = resChunks?.groups?.list || "";

    switch (resResult) {
      case "BreakpointTable":
        this.handleBreakpointTable(resList);
        break;
      case "new-thread-id":
        this.host.runOnStopped();
        break;
      case "features":
        this.handleFeatures(resList);
        break;
      case "locals":
      case "variables":
        this.host.gdbDB.parseAndStoreLocals(resList);
        this.host.gdbDB.localsUpdateUI();
        break;
      case "value": {
        // Response to -data-evaluate-expression; strip surrounding quotes GDB wraps around the value string
        const rawValue = resList.replace(/^"(.*)"$/, "$1");
        this.host.emit("value-evaluated", rawValue);
        break;
      }
      case "":
        debugLog("ResultRecord (empty): ARE WE DONE??");
        break;
      default:
        return await this.handleDoneDefault(resResult, resList, output);
    }
    return true;
  }

  // Responses to -var-create, -var-list-children, -stack-info-depth, -data-list-changed-registers
  private static readonly LOG_RESULT_NAMES = new Set([
    "name",
    "children",
    "depth",
    "changed-registers",
  ]);

  private handleBreakpointTable(resList: string): void {
    const bps = resList.matchAll(this.rgxBps);
    this.host.gdbDB.clearBreakpoints();
    bps?.forEach((bkpt) => {
      this.host.gdbDB.createBreakpoint(mapRegexGroupsToBreakpoint(bkpt.groups));
    });
    sendToRenderer("data-brkpts", this.host.gdbDB.breakpoints);
  }

  private handleFeatures(resList: string): void {
    const cleanList = this.rgxCleanList.exec(resList)?.groups?.list || "";
    const features = cleanList.split(",");
    features.forEach((feature: string) => {
      this.host.gdbDB.addFeature(feature.replaceAll('"', ""));
    });
  }

  private async handleDoneDefault(
    resResult: string,
    resList: string,
    output: string,
  ): Promise<boolean> {
    if (MiResultRecordHandler.LOG_RESULT_NAMES.has(resResult)) {
      this.host.emit(LOG_STREAM, `^done ${resResult}=${resList}`);
      return true;
    }
    const strategy = this.doneResultStrategies.find((doneStrategy) =>
      doneStrategy.canHandle(resResult),
    );
    if (strategy) {
      await strategy.handle(this.host, output, resList);
      return true;
    }
    this.host.emit(
      HTML_STREAM,
      formatGeneralError("Unknown MI Result Record", `Result: ${resResult}`, `Data: ${resList}`),
    );
    return false;
  }

  private handleError(data: string): void {
    // If an expression evaluation is in-flight, route the error to the dedicated
    // 'expression-error' event so it resolves the promise without flooding the
    // command window (e.g. hovering over a type name causes GDB to report an error).
    if (this.host.getEvaluatingExpression()) {
      this.host.emit("expression-error");
      return;
    }
    const msgText = this.rgxErrorMsg
      .exec(data)
      ?.groups?.msg?.replaceAll('\\"', '"')
      .replaceAll("\\t", "\t")
      .split("\\n");
    if (msgText) {
      this.host.emit(ERROR_STREAM, msgText);
    }
  }
}
