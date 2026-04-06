import { describe, expect, it, vi } from "vitest";
import { IPC_CHANNELS } from "../../../../src/common/ipc-contracts";
import { createIpcRegistrationHarness } from "../../../helpers/ipc-test-harness";
import { registerIpcQueryHandlers } from "../../../../src/main/ipc/queries";

describe("registerIpcQueryHandlers", () => {
  it("registers app, environment, and debugger query channels", () => {
    const { context, ipcMain } = createIpcRegistrationHarness({
      fontList: new Map<string, string>([["Consolas", "Consolas"]]),
      gdbAppInfo: new Map<string, unknown>([["version", "1.0.0"]]) as never,
      gdbInterface: {
        gdbDB: {
          getAllFunctionNames: vi.fn().mockReturnValue([{ name: "main" }]),
        },
      },
    });

    registerIpcQueryHandlers(context);

    expect(ipcMain.handle).toHaveBeenCalledWith(
      IPC_CHANNELS.rendererToMain.queries.app.settings,
      expect.any(Function),
    );
    expect(ipcMain.handle).toHaveBeenCalledWith(
      IPC_CHANNELS.rendererToMain.queries.app.systemFonts,
      expect.any(Function),
    );
    expect(ipcMain.handle).toHaveBeenCalledWith(
      IPC_CHANNELS.rendererToMain.queries.app.versionInfo,
      expect.any(Function),
    );
    expect(ipcMain.handle).toHaveBeenCalledWith(
      IPC_CHANNELS.rendererToMain.queries.environment.wslDistributions,
      expect.any(Function),
    );
    expect(ipcMain.handle).toHaveBeenCalledWith(
      IPC_CHANNELS.rendererToMain.queries.debugger.functionNames,
      expect.any(Function),
    );
  });
});
