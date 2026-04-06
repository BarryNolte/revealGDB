/**
 * Implements tool window titles behavior for debugger tool-window rendering and interactions.
 *
 * @remarks
 * Exported symbols include `TOOL_WINDOW_TITLES`. It coordinates live debugger data with user interactions in docked tool-window views.
 */
export const TOOL_WINDOW_TITLES = {
  source: "Source",
  locals: "Locals",
  threads: "Threads",
  registers: "Registers",
  disassembly: "Disassembly",
  command: "Command",
  memory: "Memory",
  callstack: "Call Stack",
  breakpoints: "Breakpoints",
} as const;
