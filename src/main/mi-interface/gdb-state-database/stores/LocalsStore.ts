import { LocalsContainer } from "../../gdb-parsers/gdb-locals";

export class LocalsStore {
  locals: LocalsContainer | undefined = undefined;

  parseAndStoreLocals(localsStr: string): void {
    this.locals = new LocalsContainer(localsStr);
  }

  getLocals(): LocalsContainer | undefined {
    return this.locals;
  }

  clearLocals(): void {
    this.locals = undefined;
  }
}
