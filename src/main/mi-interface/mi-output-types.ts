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
};
