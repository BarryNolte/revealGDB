import { gdbFunction } from "../types/gdbStateTypes";

export class FunctionStore {
  readonly functionNames: Map<string, gdbFunction[]> = new Map<string, gdbFunction[]>();

  addFunctionNames(fileName: string, line: string, func: string): void {
    const functions = this.functionNames.get(fileName) || [];
    functions.push({ line, function: func });
    this.functionNames.set(fileName, functions);
  }

  getFunctionNames(fileName: string): gdbFunction[] | undefined {
    return this.functionNames.get(fileName);
  }

  getFunction(): Map<string, gdbFunction[]> {
    return this.functionNames;
  }

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

  clear(): void {
    this.functionNames.clear();
  }
}
