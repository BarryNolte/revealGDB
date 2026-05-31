/**
 * Provides gdbcommand test page helpers that power renderer integration harness pages.
 *
 * @remarks
 * Exported symbols include `setupGdbCommandTestApi`, `GdbCommandTestPage`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import type { JSX } from "react";
import {
  DebuggerCommand,
  DebuggerSelectStackFrameCommand,
  NotifyRenderMessage,
} from "../../common/ipc-contracts";
import GdbCommandWindow from "../ToolWindows/GdbCommandWindow";
import "./gdbcommand-test-page.css";
import { initIpcMock, setIpcFullLegacyAliases } from "./ipc-test-setup";

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
  /** Emit an HTML message to the command output */
  emitHtml: (message: string) => void;
  /** Emit a notification to the renderer */
  emitNotifyRender: (message: NotifyMessage) => void;
  /** Get list of commands sent during test */
  getSentCommands: () => string[];
  /** Get count of Ctrl+D sends */
  getControlDSends: () => number;
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

function buildTestApi(): TestApi {
  const sentCommands: string[] = [];
  let controlDSends = 0;
  let savedHistory: string[] = [];

  let notifyRenderHandler: ((message: NotifyMessage) => void) | undefined;
  let consoleHandler: ((message: string) => void) | undefined;
  let logHandler: ((message: string) => void) | undefined;
  let errorHandler: ((message: string) => void) | undefined;
  let debugHandler: ((message: string) => void) | undefined;
  let htmlHandler: ((message: string) => void) | undefined;

  const ipc = initIpcMock();

  ipc.messages.console = (cb) => {
    consoleHandler = cb;
    return () => void (consoleHandler = undefined);
  };
  ipc.messages.log = (cb) => {
    logHandler = cb;
    return () => void (logHandler = undefined);
  };
  ipc.messages.error = (cb) => {
    errorHandler = cb;
    return () => void (errorHandler = undefined);
  };
  ipc.messages.debug = (cb) => {
    debugHandler = cb;
    return () => void (debugHandler = undefined);
  };
  ipc.messages.html = (cb) => {
    htmlHandler = cb;
    return () => void (htmlHandler = undefined);
  };
  ipc.notifications.render = (cb) => {
    notifyRenderHandler = cb;
    return () => void (notifyRenderHandler = undefined);
  };
  ipc.queries.app.getSettings = () => {
    const s = (window as WindowWithTestApi).__GDB_COMMAND_TEST_SETTINGS__;
    const history = s?.history ?? ["help", "break main", "continue"];
    return Promise.resolve({ command: { history } });
  };
  ipc.commands.debugger.sendGdbCommand = (command: DebuggerCommand) => {
    if (typeof command === "string") {
      void sentCommands.push(command);
      return Promise.resolve();
    }
    const selectFrameCommand = command as DebuggerSelectStackFrameCommand;
    void sentCommands.push(`${selectFrameCommand.kind}:${selectFrameCommand.frameLevel}`);
    return Promise.resolve();
  };
  ipc.commands.debugger.sendControlD = () => {
    controlDSends += 1;
  };
  ipc.commands.app.notifyMain = (command) => {
    if (command?.command === "save-cmd-history") {
      savedHistory = Array.isArray(command.data) ? command.data.slice() : [];
    }
  };

  setIpcFullLegacyAliases(ipc);

  return {
    emitConsole: (message) => consoleHandler?.(message),
    emitLog: (message) => logHandler?.(message),
    emitError: (message) => errorHandler?.(message),
    emitDebug: (message) => debugHandler?.(message),
    emitHtml: (message) => htmlHandler?.(message),
    emitNotifyRender: (message) => notifyRenderHandler?.(message),
    getSentCommands: () => sentCommands.slice(),
    getControlDSends: () => controlDSends,
    getSavedHistory: () => savedHistory.slice(),
    reset: () => {
      sentCommands.length = 0;
      controlDSends = 0;
      savedHistory = [];
    },
  };
}

/**
 * Performs setup gdb command test api as part of this module's public API.
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

  (window as WindowWithTestApi).__GDB_COMMAND_TEST_API__ = buildTestApi();
}

/**
 * Performs gdb command test page as part of this module's public API.
 *
 * @returns The computed result produced by this operation.
 */
export function GdbCommandTestPage(): JSX.Element {
  return (
    <div className="gdb-command-test-container">
      <GdbCommandWindow />
    </div>
  );
}
