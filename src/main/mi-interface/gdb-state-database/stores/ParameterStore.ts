import { gdbParams } from "../types/gdbStateTypes";

export class ParameterStore {
  readonly params: Map<string, gdbParams> = new Map<string, gdbParams>();

  add(paramName: string, paramValue: string): void {
    this.params.set(paramName, { name: paramName, value: paramValue });
  }

  get(paramName: string): gdbParams | undefined {
    return this.params.get(paramName);
  }

  clear(): void {
    this.params.clear();
  }
}
