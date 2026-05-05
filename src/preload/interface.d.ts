/**
 * Defines interface d preload bridge contracts exposed to the renderer process.
 *
 * @remarks
 * Exported symbols include `IElectronAPI`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { GdbAny } from "../common/gdb-common";
import {
  gdbAsmRow,
  gdbBreakpoint,
  gdbFunction,
  gdbRegisters,
  gdbShowSourceInfo,
  gdbStackFrame,
  gdbThread,
  gdbThreadGroup,
} from "../common/gdb-state-types";
import { NotifyMainRequest, NotifyRenderMessage } from "../common/ipc-contracts";
import { MemoryData, WslDistro } from "../common/ipc-data-types";
import { ILocal } from "../common/local-view";

type Unsubscribe = () => void;
type ValueCallback<T> = (data: T) => void;
type ConsoleCallback = ValueCallback<string>;
type ThemeChangedPayload = { shouldUseDarkColors: boolean };
type ConnectionCapturePayload = ["console-capture", { error: boolean; line: string }];
type ConnectionStartupPayload = ["gdb-startup", string, string];
type ConnectionStatusPayload = ConnectionCapturePayload | ConnectionStartupPayload;
type ThreadsPayload = { th: Map<string, gdbThread>; grp: Map<string, gdbThreadGroup> };

/**
 * Electron IPC API interface exposed to the renderer process.
 * This interface defines all communication channels between the main and renderer processes.
 * Each method returns a cleanup function to remove the event listener when no longer needed.
 */
export interface IElectronAPI {
  messages: {
    console: (callback: ConsoleCallback) => Unsubscribe;
    log: (callback: ConsoleCallback) => Unsubscribe;
    error: (callback: ConsoleCallback) => Unsubscribe;
    debug: (callback: ConsoleCallback) => Unsubscribe;
    html: (callback: ConsoleCallback) => Unsubscribe;
  };

  notifications: {
    connectionStatus: (callback: ValueCallback<ConnectionStatusPayload>) => Unsubscribe;
    render: (callback: ValueCallback<NotifyRenderMessage>) => Unsubscribe;
    themeChanged: (callback: ValueCallback<ThemeChangedPayload>) => Unsubscribe;
  };

  debuggerData: {
    registers: (callback: ValueCallback<Map<string, gdbRegisters>>) => Unsubscribe;
    stackFrames: (callback: ValueCallback<gdbStackFrame[]>) => Unsubscribe;
    sourceFile: (callback: ValueCallback<gdbShowSourceInfo>) => Unsubscribe;
    locals: (callback: ValueCallback<ILocal[] | undefined>) => Unsubscribe;
    threads: (callback: ValueCallback<ThreadsPayload>) => Unsubscribe;
    breakpoints: (callback: ValueCallback<Map<string, gdbBreakpoint>>) => Unsubscribe;
    memory: (callback: ValueCallback<MemoryData>) => Unsubscribe;
    disassembly: (callback: ValueCallback<gdbAsmRow[]>) => Unsubscribe;
    functions: (callback: ValueCallback<gdbFunction[]>) => Unsubscribe;
  };

  queries: {
    app: {
      getSettings: () => Promise<GdbAny>;
      getSystemFonts: () => Promise<string[]>;
      getVersionInfo: () => Promise<Map<string, GdbAny>>;
    };
    environment: {
      getWslDistrobutions: () => Promise<WslDistro[]>;
    };
    debugger: {
      getFunctionNames: () => Promise<GdbAny>;
    };
  };

  commands: {
    debugger: {
      sendGdbCommand: (command: string) => void;
    };
    app: {
      notifyMain: (command: NotifyMainRequest) => void;
    };
  };

  // === Message Channels (Main -> Renderer) ===

  /**
   * Registers a callback for console messages from the main process.
   * @param callback - Function to handle console messages
   * @returns Cleanup function to remove the listener
   */
  consoleMessage: (callback: ConsoleCallback) => Unsubscribe;

  /**
   * Registers a callback for log messages from the main process.
   * @param callback - Function to handle log messages
   * @returns Cleanup function to remove the listener
   */
  logMessage: (callback: ConsoleCallback) => Unsubscribe;

  /**
   * Registers a callback for error messages from the main process.
   * @param callback - Function to handle error messages
   * @returns Cleanup function to remove the listener
   */
  errorMessage: (callback: ConsoleCallback) => Unsubscribe;

  /**
   * Registers a callback for debug messages from the main process.
   * @param callback - Function to handle debug messages
   * @returns Cleanup function to remove the listener
   */
  debugMessage: (callback: ConsoleCallback) => Unsubscribe;

