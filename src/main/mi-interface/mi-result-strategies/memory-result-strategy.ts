/**
 * Implements memory result strategy logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `MemoryResultStrategy`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { sendToRenderer } from "../../ipc-sender";
import { mapRegexGroupsToMemoryData } from "../mappers/memory-mapper";
import { MiOutputHost } from "../mi-output-types";
import { MiDoneResultStrategy } from "./mi-result-strategy-types";

export class MemoryResultStrategy implements MiDoneResultStrategy {
  private readonly rgxMemData: RegExp =
    /\[\{begin="(?<begin>[^"]*)",offset="(?<offset>[^"]*)",end="(?<end>[^"]*)",contents="(?<contents>[^"]*)"\}\]/;

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
    return resResult === "memory";
  }

  /**
   * Performs handle as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications. Performs asynchronous work and should be used with completion ordering in mind.
   *
   * @param _host - Value for `_host` consumed by this operation.
   * @param output - Value for `output` consumed by this operation.
   * @param _resList - Value for `_resList` consumed by this operation.
   * @returns A promise that resolves with the computed result after asynchronous processing completes.
   */
  handle(_host: MiOutputHost, output: string, _resList: string): Promise<boolean> {
    const memData = this.rgxMemData.exec(output);
    sendToRenderer("data-memory", mapRegexGroupsToMemoryData(memData?.groups));
    return Promise.resolve(true);
  }
}
