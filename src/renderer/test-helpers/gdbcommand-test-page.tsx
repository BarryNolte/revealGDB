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

  ipc.consoleMessage = (callback) => {
    consoleHandler = callback;
    return () => {
      consoleHandler = undefined;
    };
  };
  ipc.logMessage = (callback) => {
    logHandler = callback;
    return () => {
      logHandler = undefined;
    };
  };
  ipc.errorMessage = (callback) => {
    errorHandler = callback;
    return () => {
      errorHandler = undefined;
    };
  };
  ipc.debugMessage = (callback) => {
    debugHandler = callback;
    return () => {
      debugHandler = undefined;
    };
  };
  ipc.notifyRender = (callback) => {
    notifyRenderHandler = callback;
    return () => {
      notifyRenderHandler = undefined;
    };
  };
  ipc.dataRegisters = () => () => undefined;
  ipc.stackFrames = () => () => undefined;
  ipc.sourceFile = () => () => undefined;
  ipc.dataLocals = () => () => undefined;
  ipc.dataThreads = () => () => undefined;
  ipc.dataBrkPts = () => () => undefined;
  ipc.dataMemory = () => () => undefined;
  ipc.dataDisasm = () => () => undefined;
  ipc.getSettings = () => {
    const settings = (window as WindowWithTestApi).__GDB_COMMAND_TEST_SETTINGS__;
    return Promise.resolve({
      command: {
        history: settings?.history ?? ["help", "break main", "continue"],
      },
    });
  };
  ipc.getSystemFonts = () => Promise.resolve([]);
  ipc.getVersionInfo = () => Promise.resolve(new Map());
  ipc.sendGdbCommand = (command: string) => {
    sentCommands.push(command);
  };
  ipc.notifyMain = (command) => {
    if (command?.command === "save-cmd-history") {
      savedHistory = Array.isArray(command.data) ? command.data.slice() : [];
    }
  };

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
