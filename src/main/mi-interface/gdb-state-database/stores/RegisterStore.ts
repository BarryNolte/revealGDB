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
    const reg = this.registers.get(index);
    this.registers.set(index, {
      name: reg ? reg.name : index,
      value: regValue,
      changed: regValue !== (reg ? reg.value : ""),
    });
  }

  get(index: string): gdbRegisters | undefined {
    return this.registers.get(index);
  }

  clear(): void {
    this.registers.clear();
  }
}
