/**
 * Implements threads result strategy logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `ThreadsResultStrategy`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { sendToRenderer } from "../../ipc-sender";
import { MiOutputHost } from "../mi-output-types";
import { MiDoneResultStrategy } from "./mi-result-strategy-types";
import { getRegexGroups, getRegexMatches } from "./regex-parsing-helpers";
import { parseThreadFrameFromGroups } from "./thread-parsing-helpers";

export class ThreadsResultStrategy implements MiDoneResultStrategy {
  private readonly rgxThreads: RegExp = /\[(?<data>.*)\],current-thread-id="(?<curTid>.*)"/;
  private readonly rgxThreadData: RegExp =
    /{id="(?<tid>[^"]*)",target-id="(?<targId>[^"]*)"(?:,name="(?<name>[^"]*)")?(?:,details="(?<details>[^"]*)")?,frame={level="(?<level>[^"]*)",addr="(?<addr>[^"]*)",func="(?<func>[^"]*)",args=\[(?<args>[^\]]*)\](?:,file="(?<file>[^"]*)")?(?:,fullname="(?<fullname>[^"]*)")?(?:,line="(?<line>[^"]*)")?(?:,from="(?<from>[^"]*)")?,arch="(?<arch>[^"]*)"\},state="(?<state>[^"]*)"}/g;

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
    return resResult === "threads";
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
  handle(host: MiOutputHost, _output: string, resList: string): Promise<boolean> {
    const thVals = getRegexGroups(resList, this.rgxThreads);
    const curTid = thVals?.curTid || "";
    const tData = thVals?.data || "";
    const tValues = getRegexMatches(tData, this.rgxThreadData);

    host.gdbDB.clearThreadList();
    tValues.forEach((thread) => {
      const threadFrame = parseThreadFrameFromGroups(thread.groups);
      host.gdbDB.addThread({
        id: thread.groups?.tid || "",
        targetId: thread.groups?.targId || "",
        name: thread.groups?.name || "",
        details: thread.groups?.details || "",
        frame: threadFrame,
        state: thread.groups?.state || "",
        active: (thread.groups?.tid || "") === curTid,
      });
    });

    sendToRenderer("data-threads", {
      th: host.gdbDB.threads,
      grp: host.gdbDB.threadGroups,
    });
    return Promise.resolve(true);
  }
}
