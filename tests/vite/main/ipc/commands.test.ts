/**
 * commands.test module.
 *
 * @remarks
 * Source module for commands.test.
 */

/**
 * @file commands.test.ts
 * @description Source module for commands.test.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { IPC_CHANNELS, NotifyMainRequest } from "../../../../src/common/ipc-contracts";
import {
  handleNotifyMain,
  onGdbCommand,
  registerIpcCommandHandlers,
} from "../../../../src/main/ipc/commands";
import { createIpcRegistrationHarness } from "../../../helpers/ipc-test-harness";

const gissMocks = vi.hoisted(() => ({
  sendHtmlBlock: vi.fn(),
  addLine: vi.fn(),
  addHeader: vi.fn(),
  sendOutput: vi.fn(),
}));

vi.mock("../../../../src/main/utilities/GeneralInfoSender", () => ({
  GeneralInfoSender: {
    instance: gissMocks,
  },
}));

vi.mock("../../../../src/main/theme-support", () => ({
  setNativeThemeFromAppTheme: vi.fn(),
}));

vi.mock("../../../../src/main/utilities/wsl-utilities", () => ({
  WslUtilities: {
    getWslDistributions: vi.fn(() => [{ name: "Ubuntu", state: "Running", version: "2" }]),
    getWslSerialPorts: vi.fn(() => ["ttyS0", "ttyUSB0"]),
  },
}));

import { screen, shell } from "electron";
import { setNativeThemeFromAppTheme } from "../../../../src/main/theme-support";
import { WslUtilities } from "../../../../src/main/utilities/wsl-utilities";

describe("handleNotifyMain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles renderEnd by sending command-entry notify-render", () => {
    const { context, send } = createIpcRegistrationHarness();
    const msg: NotifyMainRequest = { command: "renderEnd" };

    handleNotifyMain(msg, context);

    expect(send).toHaveBeenCalledWith(IPC_CHANNELS.mainToRenderer.notifications.render, {
      command: "command-entry",
    });
  });

  it("handles save-app-theme by persisting the setting", () => {
    const { context, appSettings } = createIpcRegistrationHarness();
    const msg: NotifyMainRequest = {
      command: "save-app-theme",
      data: "solarized",
    };

    handleNotifyMain(msg, context);

    expect(appSettings.setSync).toHaveBeenCalledWith("gdb.gui.applicationTheme", msg.data);
  });

  it("handles save-app-theme 'Dark' by calling setNativeThemeFromAppTheme", () => {
    const { context } = createIpcRegistrationHarness();
    const msg: NotifyMainRequest = {
      command: "save-app-theme",
      data: "Dark",
    };

    handleNotifyMain(msg, context);

    expect(setNativeThemeFromAppTheme).toHaveBeenCalledWith("Dark");
  });

  it("handles save-app-theme 'Light' by calling setNativeThemeFromAppTheme", () => {
    const { context } = createIpcRegistrationHarness();
    const msg: NotifyMainRequest = {
      command: "save-app-theme",
      data: "Light",
    };

    handleNotifyMain(msg, context);

    expect(setNativeThemeFromAppTheme).toHaveBeenCalledWith("Light");
  });

  it("handles save-app-theme 'Auto' by calling setNativeThemeFromAppTheme", () => {
    const { context } = createIpcRegistrationHarness();
    const msg: NotifyMainRequest = {
      command: "save-app-theme",
      data: "Auto",
    };

    handleNotifyMain(msg, context);

    expect(setNativeThemeFromAppTheme).toHaveBeenCalledWith("Auto");
  });

  it("handles save-last-used-connection by persisting the setting", () => {
    const { context, appSettings } = createIpcRegistrationHarness();
    const msg: NotifyMainRequest = {
      command: "save-last-used-connection",
      data: "WSL Session",
    };

    handleNotifyMain(msg, context);

    expect(appSettings.setSync).toHaveBeenCalledWith("gdb.lastUsedConnection", msg.data);
  });

  it("handles cancel-connection by disconnecting and clearing DB", () => {
    const { context, gdbInterface, send } = createIpcRegistrationHarness();
    const msg: NotifyMainRequest = { command: "cancel-connection" };

    handleNotifyMain(msg, context);

    expect(gdbInterface.disconnect).toHaveBeenCalledTimes(1);
    expect(gdbInterface.gdbDB.clearDatabase).toHaveBeenCalledTimes(1);
    expect(gdbInterface.gdbDB.allDataUpdateUI).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(IPC_CHANNELS.mainToRenderer.notifications.render, {
      command: "cancel-connection",
    });
  });

  it("handles valid selected connection payloads by connecting and notifying success", () => {
    const { context, gdbInterface, send } = createIpcRegistrationHarness({
      isSelectedConnection: ((value: unknown) => {
        return Boolean(value && typeof value === "object" && "name" in (value as object));
      }) as never,
    });

    handleNotifyMain(
      {
        command: "connect-selected-connection",
        data: {
          connection: { name: "profile", shell: "bash", commands: ["gdb"] },
        },
      },
      context,
    );

    expect(gdbInterface.connect).toHaveBeenCalledWith({
      name: "profile",
      shell: "bash",
      commands: ["gdb"],
    });
    expect(send).toHaveBeenNthCalledWith(1, IPC_CHANNELS.mainToRenderer.notifications.render, {
      command: "connection-started",
    });
    expect(send).toHaveBeenNthCalledWith(2, IPC_CHANNELS.mainToRenderer.notifications.render, {
      command: "connection-success",
    });
  });

  it("handles invalid selected connection payloads without connecting", () => {
    const { context, gdbInterface } = createIpcRegistrationHarness({
      isSelectedConnection: ((value: unknown) =>
        Boolean(value && (value as { valid?: boolean }).valid)) as never,
    });

    handleNotifyMain(
      { command: "connect-selected-connection", data: { connection: { name: "bad" } } } as NotifyMainRequest,
      context,
    );

    expect(gdbInterface.connect).not.toHaveBeenCalled();
    expect(gissMocks.sendHtmlBlock).toHaveBeenCalledWith(expect.stringContaining("Invalid selected connection payload"));
  });

  it("persists command history, source viewer settings, and connection list", () => {
    const { context, appSettings } = createIpcRegistrationHarness();

    handleNotifyMain(
      { command: "save-connections", data: { connections: [{ name: "one" }] } } as NotifyMainRequest,
      context,
    );
    handleNotifyMain({ command: "save-cmd-history", data: ["help"] }, context);
    handleNotifyMain({ command: "save-source-viewer-theme", data: "Monokai" }, context);
    handleNotifyMain({ command: "save-source-viewer-font-size", data: "18" }, context);
    handleNotifyMain({ command: "save-source-viewer-font-name", data: "Fira Code" }, context);
    handleNotifyMain({ command: "save-app-show-debug-info", data: true }, context);

    expect(appSettings.setSync).toHaveBeenCalledWith("gdb.connections", [{ name: "one" }]);
    expect(appSettings.setSync).toHaveBeenCalledWith("gdb.command.history", ["help"]);
    expect(appSettings.setSync).toHaveBeenCalledWith("gdb.gui.sourceViewerTheme", "Monokai");
    expect(appSettings.setSync).toHaveBeenCalledWith("gdb.gui.sourceViewerFontSize", "18");
    expect(appSettings.setSync).toHaveBeenCalledWith("gdb.gui.sourceViewerFontName", "Fira Code");
    expect(appSettings.setSync).toHaveBeenCalledWith("gdb.gui.showDebugInfo", true);
  });

  it("persists dock layout and grid columns and supports resetting grid columns", () => {
    const { context, appSettings } = createIpcRegistrationHarness();

    handleNotifyMain({ command: "save-dock-layout", data: { nodes: [] } }, context);
    handleNotifyMain(
      {
        command: "save-grid-columns",
        data: { gridName: "locals", columns: [{ field: "name", visible: true }] },
      } as NotifyMainRequest,
      context,
    );
    handleNotifyMain(
      { command: "reset-grid-columns", data: "locals" } as NotifyMainRequest,
      context,
    );
    handleNotifyMain({ command: "reset-grid-columns" } as NotifyMainRequest, context);

    expect(appSettings.setSync).toHaveBeenCalledWith("gdb.gui.dockLayout", { nodes: [] });
    expect(appSettings.setSync).toHaveBeenCalledWith(
      "gdb.gui.windowSize",
      expect.objectContaining({ x: 100, y: 200, width: 798, height: 598, fullscreen: false }),
    );
    expect(appSettings.setSync).toHaveBeenCalledWith("gdb.gui.gridColumns.locals", [
      { field: "name", visible: true },
    ]);
    expect(appSettings.unsetSync).toHaveBeenCalledWith("gdb.gui.gridColumns.locals");
    expect(appSettings.unsetSync).toHaveBeenCalledWith("gdb.gui.gridColumns");
  });

  it("handles command-entry and renderStart without throwing", () => {
    const { context, send } = createIpcRegistrationHarness();

    handleNotifyMain({ command: "command-entry" }, context);
    handleNotifyMain({ command: "renderStart" }, context);

    expect(send).toHaveBeenCalledWith(IPC_CHANNELS.mainToRenderer.notifications.render, {
      command: "command-entry",
    });
  });

  it("handles open-external with a valid https URL by calling shell.openExternal", () => {
    const { context } = createIpcRegistrationHarness();

    handleNotifyMain({ command: "open-external", data: "https://example.com" }, context);

    expect(vi.mocked(shell.openExternal)).toHaveBeenCalledWith("https://example.com");
  });

  it("handles open-external with a valid http URL", () => {
    const { context } = createIpcRegistrationHarness();

    handleNotifyMain({ command: "open-external", data: "http://example.com/page" }, context);

    expect(vi.mocked(shell.openExternal)).toHaveBeenCalledWith("http://example.com/page");
  });

  it("rejects ftp:// URLs in open-external as unsafe and logs an error", () => {
    const { context } = createIpcRegistrationHarness();

    handleNotifyMain(
      { command: "open-external", data: "ftp://files.example.com/file.txt" },
      context,
    );

    expect(vi.mocked(shell.openExternal)).not.toHaveBeenCalled();
    expect(gissMocks.sendHtmlBlock).toHaveBeenCalledWith(expect.stringContaining("Invalid Path Provided"));
  });

  it("rejects empty string in open-external as an invalid URL", () => {
    const { context } = createIpcRegistrationHarness();

    handleNotifyMain({ command: "open-external", data: "" }, context);

    expect(vi.mocked(shell.openExternal)).not.toHaveBeenCalled();
    expect(gissMocks.sendHtmlBlock).toHaveBeenCalledWith(expect.stringContaining("Invalid Path Provided"));
  });

  it("rejects non-string data in open-external as an invalid URL", () => {
    const { context } = createIpcRegistrationHarness();

    handleNotifyMain({ command: "open-external", data: 42 as never }, context);

    expect(vi.mocked(shell.openExternal)).not.toHaveBeenCalled();
    expect(gissMocks.sendHtmlBlock).toHaveBeenCalledWith(expect.stringContaining("Invalid Path Provided"));
  });

  it("handles save-sections-view-options by persisting both view settings", () => {
    const { context, appSettings } = createIpcRegistrationHarness();

    handleNotifyMain(
      {
        command: "save-sections-view-options",
        data: { showEmptySpace: true, showLegend: false },
      },
      context,
    );

    expect(appSettings.setSync).toHaveBeenCalledWith("gdb.gui.sectionsView.showEmptySpace", true);
    expect(appSettings.setSync).toHaveBeenCalledWith("gdb.gui.sectionsView.showLegend", false);
  });

  it("sends connection-failed when the connection attempt returns false", () => {
    const { context, send } = createIpcRegistrationHarness({
      isSelectedConnection: ((value: unknown) =>
        Boolean(value && typeof value === "object" && "name" in (value as object))) as never,
      gdbInterface: { connect: vi.fn().mockReturnValue(false) },
    });

    handleNotifyMain(
      {
        command: "connect-selected-connection",
        data: { connection: { name: "profile", shell: "bash", commands: ["gdb"] } },
      },
      context,
    );

    expect(send).toHaveBeenCalledWith(IPC_CHANNELS.mainToRenderer.notifications.render, {
      command: "connection-failed",
    });
  });

  it("does not throw for unrecognised commands", () => {
    const { context } = createIpcRegistrationHarness();

    expect(() =>
      handleNotifyMain({ command: "unknown-command-xyz" as never }, context),
    ).not.toThrow();
  });

  it("handles save-auto-symbol-loading by persisting the setting", () => {
    const { context, appSettings } = createIpcRegistrationHarness();

    handleNotifyMain({ command: "save-auto-symbol-loading", data: true }, context);

    expect(appSettings.setSync).toHaveBeenCalledWith("gdb.gui.disableAutoSymbolLoading", true);
  });
});

describe("onGdbCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes ordinary commands to the gdb interface", () => {
    const { context, gdbInterface } = createIpcRegistrationHarness();

    onGdbCommand("info registers", context);

    expect(gdbInterface.runCommand).toHaveBeenCalledWith("info registers");
  });

  it("selects a stack frame and refreshes debugger data when given a structured frame request", () => {
    const { context, gdbInterface } = createIpcRegistrationHarness();

    onGdbCommand({ kind: "select-stack-frame", frameLevel: "2" }, context);

    expect(gdbInterface.runCommand).toHaveBeenNthCalledWith(1, "frame 2");
    expect(gdbInterface.runCommand).toHaveBeenNthCalledWith(2, "-data-list-register-values x");
    expect(gdbInterface.runCommand).toHaveBeenNthCalledWith(3, "-stack-list-locals 1");
  });

  it("handles dot-commands for db, wsl, and screen", () => {
    const { context } = createIpcRegistrationHarness();

    onGdbCommand(".db locals", context);
    onGdbCommand(".wsl", context);
    onGdbCommand(".screen", context);

    expect(WslUtilities.getWslDistributions).toHaveBeenCalledTimes(1);
    expect(WslUtilities.getWslSerialPorts).toHaveBeenCalledTimes(1);
    expect(screen.getAllDisplays).toHaveBeenCalledTimes(1);
  });

  it("outputs an error for an unknown dot command", () => {
    const { context } = createIpcRegistrationHarness();

    onGdbCommand(".notarealcommand", context);

    expect(gissMocks.addLine).toHaveBeenCalledWith(expect.stringContaining(".notarealcommand"));
    expect(gissMocks.sendOutput).toHaveBeenCalled();
  });

  it("outputs an error for an unknown .db subcommand", () => {
    const { context } = createIpcRegistrationHarness();

    onGdbCommand(".db unknownsub", context);

    expect(gissMocks.addLine).toHaveBeenCalledWith(
      expect.stringContaining("Unknown .db subcommand"),
    );
    expect(gissMocks.sendOutput).toHaveBeenCalled();
  });

  it(".help sends an HTML table via GeneralInfoSender", () => {
    const { context } = createIpcRegistrationHarness();

    onGdbCommand(".help", context);

    expect(gissMocks.sendHtmlBlock).toHaveBeenCalledWith(expect.stringContaining("<table"));
  });

  it(".debug sends a header output via GeneralInfoSender", () => {
    const { context } = createIpcRegistrationHarness();

    onGdbCommand(".debug", context);

    expect(gissMocks.addHeader).toHaveBeenCalledWith(expect.stringContaining("Debugger"));
    expect(gissMocks.sendOutput).toHaveBeenCalled();
  });

  it(".db sources calls gdbSrcFileCache.list and sends an HTML block", () => {
    const list = vi.fn(() => ["/src/main.c", "/src/util.c"]);
    const { context } = createIpcRegistrationHarness({
      gdbInterface: { gdbDB: { gdbSrcFileCache: { list } } },
    });

    onGdbCommand(".db sources", context);

    expect(list).toHaveBeenCalled();
    expect(gissMocks.sendHtmlBlock).toHaveBeenCalledWith(expect.stringContaining("<table"));
  });

  it(".db threads calls threadGroups.values and threads.values and sends HTML", () => {
    const threadGroups = new Map([["i1", { gid: "i1", threads: new Map() }]]);
    const threads = new Map([
      [
        "1",
        {
          active: true,
          id: "1",
          targetId: "t1",
          details: "",
          name: "main",
          state: "stopped",
          frame: { func: "main" },
        },
      ],
    ]);
    const { context } = createIpcRegistrationHarness({
      gdbInterface: { gdbDB: { threadGroups, threads } },
    });

    onGdbCommand(".db threads", context);

    expect(gissMocks.sendHtmlBlock).toHaveBeenCalledTimes(2);
  });

  it(".db features calls featureList and sends an HTML block", () => {
    const featureList = vi.fn(() => [{ feature: "async", available: true }]);
    const { context } = createIpcRegistrationHarness({
      gdbInterface: { gdbDB: { featureList } },
    });

    onGdbCommand(".db features", context);

    expect(featureList).toHaveBeenCalled();
    expect(gissMocks.sendHtmlBlock).toHaveBeenCalledWith(expect.stringContaining("<table"));
  });

  it(".db parameters calls paramList and sends an HTML block", () => {
    const paramList = vi.fn(() => [{ name: "print object", value: "on" }]);
    const { context } = createIpcRegistrationHarness({
      gdbInterface: { gdbDB: { paramList } },
    });

    onGdbCommand(".db parameters", context);

    expect(paramList).toHaveBeenCalled();
    expect(gissMocks.sendHtmlBlock).toHaveBeenCalledWith(expect.stringContaining("<table"));
  });

  it(".db symbols reads gdbSymbolFiles and sends an HTML block", () => {
    const gdbSymbolFiles = {
      mainSym: "app.elf",
      sections: [{ startAddr: "0x0", endAddr: "0x100", section: ".text", file: "main.c" }],
    };
    const { context } = createIpcRegistrationHarness({
      gdbInterface: { gdbDB: { gdbSymbolFiles } },
    });

    onGdbCommand(".db symbols", context);

    expect(gissMocks.sendHtmlBlock).toHaveBeenCalledWith(expect.stringContaining("app.elf"));
  });

  it(".db stack reads gdbInterface.stackFrames from context and sends an HTML block", () => {
    const { context } = createIpcRegistrationHarness({
      gdbInterface: { gdbDB: { stackFrames: [] } },
    });

    onGdbCommand(".db stack", context);

    expect(gissMocks.sendHtmlBlock).toHaveBeenCalledWith(expect.stringContaining("<table"));
  });

  it(".db breakpoints reads gdbInterface.breakpointList from context and sends HTML", () => {
    const { context } = createIpcRegistrationHarness({
      gdbInterface: { gdbDB: { breakpointList: vi.fn().mockReturnValue([]) } },
    });

    onGdbCommand(".db breakpoints", context);

    expect(gissMocks.sendHtmlBlock).toHaveBeenCalledWith(expect.stringContaining("<table"));
  });

  it(".db registers reads gdbInterface.registerList from context and sends HTML", () => {
    const { context } = createIpcRegistrationHarness({
      gdbInterface: { gdbDB: { registerList: vi.fn().mockReturnValue([]) } },
    });

    onGdbCommand(".db registers", context);

    expect(gissMocks.sendHtmlBlock).toHaveBeenCalledWith(expect.stringContaining("<table"));
  });

  it(".db functions reads gdbInterface.gdbFunctionNames from context and sends HTML", () => {
    const { context } = createIpcRegistrationHarness({
      gdbInterface: { gdbDB: { gdbFunctionNames: new Map() } },
    });

    onGdbCommand(".db functions", context);

    expect(gissMocks.sendHtmlBlock).toHaveBeenCalledWith(expect.stringContaining("<table"));
  });
});
/**
 * Performs getRegisteredHandlers as part of this module's internal workflow.
 *
 * @param ipcMain - ipcMain parameter.
 * @returns The computed result produced by this operation.
 */

