/**
 * Implements symbol store logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `SymbolStore`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { gdbSection, gdbSymbolFiles } from "../types/gdbStateTypes";

export class SymbolStore {
  readonly symbolFiles: gdbSymbolFiles = { mainSym: "", sections: [] };

  /**
   * Performs add main symbol file as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param mainSym - Value for `mainSym` consumed by this operation.
   */
  addMainSymbolFile(mainSym: string): void {
    this.symbolFiles.mainSym = mainSym;
  }

  /**
   * Performs add section as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param section - Value for `section` consumed by this operation.
   */
  addSection(section: gdbSection): void {
    this.symbolFiles.sections.push(section);
  }

  /**
   * Returns symbol files from current state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @returns The computed result produced by this operation.
   */
  getSymbolFiles(): gdbSymbolFiles {
    return this.symbolFiles;
  }

  /**
   * Clears the operation from managed state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  clear(): void {
    this.symbolFiles.mainSym = "";
    this.symbolFiles.sections = [];
  }
}
