/**
 * Implements LineVarStore logic for managing per-file line-to-variable mappings in the GDB state database.
 *
 * @remarks
 * Exported symbols include `LineVarStore`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
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
