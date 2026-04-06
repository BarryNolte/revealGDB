import { describe, expect, it, vi } from "vitest";
import { IPC_CHANNELS, NotifyMainRequest } from "../../../../src/common/ipc-contracts";
import { handleNotifyMain } from "../../../../src/main/ipc/commands";
import { createIpcRegistrationHarness } from "../../../helpers/ipc-test-harness";

vi.mock("../../../../src/main/theme-support", () => ({
  setNativeThemeFromAppTheme: vi.fn(),
}));

import { setNativeThemeFromAppTheme } from "../../../../src/main/theme-support";

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
});
