/**
 * Implements function store logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `FunctionStore`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { gdbFunction } from "../types/gdbStateTypes";

export class FunctionStore {
  readonly functionNames: Map<string, gdbFunction[]> = new Map<string, gdbFunction[]>();

  /**
   * Performs add function names as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param fileName - Filesystem or source path used to locate the target resource.
   * @param line - Line value used for source navigation or rendering.
   * @param func - Value for `func` consumed by this operation.
   */
  addFunctionNames(fileName: string, line: string, func: string): void {
    const functions = this.functionNames.get(fileName) || [];
    functions.push({ line, function: func });
    this.functionNames.set(fileName, functions);
  }

  /**
   * Returns function names from current state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param fileName - Filesystem or source path used to locate the target resource.
   * @returns The resulting collection produced by this operation.
   */
  getFunctionNames(fileName: string): gdbFunction[] | undefined {
    return this.functionNames.get(fileName);
  }

  /**
   * Returns function from current state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @returns The resulting collection produced by this operation.
   */
  getFunction(): Map<string, gdbFunction[]> {
    return this.functionNames;
  }

  /**
   * Returns all function names from current state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @returns The resulting collection produced by this operation.
   */
  getAllFunctionNames(): gdbFunction[] {
    const allFunctions: gdbFunction[] = [];
    this.functionNames.forEach((funcs) => {
      funcs.forEach((f) => {
        allFunctions.push(f);
      });
    });
    allFunctions.sort((a, b) => a.function.localeCompare(b.function));
    return allFunctions;
  }

  /**
   * Clears the operation from managed state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  clear(): void {
    this.functionNames.clear();
  }
}
