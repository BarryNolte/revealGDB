/**
 * Provides settings test page helpers that power renderer integration harness pages.
 *
 * @remarks
 * Exported symbols include `setupSettingsTestApi`, `SettingsTestPage`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import type { JSX } from "react";
import { useEffect, useRef } from "react";
import Settings, { type SettingsHandle } from "../Dialogs/Settings";
import "./settings-test-page.css";

type SettingsPayload = {
  gui: {
    sourceViewerTheme?: string;
    sourceViewerFontName?: string;
    sourceViewerFontSize?: string;
    showDebugInfo?: boolean;
    applicationTheme?: string;
  };
};

type SettingsTestData = {
  settings: SettingsPayload;
  fonts: string[];
};

type NotifyMainCall = {
  command?: string;
  data?: unknown;
};

type SettingsTestApi = {
  getNotifyMainCalls: () => NotifyMainCall[];
  getEditorEvents: () => Array<Record<string, unknown>>;
  getApplicationEvents: () => Array<Record<string, unknown>>;
  reset: () => void;
};

type WindowWithSettingsTestApi = Window & {
  __SETTINGS_TEST_SETTINGS__?: SettingsTestData;
  __SETTINGS_TEST_API__?: SettingsTestApi;
};

const defaultSettings: SettingsPayload = {
  gui: {
    sourceViewerTheme: "Monokai",
    sourceViewerFontName: "Fira Code",
    sourceViewerFontSize: "14",
    showDebugInfo: true,
    applicationTheme: "Light",
  },
};

const defaultFonts = ["Consolas", "Fira Code", "Cascadia Code"];

/**
 * Performs setup settings test api as part of this module's public API.
 */
export function setupSettingsTestApi(): void {
  const ipc = window.ipcToMain ?? ({} as Window["ipcToMain"]);
  if (!window.ipcToMain) {
    Object.defineProperty(window, "ipcToMain", {
      value: ipc,
      configurable: true,
      writable: true,
    });
  }

  const notifyMainCalls: NotifyMainCall[] = [];
  const editorEvents: Array<Record<string, unknown>> = [];
  const applicationEvents: Array<Record<string, unknown>> = [];

  /**
   * Performs handle change editor as part of this module's internal workflow.
   *
   * @param event - Value for `event` consumed by this operation.
   */
  const handleChangeEditor = (event: Event) => {
    editorEvents.push({ ...(((event as CustomEvent).detail as Record<string, unknown>) ?? {}) });
  };

  /**
   * Performs handle change application as part of this module's internal workflow.
   *
   * @param event - Value for `event` consumed by this operation.
   */
  const handleChangeApplication = (event: Event) => {
    applicationEvents.push({
      ...(((event as CustomEvent).detail as Record<string, unknown>) ?? {}),
    });
  };

  window.addEventListener("changeEditor", handleChangeEditor);
  window.addEventListener("changeApplication", handleChangeApplication);

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
      getSettings: () => Promise.resolve(defaultSettings),
      getSystemFonts: () => Promise.resolve(defaultFonts),
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

  ipc.queries.app.getSettings = () => {
    const settings = (window as WindowWithSettingsTestApi).__SETTINGS_TEST_SETTINGS__;
    return Promise.resolve(settings?.settings ?? defaultSettings);
  };
  ipc.queries.app.getSystemFonts = () => {
    const settings = (window as WindowWithSettingsTestApi).__SETTINGS_TEST_SETTINGS__;
    return Promise.resolve(settings?.fonts ?? defaultFonts);
  };
  ipc.getSettings = ipc.queries.app.getSettings;
  ipc.getSystemFonts = ipc.queries.app.getSystemFonts;
  ipc.getVersionInfo = ipc.queries.app.getVersionInfo;
  ipc.getWslDistrobutions = ipc.queries.environment.getWslDistrobutions;
  ipc.getFunctionNames = ipc.queries.debugger.getFunctionNames;

  ipc.commands.app.notifyMain = (message) => {
    notifyMainCalls.push({
      command: message?.command,
      data: message?.data,
    });
  };
  ipc.notifyMain = ipc.commands.app.notifyMain;
  ipc.sendGdbCommand = ipc.commands.debugger.sendGdbCommand;

  (window as WindowWithSettingsTestApi).__SETTINGS_TEST_API__ = {
    getNotifyMainCalls: () => notifyMainCalls.slice(),
    getEditorEvents: () => editorEvents.slice(),
    getApplicationEvents: () => applicationEvents.slice(),
    reset: () => {
      notifyMainCalls.length = 0;
      editorEvents.length = 0;
      applicationEvents.length = 0;
    },
  };
}

/**
 * Performs settings test page as part of this module's public API.
 *
 * @returns The computed result produced by this operation.
 */
export function SettingsTestPage(): JSX.Element {
  const settingsRef = useRef<SettingsHandle>(null);

  useEffect(() => {
    settingsRef.current?.ShowDialog();
  }, []);

  return (
    <div className="settings-test-container" data-testid="settings-test-page">
      <Settings ref={settingsRef} />
    </div>
  );
}
