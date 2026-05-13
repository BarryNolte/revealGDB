/**
 * Shared GDB state types used across main, preload, and renderer processes.
 *
 * @remarks
 * These are pure data types with no process-specific dependencies — safe to import from any layer.
 */

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

export type gdbVarDecl = {
  name: string;
  typeStr: string;
  fields?: string[]; // field names for struct/union types; empty for scalar types
};

export type gdbVarReference = {
  line: number; // 1-based source line
  colStart: number; // 0-based column of first char of name
  colEnd: number; // 0-based column exclusive end of name
};

export type gdbVarLocation = {
  name: string;
  line: number; // 1-based source line; -1 if unknown
  colStart: number; // 0-based column of first char of name; -1 if unknown
  colEnd: number; // 0-based column exclusive end of name; -1 if unknown
  references: gdbVarReference[]; // all usages within the variable's scope
  fields?: string[]; // field names for struct/union types; propagated from gdbVarDecl
  typeStr?: string; // full GDB type expression; propagated from gdbVarDecl
};

export type gdbSymbolBlock = {
  startAddr: string;
  endAddr: string;
  functionName?: string;
  vars: gdbVarDecl[];
};

export type gdbLineEntry = {
  lineNum: number;
  address: string;
  isStmt: boolean;
};

export type gdbLineVarMap = {
  sourceFile: string;
  compilationDir: string;
  lineVars: Map<number, gdbVarLocation[]>;
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
