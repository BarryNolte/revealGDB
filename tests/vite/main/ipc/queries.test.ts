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
import { registerIpcQueryHandlers } from "../../../../src/main/ipc/queries";
import { WslUtilities } from "../../../../src/main/utilities/wsl-utilities";
import { createIpcRegistrationHarness } from "../../../helpers/ipc-test-harness";

vi.mock("../../../../src/main/utilities/wsl-utilities", () => ({
  WslUtilities: {
    getWslDistributions: vi.fn(() => [
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
    vi.mocked(WslUtilities.getWslDistributions).mockImplementationOnce(() => {
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

  it("registers all debugger query channels (varAtPosition, varByName, evaluateExpression, sections)", () => {
    const { context, ipcMain } = createIpcRegistrationHarness();

    registerIpcQueryHandlers(context);

    const registeredChannels = ipcMain.handle.mock.calls.map(([ch]) => ch);

    expect(registeredChannels).toContain(
      IPC_CHANNELS.rendererToMain.queries.debugger.varAtPosition,
    );
    expect(registeredChannels).toContain(IPC_CHANNELS.rendererToMain.queries.debugger.varByName);
    expect(registeredChannels).toContain(
      IPC_CHANNELS.rendererToMain.queries.debugger.evaluateExpression,
    );
    expect(registeredChannels).toContain(IPC_CHANNELS.rendererToMain.queries.debugger.sections);
  });

  it("queryVarAtPosition handler delegates to gdbDB.queryVarAtPosition with correct args", async () => {
    const expected = { name: "ptr", value: "0xdeadbeef" };
    const queryVarAtPosition = vi.fn().mockReturnValue(expected);
    const { context, ipcMain } = createIpcRegistrationHarness({
      gdbInterface: { gdbDB: { queryVarAtPosition } },
    });

    registerIpcQueryHandlers(context);

    const handler = ipcMain.handle.mock.calls.find(
      ([ch]) => ch === IPC_CHANNELS.rendererToMain.queries.debugger.varAtPosition,
    )?.[1];

    const result = await handler(null, "/src/main.c", 42, 7);

    expect(queryVarAtPosition).toHaveBeenCalledWith("/src/main.c", 42, 7);
    expect(result).toEqual(expected);
  });

  it("getVarByName handler delegates to gdbDB.getVarByName with correct args", async () => {
    const expected = { name: "count", value: "3" };
    const getVarByName = vi.fn().mockReturnValue(expected);
    const { context, ipcMain } = createIpcRegistrationHarness({
      gdbInterface: { gdbDB: { getVarByName } },
    });

    registerIpcQueryHandlers(context);

    const handler = ipcMain.handle.mock.calls.find(
      ([ch]) => ch === IPC_CHANNELS.rendererToMain.queries.debugger.varByName,
    )?.[1];

    const result = await handler(null, "/src/util.c", "count");

    expect(getVarByName).toHaveBeenCalledWith("/src/util.c", "count");
    expect(result).toEqual(expected);
  });

  it("evaluateExpression handler delegates to gdbInterface.evaluateExpression", async () => {
    const evaluateExpression = vi.fn().mockResolvedValue("99");
    const { context, ipcMain } = createIpcRegistrationHarness({
      gdbInterface: { evaluateExpression },
    });

    registerIpcQueryHandlers(context);

    const handler = ipcMain.handle.mock.calls.find(
      ([ch]) => ch === IPC_CHANNELS.rendererToMain.queries.debugger.evaluateExpression,
    )?.[1];

    const result = await handler(null, "x + 1");

    expect(evaluateExpression).toHaveBeenCalledWith("x + 1");
    expect(result).toBe("99");
  });

  it("getSectionData handler returns gdbInterface.gdbDB.gdbSymbolFiles", async () => {
    const gdbSymbolFiles = { mainSym: "app.elf", sections: [] };
    const { context, ipcMain } = createIpcRegistrationHarness({
      gdbInterface: { gdbDB: { gdbSymbolFiles } },
    });

    registerIpcQueryHandlers(context);

    const handler = ipcMain.handle.mock.calls.find(
      ([ch]) => ch === IPC_CHANNELS.rendererToMain.queries.debugger.sections,
    )?.[1];

    const result = await handler();

    expect(result).toBe(gdbSymbolFiles);
  });

  it("showSourceAt handler reads file, pushes via sourceFile channel, and returns result", async () => {
    const getSourceFileContents = vi.fn().mockResolvedValue("int main() {}");
    const { context, ipcMain, send } = createIpcRegistrationHarness({
      gdbInterface: { gdbDB: { getSourceFileContents } },
    });

    registerIpcQueryHandlers(context);

    const handler = ipcMain.handle.mock.calls.find(
      ([ch]) => ch === IPC_CHANNELS.rendererToMain.queries.debugger.showSourceAt,
    )?.[1];

    const result = await handler(null, "/src/main.c", "10");

    expect(getSourceFileContents).toHaveBeenCalledWith("/src/main.c");
    expect(result).toEqual({ fileName: "/src/main.c", line: "10", contents: "int main() {}" });
    expect(send).toHaveBeenCalledWith(IPC_CHANNELS.mainToRenderer.debuggerData.sourceFile, {
      fileName: "/src/main.c",
      line: "10",
      contents: "int main() {}",
    });
  });

  it("getSettings handler throws after exhausting all retries", async () => {
    vi.useFakeTimers();

    const getSync = vi.fn<(key: string) => unknown>().mockImplementation(() => {
      throw new Error("always locked");
    });
    const { context, ipcMain } = createIpcRegistrationHarness({
      appSettings: { getSync },
    });

    registerIpcQueryHandlers(context);

    const handler = ipcMain.handle.mock.calls.find(
      ([ch]) => ch === IPC_CHANNELS.rendererToMain.queries.app.settings,
    )?.[1];

    const promise = handler();
    // Attach rejection handler before advancing timers so the rejection is never unhandled
    const rejection = expect(promise).rejects.toThrow("always locked");
    await vi.runAllTimersAsync();
    await rejection;

    vi.useRealTimers();
  });
});
