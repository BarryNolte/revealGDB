import { describe, expect, it } from "vitest";
import { IPC_CHANNELS, NotifyMainRequest } from "../../common/ipc-contracts";
import { createIpcRegistrationHarness } from "../../test-helpers/ipc-test-harness";
import { handleNotifyMain } from "./commands";

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
