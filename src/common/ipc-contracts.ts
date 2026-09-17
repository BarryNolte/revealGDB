/**
 * Implements ipc contracts for revealGDB runtime behavior.
 *
 * @remarks
 * Exported symbols include `IPC_CHANNELS`, `NotifyRenderCommand`, `NotifyRenderMessage`, `NotifyMainCommand`, `NotifyMainRequest`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import type { NormalizedConnection } from "./connection-types";
import type { GridColumnState, GridName } from "./grid-column-types";
import type { SectionsViewOptions } from "./ipc-data-types";
import type { Workspace } from "./workspace-types";

const MAIN_TO_RENDERER_CHANNEL_GROUPS = {
  console: {
    message: "console-message",
    log: "log-message",
    error: "error-message",
    debug: "debug-message",
    html: "html-message",
  },
  notifications: {
    connectionStatus: "connection-status",
    render: "notify-render",
    themeChanged: "theme-changed",
    workspaceUpdated: "workspace-updated",
  },
  debuggerData: {
    registers: "data-register",
    stackFrames: "stack-frames",
    sourceFile: "source-file",
    locals: "data-locals",
    threads: "data-threads",
    breakpoints: "data-brkpts",
    memory: "data-memory",
    disassembly: "data-disasm",
    functions: "data-disasm-functions",
    lineVars: "data-line-vars",
  },
} as const;

const RENDERER_TO_MAIN_CHANNEL_GROUPS = {
  queries: {
    app: {
      settings: "getSettings",
      systemFonts: "getSystemFonts",
      versionInfo: "getVersionInfo",
      getFloatingWindowsState: "getFloatingWindowsState",
    },
    environment: {
      wslDistributions: "getWslDistrobutions",
    },
    debugger: {
      functionNames: "getFunctionNames",
      varAtPosition: "queryVarAtPosition",
      varByName: "getVarByName",
      evaluateExpression: "evaluateExpression",
      sections: "getSectionData",
      showSourceAt: "showSourceAt",
    },
    workspace: {
      getWorkspace: "getWorkspace",
    },
  },
  commands: {
    debugger: {
      send: "gdb-command",
      sendControlD: "gdb-control-d",
      dangerousCommandResponse: "dangerous-command-response",
    },
    app: {
      notify: "notify-main",
      log: "app-instrumentation-log",
    },
    workspace: {
      addWindow: "workspace-add-window",
      removeWindow: "workspace-remove-window",
      showWindow: "workspace-show-window",
      hideWindow: "workspace-hide-window",
      moveWindow: "workspace-move-window",
      setActiveWindow: "workspace-set-active-window",
      floatWindow: "workspace-float-window",
      dockWindow: "workspace-dock-window",
      splitPane: "workspace-split-pane",
      resizePane: "workspace-resize-pane",
      moveWindowToPane: "workspace-move-window-to-pane",
      reorderPaneWindows: "workspace-reorder-pane-windows",
      // Multi-window (satellite) operations
      createHost: "workspace-create-host",
      deleteHost: "workspace-delete-host",
      movePane: "workspace-move-pane",
      saveHostLayout: "workspace-save-host-layout",
      openHost: "workspace-open-host",
      // Floating window operations
      createFloatingWindow: "workspace-create-floating-window",
      closeFloatingWindow: "workspace-close-floating-window",
      updateFloatingWindowBounds: "workspace-update-floating-window-bounds",
    },
  },
} as const;

export const IPC_CHANNELS = {
  mainToRenderer: {
    console: MAIN_TO_RENDERER_CHANNEL_GROUPS.console,
    notifications: MAIN_TO_RENDERER_CHANNEL_GROUPS.notifications,
    debuggerData: MAIN_TO_RENDERER_CHANNEL_GROUPS.debuggerData,
    consoleMessage: MAIN_TO_RENDERER_CHANNEL_GROUPS.console.message,
    logMessage: MAIN_TO_RENDERER_CHANNEL_GROUPS.console.log,
    errorMessage: MAIN_TO_RENDERER_CHANNEL_GROUPS.console.error,
    debugMessage: MAIN_TO_RENDERER_CHANNEL_GROUPS.console.debug,
    htmlMessage: MAIN_TO_RENDERER_CHANNEL_GROUPS.console.html,
    connectionStatus: MAIN_TO_RENDERER_CHANNEL_GROUPS.notifications.connectionStatus,
    notifyRender: MAIN_TO_RENDERER_CHANNEL_GROUPS.notifications.render,
    themeChanged: MAIN_TO_RENDERER_CHANNEL_GROUPS.notifications.themeChanged,
    workspaceUpdated: MAIN_TO_RENDERER_CHANNEL_GROUPS.notifications.workspaceUpdated,
    dataRegisters: MAIN_TO_RENDERER_CHANNEL_GROUPS.debuggerData.registers,
    stackFrames: MAIN_TO_RENDERER_CHANNEL_GROUPS.debuggerData.stackFrames,
    sourceFile: MAIN_TO_RENDERER_CHANNEL_GROUPS.debuggerData.sourceFile,
    dataLocals: MAIN_TO_RENDERER_CHANNEL_GROUPS.debuggerData.locals,
    dataThreads: MAIN_TO_RENDERER_CHANNEL_GROUPS.debuggerData.threads,
    dataBrkPts: MAIN_TO_RENDERER_CHANNEL_GROUPS.debuggerData.breakpoints,
    dataMemory: MAIN_TO_RENDERER_CHANNEL_GROUPS.debuggerData.memory,
    dataDisasm: MAIN_TO_RENDERER_CHANNEL_GROUPS.debuggerData.disassembly,
    dataFunctions: MAIN_TO_RENDERER_CHANNEL_GROUPS.debuggerData.functions,
    dataLineVars: MAIN_TO_RENDERER_CHANNEL_GROUPS.debuggerData.lineVars,
  },
  rendererToMain: RENDERER_TO_MAIN_CHANNEL_GROUPS,
  rendererInvoke: {
    getSettings: RENDERER_TO_MAIN_CHANNEL_GROUPS.queries.app.settings,
    getSystemFonts: RENDERER_TO_MAIN_CHANNEL_GROUPS.queries.app.systemFonts,
    getVersionInfo: RENDERER_TO_MAIN_CHANNEL_GROUPS.queries.app.versionInfo,
    getFloatingWindowsState: RENDERER_TO_MAIN_CHANNEL_GROUPS.queries.app.getFloatingWindowsState,
    getWslDistrobutions: RENDERER_TO_MAIN_CHANNEL_GROUPS.queries.environment.wslDistributions,
    getFunctionNames: RENDERER_TO_MAIN_CHANNEL_GROUPS.queries.debugger.functionNames,
    getVarByName: RENDERER_TO_MAIN_CHANNEL_GROUPS.queries.debugger.varByName,
    showSourceAt: RENDERER_TO_MAIN_CHANNEL_GROUPS.queries.debugger.showSourceAt,
    getWorkspace: RENDERER_TO_MAIN_CHANNEL_GROUPS.queries.workspace.getWorkspace,
  },
  rendererSend: {
    gdbCommand: RENDERER_TO_MAIN_CHANNEL_GROUPS.commands.debugger.send,
    gdbControlD: RENDERER_TO_MAIN_CHANNEL_GROUPS.commands.debugger.sendControlD,
    notifyMain: RENDERER_TO_MAIN_CHANNEL_GROUPS.commands.app.notify,
    appLog: RENDERER_TO_MAIN_CHANNEL_GROUPS.commands.app.log,
    dangerousCommandResponse:
      RENDERER_TO_MAIN_CHANNEL_GROUPS.commands.debugger.dangerousCommandResponse,
    workspaceAddWindow: RENDERER_TO_MAIN_CHANNEL_GROUPS.commands.workspace.addWindow,
    workspaceRemoveWindow: RENDERER_TO_MAIN_CHANNEL_GROUPS.commands.workspace.removeWindow,
    workspaceShowWindow: RENDERER_TO_MAIN_CHANNEL_GROUPS.commands.workspace.showWindow,
    workspaceHideWindow: RENDERER_TO_MAIN_CHANNEL_GROUPS.commands.workspace.hideWindow,
    workspaceMoveWindow: RENDERER_TO_MAIN_CHANNEL_GROUPS.commands.workspace.moveWindow,
    workspaceSetActiveWindow: RENDERER_TO_MAIN_CHANNEL_GROUPS.commands.workspace.setActiveWindow,
    workspaceFloatWindow: RENDERER_TO_MAIN_CHANNEL_GROUPS.commands.workspace.floatWindow,
    workspaceDockWindow: RENDERER_TO_MAIN_CHANNEL_GROUPS.commands.workspace.dockWindow,
    workspaceSplitPane: RENDERER_TO_MAIN_CHANNEL_GROUPS.commands.workspace.splitPane,
    workspaceResizePane: RENDERER_TO_MAIN_CHANNEL_GROUPS.commands.workspace.resizePane,
    workspaceMoveWindowToPane: RENDERER_TO_MAIN_CHANNEL_GROUPS.commands.workspace.moveWindowToPane,
    workspaceReorderPaneWindows:
      RENDERER_TO_MAIN_CHANNEL_GROUPS.commands.workspace.reorderPaneWindows,
    // Multi-window operations
    workspaceCreateHost: RENDERER_TO_MAIN_CHANNEL_GROUPS.commands.workspace.createHost,
    workspaceDeleteHost: RENDERER_TO_MAIN_CHANNEL_GROUPS.commands.workspace.deleteHost,
    workspaceMovePane: RENDERER_TO_MAIN_CHANNEL_GROUPS.commands.workspace.movePane,
    workspaceSaveHostLayout: RENDERER_TO_MAIN_CHANNEL_GROUPS.commands.workspace.saveHostLayout,
    workspaceOpenHost: RENDERER_TO_MAIN_CHANNEL_GROUPS.commands.workspace.openHost,
    // Floating window operations
    workspaceCreateFloatingWindow:
      RENDERER_TO_MAIN_CHANNEL_GROUPS.commands.workspace.createFloatingWindow,
    workspaceCloseFloatingWindow:
      RENDERER_TO_MAIN_CHANNEL_GROUPS.commands.workspace.closeFloatingWindow,
    workspaceUpdateFloatingWindowBounds:
      RENDERER_TO_MAIN_CHANNEL_GROUPS.commands.workspace.updateFloatingWindowBounds,
  },
} as const;

export type DebuggerSelectStackFrameCommand = {
  kind: "select-stack-frame";
  frameLevel: string;
};

export type DebuggerCommand = string | DebuggerSelectStackFrameCommand;

export type NotifyRenderCommand =
  | "theme-changed"
  | "connection-started"
  | "connection-success"
  | "connection-failed"
  | "cancel-connection"
  | "connection-dialog"
  | "command-entry"
  | "about-box"
  | "settings-dialog"
  | "connections-dialog"
  | "sections-view"
  | "confirm-dangerous-command"
  | "create-new-window";

export type NotifyRenderMessage = {
  command: NotifyRenderCommand;
  data?: unknown;
};

export type NotifyMainCommand =
  | "connections-dialog"
  | "connect-selected-connection"
  | "cancel-connection"
  | "command-entry"
  | "save-connections"
  | "save-last-used-connection"
  | "save-app-show-debug-info"
  | "save-app-theme"
  | "save-cmd-history"
  | "save-source-viewer-theme"
  | "save-source-viewer-font-size"
  | "save-source-viewer-font-name"
  | "save-dock-layout"
  | "save-grid-columns"
  | "reset-grid-columns"
  | "save-sections-view-options"
  | "save-auto-symbol-loading"
  | "open-external"
  | "renderStart"
  | "renderEnd"
  | "save-workspace"
  | "save-floating-windows-state"
  // Multi-window operations
  | "workspace-create-host"
  | "workspace-delete-host"
  | "workspace-move-pane"
  | "workspace-save-host-layout"
  | "workspace-open-host";

/**
 * Maps each `NotifyMainCommand` to the shape of its `data` payload.
 * Use this map to derive typed `NotifyMainRequest` variants.
 */
