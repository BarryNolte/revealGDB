import { describe, expect, it, vi } from "vitest";
import { IPC_CHANNELS, NotifyMainRequest } from "../../common/ipc-contracts";
import { handleNotifyMain } from "./commands";
import { IpcRegistrationContext } from "./types";

function createContext() {
  const send = vi.fn();
  const getPosition = vi.fn().mockReturnValue([100, 200]);
  const getSize = vi.fn().mockReturnValue([800, 600]);

  const mainWindow = {
    fullScreen: false,
    getPosition,
    getSize,
    webContents: {
      send,
    },
  };

  const gdbInterface = {
    connect: vi.fn().mockReturnValue(true),
    disconnect: vi.fn(),
    send: vi.fn(),
    gdbDB: {
      clearDatabase: vi.fn(),
      allDataUpdateUI: vi.fn(),
      dump: vi.fn(),
      getAllFunctionNames: vi.fn().mockReturnValue([]),
    },
  };

  const appSettings = {
    setSync: vi.fn(),
    getSync: vi.fn(),
  };

  const context: IpcRegistrationContext = {
    ipcMain: {} as never,
    appSettings: appSettings as never,
    fontList: new Map<string, string>(),
    gdbAppInfo: new Map<string, unknown>() as never,
    getMainWindow: () => mainWindow as never,
    getGdbInterface: () => gdbInterface as never,
    isSelectedConnection: (value): value is never => {
      return Boolean(value);
    },
  };

  return { context, send, appSettings, gdbInterface };
}

describe("handleNotifyMain", () => {
  it("handles renderEnd by sending command-entry notify-render", () => {
    const { context, send } = createContext();
    const msg: NotifyMainRequest = { command: "renderEnd" };

    handleNotifyMain(msg, context);

    expect(send).toHaveBeenCalledWith(IPC_CHANNELS.mainToRenderer.notifyRender, {
      command: "command-entry",
    });
  });

  it("handles save-main-theme by persisting the setting", () => {
    const { context, appSettings } = createContext();
    const msg: NotifyMainRequest = {
      command: "save-main-theme",
      data: "solarized",
    };

    handleNotifyMain(msg, context);

    expect(appSettings.setSync).toHaveBeenCalledWith("gdb.gui.mainTheme", msg.data);
  });

  it("handles cancel-connection by disconnecting and clearing DB", () => {
    const { context, gdbInterface, send } = createContext();
    const msg: NotifyMainRequest = { command: "cancel-connection" };

    handleNotifyMain(msg, context);

    expect(gdbInterface.disconnect).toHaveBeenCalledTimes(1);
    expect(gdbInterface.gdbDB.clearDatabase).toHaveBeenCalledTimes(1);
    expect(gdbInterface.gdbDB.allDataUpdateUI).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(IPC_CHANNELS.mainToRenderer.notifyRender, {
      command: "cancel-connection",
    });
  });
});