function getRegisteredHandlers(ipcMain: { on: ReturnType<typeof vi.fn>; handle: ReturnType<typeof vi.fn> }) {
/**
 * Performs getOn as part of this module's internal workflow.
 *
 * @param ch - ch parameter.
 * @returns The computed result produced by this operation.
 */
  const getOn = (ch: string) => ipcMain.on.mock.calls.find(([c]) => c === ch)?.[1] as ((...args: unknown[]) => unknown) | undefined;
/**
 * Performs getHandle as part of this module's internal workflow.
 *
 * @param ch - ch parameter.
 * @returns The computed result produced by this operation.
 */
  const getHandle = (ch: string) => ipcMain.handle.mock.calls.find(([c]) => c === ch)?.[1] as ((...args: unknown[]) => unknown) | undefined;
  return {
    notifyHandler: getOn(IPC_CHANNELS.rendererToMain.commands.app.notify),
    sendHandler: getHandle(IPC_CHANNELS.rendererToMain.commands.debugger.send),
    controlDHandler: getOn(IPC_CHANNELS.rendererToMain.commands.debugger.sendControlD),
    dangerousResponseHandler: getOn(IPC_CHANNELS.rendererSend.dangerousCommandResponse),
  };
}

describe("registerIpcCommandHandlers", () => {
  it("registers app notification and debugger send channels", () => {
    const { context, ipcMain } = createIpcRegistrationHarness();

    registerIpcCommandHandlers(context);

    expect(ipcMain.on).toHaveBeenCalledWith(
      IPC_CHANNELS.rendererToMain.commands.app.notify,
      expect.any(Function),
    );
    expect(ipcMain.handle).toHaveBeenCalledWith(
      IPC_CHANNELS.rendererToMain.commands.debugger.send,
      expect.any(Function),
    );
  });

  it("notify handler dispatches messages to handleNotifyMain", () => {
    const { context, ipcMain, send } = createIpcRegistrationHarness();
    registerIpcCommandHandlers(context);
    const { notifyHandler } = getRegisteredHandlers(ipcMain);

    notifyHandler!({}, { command: "renderEnd" });

    expect(send).toHaveBeenCalledWith(IPC_CHANNELS.mainToRenderer.notifications.render, {
      command: "command-entry",
    });
  });

  it("send handler routes a non-dangerous command directly to onGdbCommand", async () => {
    const { context, ipcMain, gdbInterface } = createIpcRegistrationHarness({
      appSettings: { getSync: vi.fn().mockReturnValue(undefined) },
    });
    registerIpcCommandHandlers(context);
    const { sendHandler } = getRegisteredHandlers(ipcMain);

    await sendHandler!({}, "info registers");

    expect(gdbInterface.runCommand).toHaveBeenCalledWith("info registers");
  });

  it("send handler routes non-string structured command without checking dangerous entries", async () => {
    const getSync = vi.fn();
    const { context, ipcMain, gdbInterface } = createIpcRegistrationHarness({
      appSettings: { getSync },
    });
    registerIpcCommandHandlers(context);
    const { sendHandler } = getRegisteredHandlers(ipcMain);

    await sendHandler!({}, { kind: "select-stack-frame", frameLevel: "3" });

    expect(getSync).not.toHaveBeenCalled();
    expect(gdbInterface.runCommand).toHaveBeenCalledWith("frame 3");
  });

  it("send handler with defaultAnswer=yes executes without prompting", async () => {
    const { context, ipcMain, gdbInterface, send } = createIpcRegistrationHarness({
      appSettings: { getSync: vi.fn().mockReturnValue([{ command: "rm", defaultAnswer: "yes" }]) },
    });
    registerIpcCommandHandlers(context);
    const { sendHandler } = getRegisteredHandlers(ipcMain);

    await sendHandler!({}, "rm /tmp");

    expect(gdbInterface.runCommand).toHaveBeenCalledWith("rm /tmp");
    expect(send).not.toHaveBeenCalledWith(
      IPC_CHANNELS.mainToRenderer.notifications.render,
      expect.objectContaining({ command: "confirm-dangerous-command" }),
    );
  });

  it("send handler with defaultAnswer=no skips execution silently", async () => {
    const { context, ipcMain, gdbInterface } = createIpcRegistrationHarness({
      appSettings: { getSync: vi.fn().mockReturnValue([{ command: "rm", defaultAnswer: "no" }]) },
    });
    registerIpcCommandHandlers(context);
    const { sendHandler } = getRegisteredHandlers(ipcMain);

    await sendHandler!({}, "rm /tmp");

    expect(gdbInterface.runCommand).not.toHaveBeenCalled();
  });

  it("send handler with no entries matching the command executes without prompting", async () => {
    const { context, ipcMain, gdbInterface } = createIpcRegistrationHarness({
      appSettings: { getSync: vi.fn().mockReturnValue([{ command: "kill" }]) },
    });
    registerIpcCommandHandlers(context);
    const { sendHandler } = getRegisteredHandlers(ipcMain);

    await sendHandler!({}, "info registers");

    expect(gdbInterface.runCommand).toHaveBeenCalledWith("info registers");
  });

  it("send handler without defaultAnswer sends confirm-dangerous-command and executes when allowed", async () => {
    const { context, ipcMain, send, gdbInterface } = createIpcRegistrationHarness({
      appSettings: {
        getSync: vi.fn().mockReturnValue([{ command: "rm", reason: "removes files permanently" }]),
      },
    });
    registerIpcCommandHandlers(context);
    const { sendHandler, dangerousResponseHandler } = getRegisteredHandlers(ipcMain);

    const pending = sendHandler!({}, "rm /tmp/file");
    dangerousResponseHandler!({}, { allow: true, remember: false, answer: "yes" });
    await pending;

    expect(send).toHaveBeenCalledWith(IPC_CHANNELS.mainToRenderer.notifications.render, {
      command: "confirm-dangerous-command",
      data: { commandText: "rm /tmp/file", reason: "removes files permanently" },
    });
    expect(gdbInterface.runCommand).toHaveBeenCalledWith("rm /tmp/file");
  });

  it("send handler without defaultAnswer does not execute when user denies", async () => {
    const { context, ipcMain, gdbInterface } = createIpcRegistrationHarness({
      appSettings: { getSync: vi.fn().mockReturnValue([{ command: "rm" }]) },
    });
    registerIpcCommandHandlers(context);
    const { sendHandler, dangerousResponseHandler } = getRegisteredHandlers(ipcMain);

    const pending = sendHandler!({}, "rm /tmp");
    dangerousResponseHandler!({}, { allow: false, remember: false, answer: "no" });
    await pending;

    expect(gdbInterface.runCommand).not.toHaveBeenCalled();
  });

  it("dangerous command response with remember=true updates existing entry in settings", async () => {
    const { context, ipcMain, appSettings } = createIpcRegistrationHarness({
      appSettings: {
        getSync: vi.fn().mockReturnValue([{ command: "rm", reason: "dangerous" }]),
      },
    });
    registerIpcCommandHandlers(context);
    const { sendHandler, dangerousResponseHandler } = getRegisteredHandlers(ipcMain);

    const pending = sendHandler!({}, "rm /tmp");
    dangerousResponseHandler!({}, { allow: true, remember: true, answer: "yes" });
    await pending;

    expect(appSettings.setSync).toHaveBeenCalledWith(
      "gdb.dangerousCommands",
      expect.arrayContaining([expect.objectContaining({ command: "rm", defaultAnswer: "yes" })]),
    );
  });

  it("dangerous command response with remember=true pushes new entry when none exists", async () => {
    const { context, ipcMain, appSettings } = createIpcRegistrationHarness({
      appSettings: {
        getSync: vi
          .fn()
          .mockReturnValueOnce([{ command: "rm" }])
          .mockReturnValueOnce(undefined),
      },
    });
    registerIpcCommandHandlers(context);
    const { sendHandler, dangerousResponseHandler } = getRegisteredHandlers(ipcMain);

    const pending = sendHandler!({}, "rm /tmp");
    dangerousResponseHandler!({}, { allow: false, remember: true, answer: "no" });
    await pending;

    expect(appSettings.setSync).toHaveBeenCalledWith(
      "gdb.dangerousCommands",
      expect.arrayContaining([expect.objectContaining({ command: "rm", defaultAnswer: "no" })]),
    );
  });

  it("dangerousCommandResponse handler is a no-op when no promise is pending", () => {
    const { context, ipcMain } = createIpcRegistrationHarness();
    registerIpcCommandHandlers(context);
    const { dangerousResponseHandler } = getRegisteredHandlers(ipcMain);

    expect(() =>
      dangerousResponseHandler!({}, { allow: true, remember: false, answer: "yes" }),
    ).not.toThrow();
  });

  it("controlD handler calls sendControlD on the gdb interface", () => {
    const sendControlD = vi.fn();
    const { context, ipcMain } = createIpcRegistrationHarness({
      gdbInterface: { sendControlD } as never,
    });
    registerIpcCommandHandlers(context);
    const { controlDHandler } = getRegisteredHandlers(ipcMain);

    controlDHandler!({});

    expect(sendControlD).toHaveBeenCalledTimes(1);
  });
});