export type NotifyMainPayloadMap = {
  "connections-dialog": undefined;
  "connect-selected-connection": { connection: NormalizedConnection };
  "cancel-connection": undefined;
  "command-entry": undefined;
  "save-connections": { connections: NormalizedConnection[] };
  "save-last-used-connection": string | null;
  "save-app-show-debug-info": boolean;
  "save-app-theme": string;
  "save-cmd-history": string[];
  "save-source-viewer-theme": string;
  "save-source-viewer-font-size": string | number;
  "save-source-viewer-font-name": string;
  "save-dock-layout": unknown;
  "save-grid-columns": { gridName: GridName; columns: GridColumnState[] };
  "reset-grid-columns": GridName | undefined;
  "save-sections-view-options": SectionsViewOptions;
  "save-auto-symbol-loading": boolean;
  "open-external": string;
  renderStart: undefined;
  renderEnd: undefined;
  "save-workspace": Workspace;
  "save-floating-windows-state": Array<{
    windowId: string;
    panelTitle: string;
    bounds: { x: number; y: number; width: number; height: number };
  }>;
  // Multi-window operations
  "workspace-create-host": { label: string };
  "workspace-delete-host": { hostId: string };
  "workspace-move-pane": { paneId: string; sourceHostId: string; targetHostId: string };
  "workspace-save-host-layout": { hostId: string; layout: unknown };
  "workspace-open-host": { hostId: string };
};

/**
 * Discriminated union of all renderer-to-main notification requests.
 * Each variant carries a strongly-typed `data` payload derived from `NotifyMainPayloadMap`.
 */
export type NotifyMainRequest = {
  [K in keyof NotifyMainPayloadMap]: NotifyMainPayloadMap[K] extends undefined
    ? { command: K; data?: undefined }
    : { command: K; data: NotifyMainPayloadMap[K] };
}[keyof NotifyMainPayloadMap];

export type DangerousCommandEntry = {
  command: string;
  reason?: string;
  defaultAnswer?: "yes" | "no";
};

export type DangerousCommandResponse = {
  allow: boolean;
  remember: boolean;
  answer: "yes" | "no";
};
