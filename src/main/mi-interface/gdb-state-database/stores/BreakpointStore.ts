import { gdbBreakpoint } from "../types/gdbStateTypes";

export class BreakpointStore {
  readonly breakpoints: Map<string, gdbBreakpoint> = new Map<string, gdbBreakpoint>();

  clear(): void {
    this.breakpoints.clear();
  }

  create(bkpt: gdbBreakpoint): void {
    this.breakpoints.set(bkpt.number, bkpt);
  }

  update(bkpt: gdbBreakpoint): void {
    this.breakpoints.set(bkpt.number, bkpt);
  }

  delete(id: string): void {
    this.breakpoints.delete(id);
  }
}
