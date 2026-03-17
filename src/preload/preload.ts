import { contextBridge, ipcRenderer } from "electron";
import { GdbAny } from "../common/gdb-common";
import { IPC_CHANNELS, NotifyMainRequest } from "../common/ipc-contracts";

/**
 * Preload script for Electron renderer process.
 *
 * This script runs in a privileged context before the renderer process loads.
 * It uses contextBridge to safely expose IPC communication methods to the renderer.
 *
 * IMPORTANT: This implementation must be kept in sync with ./src/preload/interface.d.ts
 * for proper TypeScript type checking and code completion in the renderer process.
 *
 * Security: contextBridge provides isolation between the privileged Node.js context
 * and the renderer process, preventing direct access to Node.js APIs while allowing
 * controlled communication via the exposed ipcToMain API.
 */
contextBridge.exposeInMainWorld("ipcToMain", {
  // ========================================================================
  // Message Channels: Main Process -> Renderer Process
  // ========================================================================

  /**
   * Subscribes to console messages from the main process.
   * Wraps the callback in an IPC event listener and provides cleanup.
   */
  consoleMessage: (callback: GdbAny) => {
    const listener = (_event: Electron.IpcRendererEvent, value: GdbAny) => callback(value);
    ipcRenderer.on(IPC_CHANNELS.mainToRenderer.consoleMessage, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.mainToRenderer.consoleMessage, listener);
    };
  },

  /**
   * Subscribes to log messages from the main process.
   * Used for general application logging and status updates.
   */
  logMessage: (callback: GdbAny) => {
    const listener = (_event: Electron.IpcRendererEvent, value: GdbAny) => callback(value);
    ipcRenderer.on(IPC_CHANNELS.mainToRenderer.logMessage, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.mainToRenderer.logMessage, listener);
    };
  },

  /**
   * Subscribes to error messages from the main process.
   * Handles critical errors and exceptions that need to be displayed to the user.
   */
  errorMessage: (callback: GdbAny) => {
    const listener = (_event: Electron.IpcRendererEvent, value: GdbAny) => callback(value);
    ipcRenderer.on(IPC_CHANNELS.mainToRenderer.errorMessage, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.mainToRenderer.errorMessage, listener);
    };
  },

  /**
   * Subscribes to debug messages from the main process.
   * Only active in debug builds for detailed diagnostic information.
   */
  debugMessage: (callback: GdbAny) => {
    const listener = (_event: Electron.IpcRendererEvent, value: GdbAny) => callback(value);
    ipcRenderer.on(IPC_CHANNELS.mainToRenderer.debugMessage, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.mainToRenderer.debugMessage, listener);
    };
  },

  /**
   * Subscribes to GDB connection status updates.
   * Provides real-time feedback during the connection establishment process.
   */
  connectionStatus: (callback: GdbAny) => {
    const listener = (_event: Electron.IpcRendererEvent, value: GdbAny) => callback(value);
    ipcRenderer.on(IPC_CHANNELS.mainToRenderer.connectionStatus, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.mainToRenderer.connectionStatus, listener);
    };
  },

  /**
   * Subscribes to general notifications from the main process.
   * Used for miscellaneous commands and state updates that don't fit other categories.
   */
  notifyRender: (callback: GdbAny) => {
    const listener = (_event: Electron.IpcRendererEvent, value: GdbAny) => callback(value);
    ipcRenderer.on(IPC_CHANNELS.mainToRenderer.notifyRender, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.mainToRenderer.notifyRender, listener);
    };
  },

  // ========================================================================
  // GDB Data Channels: Main Process -> Renderer Process
  // ========================================================================

  /**
   * Subscribes to CPU register data updates from GDB.
   * Provides register values for display in the registers window.
   */
  dataRegisters: (callback: GdbAny) => {
    const listener = (_event: Electron.IpcRendererEvent, value: GdbAny) => callback(value);
    ipcRenderer.on(IPC_CHANNELS.mainToRenderer.dataRegisters, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.mainToRenderer.dataRegisters, listener);
    };
  },

  /**
   * Subscribes to call stack frame updates from GDB.
   * Provides backtrace information for the callstack window.
   */
  stackFrames: (callback: GdbAny) => {
    const listener = (_event: Electron.IpcRendererEvent, value: GdbAny) => callback(value);
    ipcRenderer.on(IPC_CHANNELS.mainToRenderer.stackFrames, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.mainToRenderer.stackFrames, listener);
    };
  },

  /**
   * Subscribes to source file content and position updates from GDB.
   * Provides source code and current execution location for the source window.
   */
  sourceFile: (callback: GdbAny) => {
    const listener = (_event: Electron.IpcRendererEvent, value: GdbAny) => callback(value);
    ipcRenderer.on(IPC_CHANNELS.mainToRenderer.sourceFile, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.mainToRenderer.sourceFile, listener);
    };
  },

  /**
   * Subscribes to local variable data updates from GDB.
   * Provides variable names, types, and values for the locals window.
   */
  dataLocals: (callback: GdbAny) => {
    const listener = (_event: Electron.IpcRendererEvent, value: GdbAny) => callback(value);
    ipcRenderer.on(IPC_CHANNELS.mainToRenderer.dataLocals, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.mainToRenderer.dataLocals, listener);
    };
  },

  /**
   * Subscribes to thread information updates from GDB.
   * Provides thread list, status, and current active thread for the threads window.
   */
  dataThreads: (callback: GdbAny) => {
    const listener = (_event: Electron.IpcRendererEvent, value: GdbAny) => callback(value);
    ipcRenderer.on(IPC_CHANNELS.mainToRenderer.dataThreads, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.mainToRenderer.dataThreads, listener);
    };
  },

  /**
   * Subscribes to breakpoint data updates from GDB.
   * Provides breakpoint list, locations, and status for the breakpoints window.
   */
  dataBrkPts: (callback: GdbAny) => {
    const listener = (_event: Electron.IpcRendererEvent, value: GdbAny) => callback(value);
    ipcRenderer.on(IPC_CHANNELS.mainToRenderer.dataBrkPts, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.mainToRenderer.dataBrkPts, listener);
    };
  },

  /**
   * Subscribes to memory content updates from GDB.
   * Provides raw memory data for the memory/hex editor window.
   */
  dataMemory: (callback: GdbAny) => {
    const listener = (_event: Electron.IpcRendererEvent, value: GdbAny) => callback(value);
    ipcRenderer.on(IPC_CHANNELS.mainToRenderer.dataMemory, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.mainToRenderer.dataMemory, listener);
    };
  },

  /**
   * Subscribes to disassembled instruction updates from GDB.
   * Provides assembly code for the disassembler window.
   */
  dataDisasm: (callback: GdbAny) => {
    const listener = (_event: Electron.IpcRendererEvent, value: GdbAny) => callback(value);
    ipcRenderer.on(IPC_CHANNELS.mainToRenderer.dataDisasm, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.mainToRenderer.dataDisasm, listener);
    };
  },

  /**
   * Subscribes to function symbol information from GDB.
   * Provides function names and addresses for navigation in the disassembler window.
   */
  dataFunctions: (callback: GdbAny) => {
    const listener = (_event: Electron.IpcRendererEvent, value: GdbAny) => callback(value);
    ipcRenderer.on(IPC_CHANNELS.mainToRenderer.dataFunctions, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.mainToRenderer.dataFunctions, listener);
    };
  },

  // ========================================================================
  // Commands: Renderer Process -> Main Process
  // ========================================================================

  /**
   * Retrieves application settings from the main process.
   * Uses invoke pattern for request-response communication.
   */
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.rendererInvoke.getSettings),

  /**
   * Retrieves the list of available system fonts.
   * Used to populate font selection in settings.
   */
  getSystemFonts: () => ipcRenderer.invoke(IPC_CHANNELS.rendererInvoke.getSystemFonts),

  /**
   * Retrieves version information for the application and dependencies.
   * Displayed in the about dialog.
   */
  getVersionInfo: () => ipcRenderer.invoke(IPC_CHANNELS.rendererInvoke.getVersionInfo),

  /**
   * Retrieves available WSL distributions from the main process.
   * Used by connection management UI for WSL target selection.
   */
  getWslDistrobutions: () => ipcRenderer.invoke(IPC_CHANNELS.rendererInvoke.getWslDistrobutions),

  /**
   * Sends a GDB Machine Interface (MI) command to the debugger.
   * Fire-and-forget pattern for executing debugger commands.
   */
  sendGdbCommand: (command: string) =>
    ipcRenderer.send(IPC_CHANNELS.rendererSend.gdbCommand, command),

  /**
   * Sends a general notification/command to the main process.
   * Used for UI-initiated actions and state changes.
   */
  notifyMain: (command: NotifyMainRequest) =>
    ipcRenderer.send(IPC_CHANNELS.rendererSend.notifyMain, command),
});