  /**
   * Registers a callback for html content from the main process.
   * @param callback - Function to handle html content
   * @returns Cleanup function to remove the listener
   */
  htmlMessage: (callback: ConsoleCallback) => Unsubscribe;

  /**
   * Registers a callback for connection status updates during GDB connection setup.
   * @param callback - Function to handle connection status changes
   * @returns Cleanup function to remove the listener
   */
  connectionStatus: (callback: ValueCallback<ConnectionStatusPayload>) => Unsubscribe;

  /**
   * Registers a callback for general notifications from main to renderer process.
   * @param callback - Function to handle notification messages
   * @returns Cleanup function to remove the listener
   */
  notifyRender: (callback: ValueCallback<NotifyRenderMessage>) => Unsubscribe;

  // === GDB Data Channels (Main -> Renderer) ===

  /**
   * Registers a callback for CPU register data updates from GDB.
   * @param callback - Function to handle register data
   * @returns Cleanup function to remove the listener
   */
  dataRegisters: (callback: ValueCallback<Map<string, gdbRegisters>>) => Unsubscribe;

  /**
   * Registers a callback for call stack frame updates from GDB.
   * @param callback - Function to handle stack frame data
   * @returns Cleanup function to remove the listener
   */
  stackFrames: (callback: ValueCallback<gdbStackFrame[]>) => Unsubscribe;

  /**
   * Registers a callback for source file content and location updates from GDB.
   * @param callback - Function to handle source file data
   * @returns Cleanup function to remove the listener
   */
  sourceFile: (callback: ValueCallback<gdbShowSourceInfo>) => Unsubscribe;

  /**
   * Registers a callback for local variable data updates from GDB.
   * @param callback - Function to handle local variables data
   * @returns Cleanup function to remove the listener
   */
  dataLocals: (callback: ValueCallback<Local[] | undefined>) => Unsubscribe;

  /**
   * Registers a callback for thread information updates from GDB.
   * @param callback - Function to handle thread data
   * @returns Cleanup function to remove the listener
   */
  dataThreads: (callback: ValueCallback<ThreadsPayload>) => Unsubscribe;

  /**
   * Registers a callback for breakpoint data updates from GDB.
   * @param callback - Function to handle breakpoint map data
   * @returns Cleanup function to remove the listener
   */
  dataBrkPts: (callback: ValueCallback<Map<string, gdbBreakpoint>>) => Unsubscribe;

  /**
   * Registers a callback for memory content updates from GDB.
   * @param callback - Function to handle memory data
   * @returns Cleanup function to remove the listener
   */
  dataMemory: (callback: ValueCallback<MemoryData>) => Unsubscribe;

  /**
   * Registers a callback for disassembled code updates from GDB.
   * @param callback - Function to handle disassembly data
   * @returns Cleanup function to remove the listener
   */
  dataDisasm: (callback: ValueCallback<gdbAsmRow[]>) => Unsubscribe;

  /**
   * Registers a callback for function symbol information from GDB.
   * @param callback - Function to handle function data
   * @returns Cleanup function to remove the listener
   */
  dataFunctions: (callback: ValueCallback<gdbFunction[]>) => Unsubscribe;

  // === Commands (Renderer -> Main) ===

  /**
   * Retrieves application settings from the main process.
   * @returns Settings object
   */
  getSettings: () => Promise<GdbAny>;

  /**
   * Retrieves the list of system fonts available for the UI.
   * @returns Promise resolving to an array of font names
   */
  getSystemFonts: () => Promise<string[]>;

  /**
   * Retrieves version information for the application and its components.
   * @returns Promise resolving to a map of version data
   */
  getVersionInfo: () => Promise<Map<string, GdbAny>>;

  /**
   * Retrieves available WSL distributions from the main process.
   * @returns Promise resolving to an array of WSL distribution names
   */
  getWslDistrobutions: () => Promise<WslDistro[]>;

  /**
   * Retrieves function symbol names from the main process.
   * @returns Promise resolving to debugger function metadata
   */
  getFunctionNames: () => Promise<GdbAny>;

  /**
   * Sends a GDB MI command to the debugger.
   * @param command - The GDB MI command string to execute
   */
  sendGdbCommand: (command: string) => void;

  /**
   * Sends a general notification/command to the main process.
   * @param command - The notification data to send
   */
  notifyMain: (command: NotifyMainRequest) => void;
}

/**
 * Global type augmentation to make the IPC API available on the window object.
 * This allows renderer process code to access IPC methods via window.ipcToMain.
 */
declare global {
  interface Window {
    /** IPC communication bridge to the main Electron process */
    ipcToMain: IElectronAPI;
  }
}
