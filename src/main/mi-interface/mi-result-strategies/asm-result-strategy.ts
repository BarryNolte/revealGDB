/**
 * Implements asm result strategy logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `AsmResultStrategy`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { mainWindow } from "../../main";
import { parseDisasmTokens } from "../gdb-parsers/disasmParser";
import { MiOutputHost } from "../mi-output-types";
import { MiDoneResultStrategy } from "./mi-result-strategy-types";
import { parseAsmRows } from "./asm-parsing-helpers";

export class AsmResultStrategy implements MiDoneResultStrategy {
  private readonly rgxAsmData: RegExp = /asm_insns=\[(?<asm_list>.*)]$/;
  private readonly rgxAsmRow: RegExp =
    /(?<asm_row>address="(?<address>[^"]*)",func-name="(?<func>[^"]*)",offset="(?<offset>[^"]*)",opcodes="(?<opcodes>[^"]*)",inst="(?<inst>[^"]*)")/g;

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
    return resResult === "asm_insns";
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
    const asmRowsText = parseAsmRows(output, this.rgxAsmData, this.rgxAsmRow, parseDisasmTokens);

    mainWindow.webContents.send("data-disasm", asmRowsText);
    return Promise.resolve(true);
  }
}
