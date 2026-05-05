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
  gdbParams,
  gdbRegisters,
  gdbSection,
  gdbShowSourceInfo,
  gdbStackFrame,
  gdbSymbolFiles,
  gdbThread,
  gdbThreadGroup,
} from "../../../../common/gdb-state-types";

export type LocalsValue = LocalsContainer | undefined;
