import { mapToRegisterEntry } from "../../mappers/register-mapper";
import { gdbRegisters } from "../types/gdbStateTypes";

export class RegisterStore {
  readonly registers: Map<string, gdbRegisters> = new Map<string, gdbRegisters>();

  addRegister(index: string, regName: string): void {
    const reg = this.registers.get(index);
    if (reg) {
      reg.name = regName;
    } else {
      this.registers.set(index, { name: regName, value: "", changed: false });
    }
  }

  addRegisterValue(index: string, regValue: string): void {
    this.registers.set(index, mapToRegisterEntry(index, regValue, this.registers.get(index)));
  }

  get(index: string): gdbRegisters | undefined {
    return this.registers.get(index);
  }

  clear(): void {
    this.registers.clear();
  }
}
