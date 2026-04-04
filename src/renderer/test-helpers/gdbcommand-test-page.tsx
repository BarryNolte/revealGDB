/**
 * GDB Command Window test page.
 *
 * Provides a standalone test environment for the GdbCommandWindow component
 * by mocking the IPC interface. This allows testing command input, history
 * navigation, and output display without a running GDB backend.
 *
 * Test API exposed via window.__GDB_COMMAND_TEST_API__:
 * - emitConsole/Log/Error/Debug: Simulate GDB output messages
 * - emitNotifyRender: Simulate main process notifications
 * - getSentCommands: Retrieve commands sent to GDB
 * - getSavedHistory: Retrieve persisted command history
 * - reset: Clear test state
 *
 * Used by Playwright tests to verify command window functionality.
 */

import type { JSX } from "react";
import { NotifyRenderMessage } from "../../common/ipc-contracts";
import GdbCommandWindow from "../ToolWindows/GdbCommandWindow";
import "./gdbcommand-test-page.css";

/** Notification message format */
type NotifyMessage = NotifyRenderMessage;

/** Test settings structure for command history */
type GdbCommandTestSettings = {
  history: string[];
};

/** Test API interface for interacting with the component */
type TestApi = {
  /** Emit a console message to the command output */
  emitConsole: (message: string) => void;
  /** Emit a log message to the command output */
  emitLog: (message: string) => void;
  /** Emit an error message to the command output */
  emitError: (message: string) => void;
  /** Emit a debug message to the command output */
  emitDebug: (message: string) => void;
  /** Emit a notification to the renderer */
  emitNotifyRender: (message: NotifyMessage) => void;
  /** Get list of commands sent during test */
  getSentCommands: () => string[];
  /** Get persisted command history */
  getSavedHistory: () => string[];
  /** Reset test state */
  reset: () => void;
};

/** Window type augmentation for test data */
type WindowWithTestApi = Window & {
  __GDB_COMMAND_TEST_SETTINGS__?: GdbCommandTestSettings;
  __GDB_COMMAND_TEST_API__?: TestApi;
};

/**
 * Sets up a mock IPC interface for testing the GDB command window.
 * Creates window.__GDB_COMMAND_TEST_API__ with methods to control and inspect
 * the component during tests.
 */
