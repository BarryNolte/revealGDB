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

import { describe, expect, it, vi } from "vitest";
import { IPC_CHANNELS, NotifyMainRequest } from "../../../../src/common/ipc-contracts";
import {
  handleNotifyMain,
  onGdbCommand,
  registerIpcCommandHandlers,
} from "../../../../src/main/ipc/commands";
import { createIpcRegistrationHarness } from "../../../helpers/ipc-test-harness";

vi.mock("../../../../src/main/theme-support", () => ({
  setNativeThemeFromAppTheme: vi.fn(),
}));

vi.mock("../../../../src/main/utilities/wsl-utilities", () => ({
  WslUtilities: {
    getWslDistrobutions: vi.fn(() => [{ name: "Ubuntu", state: "Running", version: "2" }]),
    getWslSerialPorts: vi.fn(() => ["ttyS0", "ttyUSB0"]),
  },
}));

import { setNativeThemeFromAppTheme } from "../../../../src/main/theme-support";
import { WslUtilities } from "../../../../src/main/utilities/wsl-utilities";

describe("handleNotifyMain", () => {
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
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    handleNotifyMain(
      { command: "connect-selected-connection", data: { connection: { name: "bad" } } },
      context,
    );

    expect(gdbInterface.connect).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it("persists command history, source viewer settings, and connection list", () => {
    const { context, appSettings } = createIpcRegistrationHarness();

    handleNotifyMain(
      { command: "save-connections", data: { connections: [{ name: "one" }] } },
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
    handleNotifyMain({ command: "reset-grid-columns" }, context);

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
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    handleNotifyMain({ command: "command-entry" }, context);
    handleNotifyMain({ command: "renderStart" }, context);

    expect(send).toHaveBeenCalledWith(IPC_CHANNELS.mainToRenderer.notifications.render, {
      command: "command-entry",
    });
    expect(logSpy).toHaveBeenCalledWith("[startup] renderer-start");

    logSpy.mockRestore();
  });
});

describe("onGdbCommand", () => {
  it("routes ordinary commands to the gdb interface", () => {
    const { context, gdbInterface } = createIpcRegistrationHarness();

    onGdbCommand("info registers", context);

    expect(gdbInterface.runCommand).toHaveBeenCalledWith("info registers");
  });

  it("handles dot-commands for db, wsl, and screen", () => {
    const { context, gdbInterface, mainWindow } = createIpcRegistrationHarness();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    onGdbCommand(".db", context);
    onGdbCommand(".wsl", context);
    onGdbCommand(".screen", context);

    expect(gdbInterface.gdbDB.dump).toHaveBeenCalledTimes(1);
    expect(WslUtilities.getWslDistrobutions).toHaveBeenCalledTimes(1);
    expect(WslUtilities.getWslSerialPorts).toHaveBeenCalledTimes(1);
    expect(mainWindow.getBounds).toHaveBeenCalledTimes(1);

    logSpy.mockRestore();
  });
});

describe("registerIpcCommandHandlers", () => {
  it("registers app notification and debugger send channels", () => {
    const { context, ipcMain } = createIpcRegistrationHarness();

    registerIpcCommandHandlers(context);

    expect(ipcMain.on).toHaveBeenCalledWith(
      IPC_CHANNELS.rendererToMain.commands.app.notify,
      expect.any(Function),
    );
    expect(ipcMain.on).toHaveBeenCalledWith(
      IPC_CHANNELS.rendererToMain.commands.debugger.send,
      expect.any(Function),
    );
  });
});
