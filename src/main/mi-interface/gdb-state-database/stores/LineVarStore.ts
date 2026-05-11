import { gdbLineVarMap } from "../types/gdbStateTypes";

export class LineVarStore {
  private readonly lineVarsByFile: Map<string, gdbLineVarMap> = new Map();

  add(map: gdbLineVarMap): void {
    this.lineVarsByFile.set(map.sourceFile, map);
  }

  get(sourceFile: string): gdbLineVarMap | undefined {
    return this.lineVarsByFile.get(sourceFile);
  }

  has(sourceFile: string): boolean {
    return this.lineVarsByFile.has(sourceFile);
  }

  clear(): void {
    this.lineVarsByFile.clear();
  }
}
