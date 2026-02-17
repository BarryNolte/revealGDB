import type { JSX } from "react";
import GdbCommandWindow from "../ToolWindows/GdbCommandWindow";
import "./gdbcommand-test-page.css";

type NotifyMessage = { command: string };

type GdbCommandTestSettings = {
  history: string[];
};

type TestApi = {
  emitConsole: (message: string) => void;
  emitLog: (message: string) => void;
  emitError: (message: string) => void;
  emitDebug: (message: string) => void;
  emitNotifyRender: (message: NotifyMessage) => void;
  getSentCommands: () => string[];
  getSavedHistory: () => string[];
  reset: () => void;
};

type WindowWithTestApi = Window & {
  __GDB_COMMAND_TEST_SETTINGS__?: GdbCommandTestSettings;
  __GDB_COMMAND_TEST_API__?: TestApi;
};

export function setupGdbCommandTestApi(): void {
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
