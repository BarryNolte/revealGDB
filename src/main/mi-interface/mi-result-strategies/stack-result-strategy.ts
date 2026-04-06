/**
 * Implements stack result strategy logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `StackResultStrategy`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { mainWindow } from "../../main";
import { MiOutputHost, gdbShowSourceInfo } from "../mi-output-types";
import { MiDoneResultStrategy } from "./mi-result-strategy-types";
import { getRegexMatches } from "./regex-parsing-helpers";
import { parseStackFrameFromGroups } from "./stack-parsing-helpers";

export class StackResultStrategy implements MiDoneResultStrategy {
  private readonly rgxFrame: RegExp =
    /frame={level="(?<level>[^"]*)",addr="(?<addr>[^"]*)",func="(?<func>[^"]*)"(?:,file="(?<file>[^"]*)")?(?:,fullname="(?<fullname>[^"]*)")?(?:,line="(?<line>[^"]*)")?(?:,arch="(?<arch>[^"]*)")?}/g;

  /**
   * Performs can handle as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param resResult - Value for `resResult` consumed by this operation.
   * @returns True when the operation succeeds; otherwise false.
   */
  canHandle(resResult: string): boolean {
    return resResult === "stack";
  }

  /**
   * Performs handle as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications. Performs asynchronous work and should be used with completion ordering in mind.
   *
   * @param host - Value for `host` consumed by this operation.
   * @param _output - Value for `_output` consumed by this operation.
   * @param resList - Value for `resList` consumed by this operation.
   * @returns A promise that resolves with the computed result after asynchronous processing completes.
   */
  async handle(host: MiOutputHost, _output: string, resList: string): Promise<boolean> {
    const frameValues = getRegexMatches(resList, this.rgxFrame);

    host.gdbDB.clearStackFrames();
    if (frameValues.length === 0) {
      host.gdbDB.stackUpdateUI();
      return true;
    }

    frameValues.forEach((frameChunk) => {
      host.gdbDB.addStackFrame({
        active: false,
        ...parseStackFrameFromGroups(frameChunk.groups, ""),
      });
    });
    host.gdbDB.stackFrames[0].active = true;
    host.gdbDB.stackUpdateUI();

    const srcFileName = host.gdbDB.stackFrames[0].fullName || "";
    const showSourceInfo: gdbShowSourceInfo = {
      fileName: srcFileName,
      line: host.gdbDB.stackFrames[0].line,
      contents: await host.gdbDB.getSourceFileContents(srcFileName),
    };

    mainWindow.webContents.send("source-file", showSourceInfo);
    return true;
  }
}
