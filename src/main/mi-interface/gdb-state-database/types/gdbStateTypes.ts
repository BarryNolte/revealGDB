import { LocalsContainer } from "../../gdb-parsers/gdb-locals";

export type gdbShowSourceInfo = {
  fileName: string;
  line: string;
  contents: string | undefined;
};

export type gdbFeature = {
  feature: string;
  available: boolean;
};

export type gdbThread = {
  active: boolean;
  id: string;
  targetId: string;
  details: string;
  name: string;
  state: string;
  frame: gdbStackFrame;
};

export type gdbThreadGroup = {
  gid: string;
  threads: Map<string, string>;
};

export type gdbStackFrame = {
  active: boolean;
  level: string;
  func: string;
  addr: string;
  args: string;
  file: string;
  fullName: string;
  line: string;
  from: string;
  arch: string;
};

export type gdbRegisters = {
  name: string;
  value: string;
  changed: boolean;
};

export type gdbParams = {
  name: string;
  value: string;
};

export type gdbBreakpoint = {
  number: string;
  type: string;
  disp: string;
  enabled: string;
  addr: string;
  func: string;
  file: string;
  fullname: string;
  line: string;
  tg: string;
  times: string;
  installed: string;
  orgloc: string;
};

export type DisasmTokenType =
  | "address"
  | "function"
  | "leftparen"
  | "rightparen"
  | "text"
  | "instruction";

export type DisasmToken = {
  value: string;
  type: DisasmTokenType;
};

export type gdbAsmRow = {
  address: string;
  func: string;
  offset: string;
  opcodes: string;
  instructions: DisasmToken[];
};

export type gdbSection = {
  startAddr: string;
  endAddr: string;
  section: string;
  file?: string;
};

export type gdbSymbolFiles = {
  mainSym: string;
  sections: gdbSection[];
};

export type gdbFunction = {
  line: string;
  function: string;
};

export type AddThreadArgs = {
  id: string;
  targetId: string;
  details: string;
  name: string;
  frame: {
    level: string;
    addr: string;
    func: string;
    args: string;
    file: string;
    fullName: string;
    line: string;
    arch: string;
  };
  state: string;
  active: boolean;
};

export type LocalsValue = LocalsContainer | undefined;
