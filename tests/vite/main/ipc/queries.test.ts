/**
 * queries.test module.
 *
 * @remarks
 * Source module for queries.test.
 */

/**
 * @file queries.test.ts
 * @description Source module for queries.test.
 */

import { describe, expect, it, vi } from "vitest";
import { IPC_CHANNELS } from "../../../../src/common/ipc-contracts";
import { createIpcRegistrationHarness } from "../../../helpers/ipc-test-harness";
import { registerIpcQueryHandlers } from "../../../../src/main/ipc/queries";
import { WslUtilities } from "../../../../src/main/utilities/wsl-utilities";

vi.mock("../../../../src/main/utilities/wsl-utilities", () => ({
  WslUtilities: {
    getWslDistrobutions: vi.fn(() => [
      { name: "Ubuntu", version: "2", state: "Running", default: true },
    ]),
  },
}));

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

  it("resolves settings after retries, returns fonts, version info, WSL distros, and function names", async () => {
    vi.useFakeTimers();

    const fontList = {
      keys: () => ({ toArray: () => ["Consolas", "Fira Code"] }),
    } as unknown as Map<string, string>;
    const versionInfo = new Map<string, unknown>([["Electron Version", "1.0.0"]]) as never;
    const getSync = vi
      .fn<(key: string) => unknown>()
      .mockImplementationOnce(() => {
        throw new Error("locked");
      })
      .mockImplementationOnce(() => {
        throw new Error("still locked");
      })
      .mockReturnValue({ theme: "Dark" });
    const getAllFunctionNames = vi.fn().mockReturnValue([{ name: "main" }]);
    const { context, ipcMain } = createIpcRegistrationHarness({
      appSettings: { getSync },
      fontList,
      gdbAppInfo: versionInfo,
      gdbInterface: { gdbDB: { getAllFunctionNames } },
    });

    registerIpcQueryHandlers(context);

    const handlers = Object.fromEntries(
      ipcMain.handle.mock.calls.map(([channel, handler]) => [channel, handler]),
    );

    const settingsPromise = handlers[IPC_CHANNELS.rendererToMain.queries.app.settings]();
    await vi.runAllTimersAsync();
    await expect(settingsPromise).resolves.toEqual({ theme: "Dark" });

    await expect(handlers[IPC_CHANNELS.rendererToMain.queries.app.systemFonts]()).resolves.toEqual([
      "Consolas",
      "Fira Code",
    ]);
    await expect(handlers[IPC_CHANNELS.rendererToMain.queries.app.versionInfo]()).resolves.toBe(
      versionInfo,
    );
    await expect(
      handlers[IPC_CHANNELS.rendererToMain.queries.environment.wslDistributions](),
    ).resolves.toEqual([{ name: "Ubuntu", version: "2", state: "Running", default: true }]);
    await expect(
      handlers[IPC_CHANNELS.rendererToMain.queries.debugger.functionNames](),
    ).resolves.toEqual([{ name: "main" }]);

    vi.useRealTimers();
  });

  it("returns an empty WSL distribution list when enumeration fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(WslUtilities.getWslDistrobutions).mockImplementationOnce(() => {
      throw new Error("wsl missing");
    });
    const { context, ipcMain } = createIpcRegistrationHarness();

    registerIpcQueryHandlers(context);

    const handler = ipcMain.handle.mock.calls.find(
      ([channel]) => channel === IPC_CHANNELS.rendererToMain.queries.environment.wslDistributions,
    )?.[1];

    await expect(handler()).resolves.toEqual([]);
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
