/**
 * Defines preload preload bridge contracts exposed to the renderer process.
 *
 * @remarks
 * This file primarily contains internal declarations and implementation details. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { contextBridge, ipcRenderer } from "electron";
import {
  DangerousCommandResponse,
  DebuggerCommand,
  IPC_CHANNELS,
  NotifyMainRequest,
} from "../common/ipc-contracts";
import type { IElectronAPI } from "./interface";

type IpcApiCore = Pick<
  IElectronAPI,
  "messages" | "notifications" | "debuggerData" | "queries" | "commands"
>;

/**
 * Performs subscribe as part of this module's internal workflow.
 *
 * @template T - Generic type parameter used by this API.
 * @param channel - Value for `channel` consumed by this operation.
 * @param callback - Callback invoked when the associated event occurs.
 * @returns The computed result produced by this operation.
 */
function subscribe<T>(channel: string, callback: (data: T) => void): () => void {
  /**
   * Performs listener as part of this module's internal workflow.
   *
   * @param _event - Value for `_event` consumed by this operation.
   * @param value - Value to validate, normalize, or transform before further processing.
   */
  const listener = (_event: Electron.IpcRendererEvent, value: T) => callback(value);
  ipcRenderer.on(channel, listener);
  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}

/**
 * Performs invoke as part of this module's internal workflow.
 *
 * @param channel - Value for `channel` consumed by this operation.
 */
function invoke(channel: string) {
  return ipcRenderer.invoke(channel);
}

/**
 * Performs send as part of this module's internal workflow.
 *
 * @param channel - Value for `channel` consumed by this operation.
 * @param value - Value to validate, normalize, or transform before further processing.
 */
function send(channel: string, value: unknown) {
  ipcRenderer.send(channel, value);
}

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
const ipcApi: IpcApiCore = {
  messages: {
    console: (callback) => subscribe<string>(IPC_CHANNELS.mainToRenderer.console.message, callback),
    log: (callback) => subscribe<string>(IPC_CHANNELS.mainToRenderer.console.log, callback),
    error: (callback) => subscribe<string>(IPC_CHANNELS.mainToRenderer.console.error, callback),
    debug: (callback) => subscribe<string>(IPC_CHANNELS.mainToRenderer.console.debug, callback),
    html: (callback) => subscribe<string>(IPC_CHANNELS.mainToRenderer.console.html, callback),
  },
  notifications: {
    connectionStatus: (callback) =>
      subscribe(IPC_CHANNELS.mainToRenderer.notifications.connectionStatus, callback),
    render: (callback) => subscribe(IPC_CHANNELS.mainToRenderer.notifications.render, callback),
    themeChanged: (callback) =>
      subscribe(IPC_CHANNELS.mainToRenderer.notifications.themeChanged, callback),
  },
  debuggerData: {
    registers: (callback) =>
      subscribe(IPC_CHANNELS.mainToRenderer.debuggerData.registers, callback),
    stackFrames: (callback) =>
      subscribe(IPC_CHANNELS.mainToRenderer.debuggerData.stackFrames, callback),
    sourceFile: (callback) =>
      subscribe(IPC_CHANNELS.mainToRenderer.debuggerData.sourceFile, callback),
    locals: (callback) => subscribe(IPC_CHANNELS.mainToRenderer.debuggerData.locals, callback),
    threads: (callback) => subscribe(IPC_CHANNELS.mainToRenderer.debuggerData.threads, callback),
    breakpoints: (callback) =>
      subscribe(IPC_CHANNELS.mainToRenderer.debuggerData.breakpoints, callback),
    memory: (callback) => subscribe(IPC_CHANNELS.mainToRenderer.debuggerData.memory, callback),
    disassembly: (callback) =>
      subscribe(IPC_CHANNELS.mainToRenderer.debuggerData.disassembly, callback),
    functions: (callback) =>
      subscribe(IPC_CHANNELS.mainToRenderer.debuggerData.functions, callback),
  },
  queries: {
    app: {
      getSettings: () => invoke(IPC_CHANNELS.rendererToMain.queries.app.settings),
      getSystemFonts: () => invoke(IPC_CHANNELS.rendererToMain.queries.app.systemFonts),
      getVersionInfo: () => invoke(IPC_CHANNELS.rendererToMain.queries.app.versionInfo),
    },
    environment: {
      getWslDistrobutions: () =>
        invoke(IPC_CHANNELS.rendererToMain.queries.environment.wslDistributions),
    },
    debugger: {
      getFunctionNames: () => invoke(IPC_CHANNELS.rendererToMain.queries.debugger.functionNames),
      queryVarAtPosition: (sourceFile: string, line: number, col: number) =>
        ipcRenderer.invoke(
          IPC_CHANNELS.rendererToMain.queries.debugger.varAtPosition,
          sourceFile,
          line,
          col,
        ),
      getVarByName: (sourceFile: string, varName: string) =>
        ipcRenderer.invoke(
          IPC_CHANNELS.rendererToMain.queries.debugger.varByName,
          sourceFile,
          varName,
        ),
      evaluateExpression: (expr: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.rendererToMain.queries.debugger.evaluateExpression, expr),
      getSectionData: () => invoke(IPC_CHANNELS.rendererToMain.queries.debugger.sections),
      showSourceAt: (fileName: string, line: string) =>
        ipcRenderer.invoke(
          IPC_CHANNELS.rendererToMain.queries.debugger.showSourceAt,
          fileName,
          line,
        ),
    },
  },
  commands: {
    debugger: {
      sendGdbCommand: (command: DebuggerCommand) =>
        ipcRenderer.invoke(IPC_CHANNELS.rendererToMain.commands.debugger.send, command),
      sendControlD: () => send(IPC_CHANNELS.rendererToMain.commands.debugger.sendControlD, null),
      respondToDangerousCommand: (response: DangerousCommandResponse) =>
        send(IPC_CHANNELS.rendererSend.dangerousCommandResponse, response),
    },
    app: {
      notifyMain: (command: NotifyMainRequest) =>
        send(IPC_CHANNELS.rendererToMain.commands.app.notify, command),
    },
  },
};

