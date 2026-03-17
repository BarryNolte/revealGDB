import { gdbSection, gdbSymbolFiles } from "../types/gdbStateTypes";

export class SymbolStore {
  readonly symbolFiles: gdbSymbolFiles = { mainSym: "", sections: [] };

  addMainSymbolFile(mainSym: string): void {
    this.symbolFiles.mainSym = mainSym;
  }

  addSection(section: gdbSection): void {
    this.symbolFiles.sections.push(section);
  }

  getSymbolFiles(): gdbSymbolFiles {
    return this.symbolFiles;
  }

  clear(): void {
    this.symbolFiles.mainSym = "";
    this.symbolFiles.sections = [];
  }
}
