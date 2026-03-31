import { describe, expect, it, vi } from "vitest";
import { IPC_CHANNELS } from "../../common/ipc-contracts";
import { registerIpcQueryHandlers } from "./queries";
import { IpcRegistrationContext } from "./types";

function createContext() {
  const handle = vi.fn();

  const context: IpcRegistrationContext = {
    ipcMain: {
      handle,
    } as never,
    appSettings: {
      getSync: vi.fn().mockReturnValue({}),
    } as never,
    fontList: new Map<string, string>([["Consolas", "Consolas"]]),
    gdbAppInfo: new Map<string, unknown>([["version", "1.0.0"]]) as never,
    getMainWindow: vi.fn() as never,
    getGdbInterface: () =>
      ({
        gdbDB: {
          getAllFunctionNames: vi.fn().mockReturnValue([{ name: "main" }]),
        },
      }) as never,
    isSelectedConnection: ((value: unknown) => Boolean(value)) as never,
  };

  return { context, handle };
}

describe("registerIpcQueryHandlers", () => {
  it("registers app, environment, and debugger query channels", () => {
    const { context, handle } = createContext();

    registerIpcQueryHandlers(context);

    expect(handle).toHaveBeenCalledWith(
      IPC_CHANNELS.rendererToMain.queries.app.settings,
      expect.any(Function),
    );
    expect(handle).toHaveBeenCalledWith(
      IPC_CHANNELS.rendererToMain.queries.app.systemFonts,
      expect.any(Function),
    );
    expect(handle).toHaveBeenCalledWith(
      IPC_CHANNELS.rendererToMain.queries.app.versionInfo,
      expect.any(Function),
    );
    expect(handle).toHaveBeenCalledWith(
      IPC_CHANNELS.rendererToMain.queries.environment.wslDistributions,
      expect.any(Function),
    );
    expect(handle).toHaveBeenCalledWith(
      IPC_CHANNELS.rendererToMain.queries.debugger.functionNames,
      expect.any(Function),
    );
  });
});