contextBridge.exposeInMainWorld("ipcToMain", {
  ...ipcApi,
  consoleMessage: ipcApi.messages.console,
  logMessage: ipcApi.messages.log,
  errorMessage: ipcApi.messages.error,
  debugMessage: ipcApi.messages.debug,
  htmlMessage: ipcApi.messages.html,
  connectionStatus: ipcApi.notifications.connectionStatus,
  notifyRender: ipcApi.notifications.render,
  dataRegisters: ipcApi.debuggerData.registers,
  stackFrames: ipcApi.debuggerData.stackFrames,
  sourceFile: ipcApi.debuggerData.sourceFile,
  dataLocals: ipcApi.debuggerData.locals,
  dataThreads: ipcApi.debuggerData.threads,
  dataBrkPts: ipcApi.debuggerData.breakpoints,
  dataMemory: ipcApi.debuggerData.memory,
  dataDisasm: ipcApi.debuggerData.disassembly,
  dataFunctions: ipcApi.debuggerData.functions,
  getSettings: ipcApi.queries.app.getSettings,
  getSystemFonts: ipcApi.queries.app.getSystemFonts,
  getVersionInfo: ipcApi.queries.app.getVersionInfo,
  getWslDistrobutions: ipcApi.queries.environment.getWslDistrobutions,
  getFunctionNames: ipcApi.queries.debugger.getFunctionNames,
  sendGdbCommand: ipcApi.commands.debugger.sendGdbCommand,
  sendControlD: ipcApi.commands.debugger.sendControlD,
  respondToDangerousCommand: ipcApi.commands.debugger.respondToDangerousCommand,
  notifyMain: ipcApi.commands.app.notifyMain,
});
