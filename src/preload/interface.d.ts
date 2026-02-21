/**
 * Electron IPC API interface exposed to the renderer process.
 * This interface defines all communication channels between the main and renderer processes.
 * Each method returns a cleanup function to remove the event listener when no longer needed.
 */
export interface IElectronAPI {
  // === Message Channels (Main -> Renderer) ===

  /**
   * Registers a callback for console messages from the main process.
   * @param callback - Function to handle console messages
   * @returns Cleanup function to remove the listener
   */
  consoleMessage: (callback: GdbAny) => () => void;

  /**
   * Registers a callback for log messages from the main process.
   * @param callback - Function to handle log messages
   * @returns Cleanup function to remove the listener
   */
  logMessage: (callback: GdbAny) => () => void;

  /**
   * Registers a callback for error messages from the main process.
   * @param callback - Function to handle error messages
   * @returns Cleanup function to remove the listener
   */
  errorMessage: (callback: GdbAny) => () => void;

  /**
   * Registers a callback for debug messages from the main process.
   * @param callback - Function to handle debug messages
   * @returns Cleanup function to remove the listener
   */
  debugMessage: (callback: GdbAny) => () => void;

  /**
   * Registers a callback for connection status updates during GDB connection setup.
   * @param callback - Function to handle connection status changes
   * @returns Cleanup function to remove the listener
   */
  connectionStatus: (callback: GdbAny) => () => void;

  /**
   * Registers a callback for general notifications from main to renderer process.
   * @param callback - Function to handle notification messages
   * @returns Cleanup function to remove the listener
   */
  notifyRender: (callback: GdbAny) => () => void;

  // === GDB Data Channels (Main -> Renderer) ===

  /**
   * Registers a callback for CPU register data updates from GDB.
   * @param callback - Function to handle register data
   * @returns Cleanup function to remove the listener
   */
  dataRegisters: (callback: GdbAny) => () => void;

  /**
   * Registers a callback for call stack frame updates from GDB.
   * @param callback - Function to handle stack frame data
   * @returns Cleanup function to remove the listener
   */
  stackFrames: (callback: GdbAny) => () => void;

  /**
   * Registers a callback for source file content and location updates from GDB.
   * @param callback - Function to handle source file data
   * @returns Cleanup function to remove the listener
   */
  sourceFile: (callback: GdbAny) => () => void;

  /**
   * Registers a callback for local variable data updates from GDB.
   * @param callback - Function to handle local variables data
   * @returns Cleanup function to remove the listener
   */
  dataLocals: (callback: GdbAny) => () => void;

  /**
   * Registers a callback for thread information updates from GDB.
   * @param callback - Function to handle thread data
   * @returns Cleanup function to remove the listener
   */
  dataThreads: (callback: GdbAny) => () => void;

  /**
   * Registers a callback for breakpoint data updates from GDB.
   * @param callback - Function to handle breakpoint map data
   * @returns Cleanup function to remove the listener
   */
  dataBrkPts: (callback: (data: Map<string, gdbBreakpoint>) => void) => () => void;

  /**
   * Registers a callback for memory content updates from GDB.
   * @param callback - Function to handle memory data
   * @returns Cleanup function to remove the listener
   */
  dataMemory: (callback: GdbAny) => () => void;

  /**
   * Registers a callback for disassembled code updates from GDB.
   * @param callback - Function to handle disassembly data
   * @returns Cleanup function to remove the listener
   */
  dataDisasm: (callback: GdbAny) => () => void;

  /**
   * Registers a callback for function symbol information from GDB.
   * @param callback - Function to handle function data
   * @returns Cleanup function to remove the listener
   */
  dataFunctions: (callback: GdbAny) => () => void;

  // === Commands (Renderer -> Main) ===

  /**
   * Retrieves application settings from the main process.
   * @returns Settings object
   */
  getSettings: () => GdbAny;

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
   * Sends a GDB MI command to the debugger.
   * @param command - The GDB MI command string to execute
   */
  sendGdbCommand: (command: string) => void;

  /**
   * Sends a general notification/command to the main process.
   * @param command - The notification data to send
   */
  notifyMain: (command: GdbAny) => void;
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
