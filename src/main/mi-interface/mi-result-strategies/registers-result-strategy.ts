/**
 * Implements registers result strategy logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `RegistersResultStrategy`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { MiOutputHost } from "../mi-output-types";
import { MiDoneResultStrategy } from "./mi-result-strategy-types";
import { parseRegisterPayload } from "./register-parsing-helpers";

export class RegistersResultStrategy implements MiDoneResultStrategy {
  private readonly rgxCleanList: RegExp = /\[(?<list>.*)\]/;
  private readonly rgxRegisterValues: RegExp =
    /{number="(?<number>[^"]*)",value="(?<value>[^"]*)"}/g;

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
    return resResult === "register-names" || resResult === "register-values";
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
    const parsedPayload = parseRegisterPayload(resList, this.rgxCleanList, this.rgxRegisterValues);

    parsedPayload.names.forEach((registerName: string, index: number) => {
      host.gdbDB.addRegister(index.toString(), registerName);
    });
    parsedPayload.values.forEach((regValue) => {
      host.gdbDB.addRegisterValue(regValue.number, regValue.value);
    });

    host.gdbDB.registersUpdateUI();
    return Promise.resolve(true);
  }
}
