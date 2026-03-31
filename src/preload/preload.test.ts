import { beforeEach, describe, expect, it, vi } from "vitest";
import { IPC_CHANNELS } from "../common/ipc-contracts";
import { createPreloadElectronHarness, loadPreloadApi } from "../test-helpers/preload-test-harness";

const electronHarness = createPreloadElectronHarness();

describe("preload IPC bridge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes grouped and legacy IPC APIs", async () => {
    const api = await loadPreloadApi(electronHarness);

    expect(electronHarness.exposeInMainWorld).toHaveBeenCalledWith(
      "ipcToMain",
      expect.objectContaining({
        messages: expect.objectContaining({
          console: expect.any(Function),
          log: expect.any(Function),
        }),
        notifications: expect.objectContaining({
          connectionStatus: expect.any(Function),
          render: expect.any(Function),
        }),
        debuggerData: expect.objectContaining({
          registers: expect.any(Function),
          memory: expect.any(Function),
        }),
        queries: expect.objectContaining({
          app: expect.objectContaining({
            getSettings: expect.any(Function),
            getVersionInfo: expect.any(Function),
          }),
        }),
        commands: expect.objectContaining({
          debugger: expect.objectContaining({
            sendGdbCommand: expect.any(Function),
          }),
          app: expect.objectContaining({
            notifyMain: expect.any(Function),
          }),
        }),
        getSettings: expect.any(Function),
        sendGdbCommand: expect.any(Function),
      }),
    );

    expect(api).toBeDefined();
  });

  it("routes grouped and legacy app queries through the same channels", async () => {
    const api = await loadPreloadApi(electronHarness);

    api.queries.app.getSettings();
    api.getSettings();
    api.queries.environment.getWslDistrobutions();
    api.getFunctionNames();

    expect(electronHarness.invoke).toHaveBeenNthCalledWith(
      1,
      IPC_CHANNELS.rendererToMain.queries.app.settings,
    );
    expect(electronHarness.invoke).toHaveBeenNthCalledWith(
      2,
      IPC_CHANNELS.rendererToMain.queries.app.settings,
    );
    expect(electronHarness.invoke).toHaveBeenNthCalledWith(
      3,
      IPC_CHANNELS.rendererToMain.queries.environment.wslDistributions,
    );
    expect(electronHarness.invoke).toHaveBeenNthCalledWith(
      4,
      IPC_CHANNELS.rendererToMain.queries.debugger.functionNames,
    );
  });

  it("routes grouped subscriptions and commands through normalized channels", async () => {
    const api = await loadPreloadApi(electronHarness);
    const callback = vi.fn();

    const unsubscribe = api.messages.console(callback);
    api.commands.debugger.sendGdbCommand("continue");
    api.notifyMain({ command: "renderEnd" });
    unsubscribe();

    expect(electronHarness.on).toHaveBeenCalledWith(
      IPC_CHANNELS.mainToRenderer.console.message,
      expect.any(Function),
    );
    expect(electronHarness.send).toHaveBeenCalledWith(
      IPC_CHANNELS.rendererToMain.commands.debugger.send,
      "continue",
    );
    expect(electronHarness.send).toHaveBeenCalledWith(
      IPC_CHANNELS.rendererToMain.commands.app.notify,
      {
        command: "renderEnd",
      },
    );
    expect(electronHarness.removeListener).toHaveBeenCalledWith(
      IPC_CHANNELS.mainToRenderer.console.message,
      expect.any(Function),
    );
  });
});
