/**
 * Implements mi result handler logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `MiResultRecordHandler`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { mainWindow } from "../main";
import { mapRegexGroupsToBreakpoint } from "./mappers/breakpoint-mapper";
import { MiOutputHost } from "./mi-output-types";
import { AsmResultStrategy } from "./mi-result-strategies/asm-result-strategy";
import { MemoryResultStrategy } from "./mi-result-strategies/memory-result-strategy";
import { MiDoneResultStrategy } from "./mi-result-strategies/mi-result-strategy-types";
import { RegistersResultStrategy } from "./mi-result-strategies/registers-result-strategy";
import { StackResultStrategy } from "./mi-result-strategies/stack-result-strategy";
import { ThreadsResultStrategy } from "./mi-result-strategies/threads-result-strategy";

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
      case "done": {
        const resChunks = this.rgxResultList.exec(data);

        const resResult: string = resChunks?.groups?.result || "";
        const resList: string = resChunks?.groups?.list || "";

        switch (resResult) {
          case "BreakpointTable": {
            const bps = resList.matchAll(this.rgxBps);
            this.host.gdbDB.clearBreakpoints();
            bps?.forEach((bkpt) => {
              this.host.gdbDB.createBreakpoint(mapRegexGroupsToBreakpoint(bkpt.groups));
            });

            mainWindow.webContents.send("data-brkpts", this.host.gdbDB.breakpoints);
            break;
          }
          case "features": {
            const cleanList = this.rgxCleanList.exec(resList)?.groups?.list || "";
            const features = cleanList.split(",");
            features.forEach((feature: string) => {
              this.host.gdbDB.addFeature(feature.replaceAll('"', ""));
            });
            break;
          }
          case "locals":
          case "variables": {
            this.host.gdbDB.parseAndStoreLocals(resList);
            this.host.gdbDB.localsUpdateUI();
            break;
          }
          case "value": {
            // Response to -data-evaluate-expression
            this.host.emit("log-stream", `^done value=${resList}`);
            break;
          }
          case "name": {
            // Response to -var-create
            this.host.emit("log-stream", `^done name=${resList}`);
            break;
          }
          case "children": {
            // Response to -var-list-children
            this.host.emit("log-stream", `^done children=${resList}`);
            break;
          }
          case "depth": {
            // Response to -stack-info-depth
            this.host.emit("log-stream", `^done depth=${resList}`);
            break;
          }
          case "changed-registers": {
            // Response to -data-list-changed-registers
            this.host.emit("log-stream", `^done changed-registers=${resList}`);
            break;
          }
          case "": {
            console.error("ResultRecord (empty): ARE WE DONE??");
            break;
          }
          default: {
            const strategy = this.doneResultStrategies.find((doneStrategy) =>
              doneStrategy.canHandle(resResult),
            );
            if (strategy) {
              await strategy.handle(this.host, output, resList);
              return true;
            }
            console.error(`ResultRecord (Unknown): ${resResult} --> ${resList}`);
            return false;
          }
        }
        break;
      }
      case "running": {
        this.host.emit("gdb-running", data);
        break;
      }
      case "connected": {
        this.host.emit("gdb-connected", data);
        break;
      }
      case "error": {
        const msgText = this.rgxErrorMsg
          .exec(data)
          ?.groups?.msg?.replaceAll('\\"', '"')
          .replaceAll("\\t", "\t")
          .split("\\n");
        if (msgText) {
          this.host.emit("error-stream", msgText);
        }
        break;
      }
      case "exit": {
        this.host.emit("gdb-exit", data);
        break;
      }
      default: {
        console.error(`ResultRecord (Unknown): ${result} --> ${data}`);
        return false;
      }
    }

    return true;
  }
}
