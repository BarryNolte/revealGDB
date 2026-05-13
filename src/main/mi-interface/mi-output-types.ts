/**
 * Implements mi output types logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `gdbShowSourceInfo`, `MiOutputHost`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { gdbStateDatabase } from "./gdb-state-database/gdbStateDatabase";

export type gdbShowSourceInfo = {
  fileName: string;
  line: string;
  contents: string | undefined;
};

export type MiOutputHost = {
  gdbDB: gdbStateDatabase;
  emit: (eventName: string, ...args: unknown[]) => void;
  send: (data: string) => void;
  /** Returns true while an -data-evaluate-expression command is outstanding. */
  getEvaluatingExpression: () => boolean;
};
