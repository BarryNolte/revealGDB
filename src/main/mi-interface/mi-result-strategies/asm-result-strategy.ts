import { mainWindow } from "../../main";
import { parseDisasmTokens } from "../gdb-parsers/disasmParser";
import { MiOutputHost } from "../mi-output-types";
import { MiDoneResultStrategy } from "./mi-result-strategy-types";
import { parseAsmRows } from "./regex-parsing-helpers";

export class AsmResultStrategy implements MiDoneResultStrategy {
  private readonly rgxAsmData: RegExp = /asm_insns=\[(?<asm_list>.*)]$/;
  private readonly rgxAsmRow: RegExp =
    /(?<asm_row>address="(?<address>[^"]*)",func-name="(?<func>[^"]*)",offset="(?<offset>[^"]*)",opcodes="(?<opcodes>[^"]*)",inst="(?<inst>[^"]*)")/g;

  canHandle(resResult: string): boolean {
    return resResult === "asm_insns";
  }

  handle(_host: MiOutputHost, output: string, _resList: string): Promise<boolean> {
    const asmRowsText = parseAsmRows(output, this.rgxAsmData, this.rgxAsmRow, parseDisasmTokens);

    mainWindow.webContents.send("data-disasm", asmRowsText);
    return Promise.resolve(true);
  }
}
