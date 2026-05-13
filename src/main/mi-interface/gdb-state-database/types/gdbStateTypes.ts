/**
 * Implements gdb state types logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `gdbShowSourceInfo`, `gdbFeature`, `gdbThread`, `gdbThreadGroup`, `gdbStackFrame`, `gdbRegisters`, `gdbParams`, `gdbBreakpoint`, and others. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { LocalsContainer } from "../../gdb-parsers/gdb-locals";

export type {
  AddThreadArgs,
  DisasmToken,
  DisasmTokenType,
  gdbAsmRow,
  gdbBreakpoint,
  gdbFeature,
  gdbFunction,
  gdbLineEntry,
  gdbLineVarMap,
  gdbParams,
  gdbRegisters,
  gdbSection,
  gdbShowSourceInfo,
  gdbStackFrame,
  gdbSymbolBlock,
  gdbSymbolFiles,
  gdbThread,
  gdbThreadGroup,
  gdbVarDecl,
  gdbVarLocation,
  gdbVarReference,
} from "../../../../common/gdb-state-types";

export type LocalsValue = LocalsContainer | undefined;