export function setupGdbCommandTestApi(): void {
  // Skip setup if ipcToMain already exists and is from the real app
  if (window.ipcToMain) {
    const descriptor = Object.getOwnPropertyDescriptor(window.ipcToMain, "consoleMessage");
    if (descriptor && !descriptor.writable && !descriptor.configurable) {
      console.warn("Test API setup skipped: ipcToMain already exists with read-only properties");
      return;
    }
  }

  // Track commands sent to GDB and saved history
  const sentCommands: string[] = [];
  let savedHistory: string[] = [];

  let notifyRenderHandler: ((message: NotifyMessage) => void) | undefined;
  let consoleHandler: ((message: string) => void) | undefined;
  let logHandler: ((message: string) => void) | undefined;
  let errorHandler: ((message: string) => void) | undefined;
  let debugHandler: ((message: string) => void) | undefined;

  const ipc = window.ipcToMain ?? ({} as Window["ipcToMain"]);
  if (!window.ipcToMain) {
    Object.defineProperty(window, "ipcToMain", {
      value: ipc,
      configurable: true,
      writable: true,
    });
  }

  ipc.messages = {
    console: () => () => undefined,
    log: () => () => undefined,
    error: () => () => undefined,
    debug: () => () => undefined,
  };
  ipc.notifications = {
    connectionStatus: () => () => undefined,
    render: () => () => undefined,
    themeChanged: () => () => undefined,
  };
  ipc.debuggerData = {
    registers: () => () => undefined,
    stackFrames: () => () => undefined,
    sourceFile: () => () => undefined,
    locals: () => () => undefined,
    threads: () => () => undefined,
    breakpoints: () => () => undefined,
    memory: () => () => undefined,
    disassembly: () => () => undefined,
    functions: () => () => undefined,
  };
  ipc.queries = {
    app: {
      getSettings: () => Promise.resolve({}),
      getSystemFonts: () => Promise.resolve([]),
      getVersionInfo: () => Promise.resolve(new Map()),
    },
    environment: {
      getWslDistrobutions: () => Promise.resolve([]),
    },
    debugger: {
      getFunctionNames: () => Promise.resolve([]),
    },
  };
  ipc.commands = {
    debugger: {
      sendGdbCommand: () => undefined,
    },
    app: {
      notifyMain: () => undefined,
    },
  };

  ipc.messages.console = (callback) => {
    consoleHandler = callback;
    return () => {
      consoleHandler = undefined;
    };
  };
  ipc.messages.log = (callback) => {
    logHandler = callback;
    return () => {
      logHandler = undefined;
    };
  };
  ipc.messages.error = (callback) => {
    errorHandler = callback;
    return () => {
      errorHandler = undefined;
    };
  };
  ipc.messages.debug = (callback) => {
    debugHandler = callback;
    return () => {
      debugHandler = undefined;
    };
  };
  ipc.notifications.render = (callback) => {
    notifyRenderHandler = callback;
    return () => {
      notifyRenderHandler = undefined;
    };
  };
  ipc.debuggerData.registers = () => () => undefined;
  ipc.debuggerData.stackFrames = () => () => undefined;
  ipc.debuggerData.sourceFile = () => () => undefined;
  ipc.debuggerData.locals = () => () => undefined;
  ipc.debuggerData.threads = () => () => undefined;
  ipc.debuggerData.breakpoints = () => () => undefined;
  ipc.debuggerData.memory = () => () => undefined;
  ipc.debuggerData.disassembly = () => () => undefined;
  ipc.debuggerData.functions = () => () => undefined;
  ipc.queries.app.getSettings = () => {
    const settings = (window as WindowWithTestApi).__GDB_COMMAND_TEST_SETTINGS__;
    return Promise.resolve({
      command: {
        history: settings?.history ?? ["help", "break main", "continue"],
      },
    });
  };
  ipc.queries.app.getSystemFonts = () => Promise.resolve([]);
  ipc.queries.app.getVersionInfo = () => Promise.resolve(new Map());
  ipc.commands.debugger.sendGdbCommand = (command: string) => {
    sentCommands.push(command);
  };
  ipc.commands.app.notifyMain = (command) => {
    if (command?.command === "save-cmd-history") {
      savedHistory = Array.isArray(command.data) ? command.data.slice() : [];
    }
  };

  ipc.consoleMessage = ipc.messages.console;
  ipc.logMessage = ipc.messages.log;
  ipc.errorMessage = ipc.messages.error;
  ipc.debugMessage = ipc.messages.debug;
  ipc.connectionStatus = ipc.notifications.connectionStatus;
  ipc.notifyRender = ipc.notifications.render;
  ipc.dataRegisters = ipc.debuggerData.registers;
  ipc.stackFrames = ipc.debuggerData.stackFrames;
  ipc.sourceFile = ipc.debuggerData.sourceFile;
  ipc.dataLocals = ipc.debuggerData.locals;
  ipc.dataThreads = ipc.debuggerData.threads;
  ipc.dataBrkPts = ipc.debuggerData.breakpoints;
  ipc.dataMemory = ipc.debuggerData.memory;
  ipc.dataDisasm = ipc.debuggerData.disassembly;
  ipc.dataFunctions = ipc.debuggerData.functions;
  ipc.getSettings = ipc.queries.app.getSettings;
  ipc.getSystemFonts = ipc.queries.app.getSystemFonts;
  ipc.getVersionInfo = ipc.queries.app.getVersionInfo;
  ipc.getWslDistrobutions = ipc.queries.environment.getWslDistrobutions;
  ipc.getFunctionNames = ipc.queries.debugger.getFunctionNames;
  ipc.sendGdbCommand = ipc.commands.debugger.sendGdbCommand;
  ipc.notifyMain = ipc.commands.app.notifyMain;

  (window as WindowWithTestApi).__GDB_COMMAND_TEST_API__ = {
    emitConsole: (message) => consoleHandler?.(message),
    emitLog: (message) => logHandler?.(message),
    emitError: (message) => errorHandler?.(message),
    emitDebug: (message) => debugHandler?.(message),
    emitNotifyRender: (message) => notifyRenderHandler?.(message),
    getSentCommands: () => sentCommands.slice(),
    getSavedHistory: () => savedHistory.slice(),
    reset: () => {
      sentCommands.length = 0;
      savedHistory = [];
    },
  };
}

export function GdbCommandTestPage(): JSX.Element {
  return (
    <div className="gdb-command-test-container">
      <GdbCommandWindow />
    </div>
  );
}
