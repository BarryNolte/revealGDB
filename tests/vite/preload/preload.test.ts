/**
 * preload.test module.
 *
 * @remarks
 * Source module for preload.test.
 */

/**
 * @file preload.test.ts
 * @description Source module for preload.test.
 */

import { describe, expect, it, vi } from "vitest";
import { IPC_CHANNELS } from "../../../src/common/ipc-contracts";
import { createPreloadElectronHarness, loadPreloadApi } from "../../helpers/preload-test-harness";

const electronHarness = createPreloadElectronHarness();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fire the Nth listener registered via ipcRenderer.on (0-indexed). */
function fireListener(
  harness: ReturnType<typeof createPreloadElectronHarness>,
  callIndex: number,
  data: unknown,
) {
  const listener = harness.on.mock.calls[callIndex][1] as (_event: unknown, value: unknown) => void;
  listener(null, data);
}

/** Return the Nth listener registered via ipcRenderer.on (0-indexed). */
function captureListener(
  harness: ReturnType<typeof createPreloadElectronHarness>,
  callIndex: number,
) {
  return harness.on.mock.calls[callIndex][1];
}

// ---------------------------------------------------------------------------
// Full API shape
// ---------------------------------------------------------------------------

describe("preload IPC bridge – full API shape", () => {
  it("exposes all grouped namespaces and every legacy flat alias", async () => {
    const api = await loadPreloadApi(electronHarness);

    expect(electronHarness.exposeInMainWorld).toHaveBeenCalledWith(
      "ipcToMain",
      expect.objectContaining({
        // grouped namespaces
        messages: expect.objectContaining({
          console: expect.any(Function),
          log: expect.any(Function),
          error: expect.any(Function),
          debug: expect.any(Function),
          html: expect.any(Function),
        }),
        notifications: expect.objectContaining({
          connectionStatus: expect.any(Function),
          render: expect.any(Function),
          themeChanged: expect.any(Function),
        }),
        debuggerData: expect.objectContaining({
          registers: expect.any(Function),
          stackFrames: expect.any(Function),
          sourceFile: expect.any(Function),
          locals: expect.any(Function),
          threads: expect.any(Function),
          breakpoints: expect.any(Function),
          memory: expect.any(Function),
          disassembly: expect.any(Function),
          functions: expect.any(Function),
        }),
        queries: expect.objectContaining({
          app: expect.objectContaining({
            getSettings: expect.any(Function),
            getSystemFonts: expect.any(Function),
            getVersionInfo: expect.any(Function),
          }),
          environment: expect.objectContaining({
            getWslDistrobutions: expect.any(Function),
          }),
          debugger: expect.objectContaining({
            getFunctionNames: expect.any(Function),
            queryVarAtPosition: expect.any(Function),
            getVarByName: expect.any(Function),
            evaluateExpression: expect.any(Function),
            getSectionData: expect.any(Function),
          }),
        }),
        commands: expect.objectContaining({
          debugger: expect.objectContaining({ sendGdbCommand: expect.any(Function) }),
          app: expect.objectContaining({ notifyMain: expect.any(Function) }),
        }),
        // legacy flat aliases – messages
        consoleMessage: expect.any(Function),
        logMessage: expect.any(Function),
        errorMessage: expect.any(Function),
        debugMessage: expect.any(Function),
        htmlMessage: expect.any(Function),
        // legacy flat aliases – notifications
        connectionStatus: expect.any(Function),
        notifyRender: expect.any(Function),
        // legacy flat aliases – debuggerData
        dataRegisters: expect.any(Function),
        stackFrames: expect.any(Function),
        sourceFile: expect.any(Function),
        dataLocals: expect.any(Function),
        dataThreads: expect.any(Function),
        dataBrkPts: expect.any(Function),
        dataMemory: expect.any(Function),
        dataDisasm: expect.any(Function),
        dataFunctions: expect.any(Function),
        // legacy flat aliases – queries
        getSettings: expect.any(Function),
        getSystemFonts: expect.any(Function),
        getVersionInfo: expect.any(Function),
        getWslDistrobutions: expect.any(Function),
        getFunctionNames: expect.any(Function),
        // legacy flat aliases – commands
        sendGdbCommand: expect.any(Function),
        notifyMain: expect.any(Function),
      }),
    );

    expect(api).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// messages group subscriptions
// ---------------------------------------------------------------------------

describe("messages group – subscribe", () => {
  const messageCases = [
    ["console", IPC_CHANNELS.mainToRenderer.console.message],
    ["log", IPC_CHANNELS.mainToRenderer.console.log],
    ["error", IPC_CHANNELS.mainToRenderer.console.error],
    ["debug", IPC_CHANNELS.mainToRenderer.console.debug],
    ["html", IPC_CHANNELS.mainToRenderer.console.html],
  ] as const;

  it.each(messageCases)("messages.%s registers on the correct channel", async (method, channel) => {
    const api = await loadPreloadApi(electronHarness);
    api.messages[method](vi.fn());
    expect(electronHarness.on).toHaveBeenCalledWith(channel, expect.any(Function));
  });

  it.each(messageCases)("messages.%s forwards data to callback", async (method, _channel) => {
    const api = await loadPreloadApi(electronHarness);
    const cb = vi.fn();
    api.messages[method](cb);
    fireListener(electronHarness, 0, "test-string");
    expect(cb).toHaveBeenCalledWith("test-string");
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it.each(messageCases)(
    "messages.%s unsubscribe removes the correct listener",
    async (method, channel) => {
      const api = await loadPreloadApi(electronHarness);
      const unsub = api.messages[method](vi.fn());
      const listener = captureListener(electronHarness, 0);
      unsub();
      expect(electronHarness.removeListener).toHaveBeenCalledWith(channel, listener);
    },
  );

  it("multiple messages.console subscriptions each get their own listener", async () => {
    const api = await loadPreloadApi(electronHarness);
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    api.messages.console(cb1);
    api.messages.console(cb2);
    expect(electronHarness.on).toHaveBeenCalledTimes(2);
    fireListener(electronHarness, 0, "for-cb1");
    fireListener(electronHarness, 1, "for-cb2");
    expect(cb1).toHaveBeenCalledWith("for-cb1");
    expect(cb2).toHaveBeenCalledWith("for-cb2");
  });
});

// ---------------------------------------------------------------------------
// notifications group subscriptions
// ---------------------------------------------------------------------------

describe("notifications group – subscribe", () => {
  it("notifications.connectionStatus registers on the correct channel", async () => {
    const api = await loadPreloadApi(electronHarness);
    api.notifications.connectionStatus(vi.fn());
    expect(electronHarness.on).toHaveBeenCalledWith(
      IPC_CHANNELS.mainToRenderer.notifications.connectionStatus,
      expect.any(Function),
    );
  });

  it("notifications.connectionStatus forwards data to callback", async () => {
    const api = await loadPreloadApi(electronHarness);
    const cb = vi.fn();
    const payload = ["console-capture", { error: false, line: "hello" }] as const;
    api.notifications.connectionStatus(cb);
    fireListener(electronHarness, 0, payload);
    expect(cb).toHaveBeenCalledWith(payload);
  });

  it("notifications.connectionStatus unsubscribe removes listener", async () => {
    const api = await loadPreloadApi(electronHarness);
    const unsub = api.notifications.connectionStatus(vi.fn());
    const listener = captureListener(electronHarness, 0);
    unsub();
    expect(electronHarness.removeListener).toHaveBeenCalledWith(
      IPC_CHANNELS.mainToRenderer.notifications.connectionStatus,
      listener,
    );
  });

  it("notifications.render registers on the correct channel", async () => {
    const api = await loadPreloadApi(electronHarness);
    api.notifications.render(vi.fn());
    expect(electronHarness.on).toHaveBeenCalledWith(
      IPC_CHANNELS.mainToRenderer.notifications.render,
      expect.any(Function),
    );
  });

  it("notifications.render forwards data to callback", async () => {
    const api = await loadPreloadApi(electronHarness);
    const cb = vi.fn();
    const payload = { command: "renderEnd" };
    api.notifications.render(cb);
    fireListener(electronHarness, 0, payload);
    expect(cb).toHaveBeenCalledWith(payload);
  });

  it("notifications.render unsubscribe removes listener", async () => {
    const api = await loadPreloadApi(electronHarness);
    const unsub = api.notifications.render(vi.fn());
    const listener = captureListener(electronHarness, 0);
    unsub();
    expect(electronHarness.removeListener).toHaveBeenCalledWith(
      IPC_CHANNELS.mainToRenderer.notifications.render,
      listener,
    );
  });

  it("notifications.themeChanged registers on the correct channel", async () => {
    const api = await loadPreloadApi(electronHarness);
    api.notifications.themeChanged(vi.fn());
    expect(electronHarness.on).toHaveBeenCalledWith(
      IPC_CHANNELS.mainToRenderer.notifications.themeChanged,
      expect.any(Function),
    );
  });

  it("notifications.themeChanged forwards data to callback", async () => {
    const api = await loadPreloadApi(electronHarness);
    const cb = vi.fn();
    const payload = { shouldUseDarkColors: true };
    api.notifications.themeChanged(cb);
    fireListener(electronHarness, 0, payload);
    expect(cb).toHaveBeenCalledWith(payload);
  });

  it("notifications.themeChanged unsubscribe removes listener", async () => {
    const api = await loadPreloadApi(electronHarness);
    const unsub = api.notifications.themeChanged(vi.fn());
    const listener = captureListener(electronHarness, 0);
    unsub();
    expect(electronHarness.removeListener).toHaveBeenCalledWith(
      IPC_CHANNELS.mainToRenderer.notifications.themeChanged,
      listener,
    );
  });
});

// ---------------------------------------------------------------------------
// debuggerData group subscriptions
// ---------------------------------------------------------------------------

describe("debuggerData group – subscribe", () => {
  const dataCases = [
    ["registers", IPC_CHANNELS.mainToRenderer.debuggerData.registers],
    ["stackFrames", IPC_CHANNELS.mainToRenderer.debuggerData.stackFrames],
    ["sourceFile", IPC_CHANNELS.mainToRenderer.debuggerData.sourceFile],
    ["locals", IPC_CHANNELS.mainToRenderer.debuggerData.locals],
    ["threads", IPC_CHANNELS.mainToRenderer.debuggerData.threads],
    ["breakpoints", IPC_CHANNELS.mainToRenderer.debuggerData.breakpoints],
    ["memory", IPC_CHANNELS.mainToRenderer.debuggerData.memory],
    ["disassembly", IPC_CHANNELS.mainToRenderer.debuggerData.disassembly],
    ["functions", IPC_CHANNELS.mainToRenderer.debuggerData.functions],
  ] as const;

  it.each(dataCases)(
    "debuggerData.%s registers on the correct channel",
    async (method, channel) => {
      const api = await loadPreloadApi(electronHarness);
      api.debuggerData[method](vi.fn() as never);
      expect(electronHarness.on).toHaveBeenCalledWith(channel, expect.any(Function));
    },
  );

  it.each(dataCases)("debuggerData.%s forwards data to callback", async (method, _channel) => {
    const api = await loadPreloadApi(electronHarness);
    const cb = vi.fn();
    api.debuggerData[method](cb as never);
    const sampleData = { value: `data-for-${method}` };
    fireListener(electronHarness, 0, sampleData);
    expect(cb).toHaveBeenCalledWith(sampleData);
  });

  it.each(dataCases)("debuggerData.%s unsubscribe removes listener", async (method, channel) => {
    const api = await loadPreloadApi(electronHarness);
    const unsub = api.debuggerData[method](vi.fn() as never);
    const listener = captureListener(electronHarness, 0);
    unsub();
    expect(electronHarness.removeListener).toHaveBeenCalledWith(channel, listener);
  });
});

// ---------------------------------------------------------------------------
// queries group – invoke calls
// ---------------------------------------------------------------------------

describe("queries.app – invoke", () => {
  it("getSettings invokes the correct channel", async () => {
    const api = await loadPreloadApi(electronHarness);
    api.queries.app.getSettings();
    expect(electronHarness.invoke).toHaveBeenCalledWith(
      IPC_CHANNELS.rendererToMain.queries.app.settings,
    );
  });

  it("getSystemFonts invokes the correct channel", async () => {
    const api = await loadPreloadApi(electronHarness);
    api.queries.app.getSystemFonts();
    expect(electronHarness.invoke).toHaveBeenCalledWith(
      IPC_CHANNELS.rendererToMain.queries.app.systemFonts,
    );
  });

  it("getVersionInfo invokes the correct channel", async () => {
    const api = await loadPreloadApi(electronHarness);
    api.queries.app.getVersionInfo();
    expect(electronHarness.invoke).toHaveBeenCalledWith(
      IPC_CHANNELS.rendererToMain.queries.app.versionInfo,
    );
  });
});

describe("queries.environment – invoke", () => {
  it("getWslDistrobutions invokes the correct channel", async () => {
    const api = await loadPreloadApi(electronHarness);
    api.queries.environment.getWslDistrobutions();
    expect(electronHarness.invoke).toHaveBeenCalledWith(
      IPC_CHANNELS.rendererToMain.queries.environment.wslDistributions,
    );
  });
});

describe("queries.debugger – invoke", () => {
  it("getFunctionNames invokes the correct channel", async () => {
    const api = await loadPreloadApi(electronHarness);
    api.queries.debugger.getFunctionNames();
    expect(electronHarness.invoke).toHaveBeenCalledWith(
      IPC_CHANNELS.rendererToMain.queries.debugger.functionNames,
    );
  });

  it("queryVarAtPosition invokes the correct channel with all arguments", async () => {
    const api = await loadPreloadApi(electronHarness);
    api.queries.debugger.queryVarAtPosition("/src/main.c", 42, 7);
    expect(electronHarness.invoke).toHaveBeenCalledWith(
      IPC_CHANNELS.rendererToMain.queries.debugger.varAtPosition,
      "/src/main.c",
      42,
      7,
    );
  });

  it("getVarByName invokes the correct channel with all arguments", async () => {
    const api = await loadPreloadApi(electronHarness);
    api.queries.debugger.getVarByName("/src/main.c", "myVar");
    expect(electronHarness.invoke).toHaveBeenCalledWith(
      IPC_CHANNELS.rendererToMain.queries.debugger.varByName,
      "/src/main.c",
      "myVar",
    );
  });

  it("evaluateExpression invokes the correct channel with the expression", async () => {
    const api = await loadPreloadApi(electronHarness);
    api.queries.debugger.evaluateExpression("*ptr + 1");
    expect(electronHarness.invoke).toHaveBeenCalledWith(
      IPC_CHANNELS.rendererToMain.queries.debugger.evaluateExpression,
      "*ptr + 1",
    );
  });

  it("getSectionData invokes the correct channel", async () => {
    const api = await loadPreloadApi(electronHarness);
    api.queries.debugger.getSectionData();
    expect(electronHarness.invoke).toHaveBeenCalledWith(
      IPC_CHANNELS.rendererToMain.queries.debugger.sections,
    );
  });

  it("queryVarAtPosition returns the promise from ipcRenderer.invoke", async () => {
    const api = await loadPreloadApi(electronHarness);
    const expected = { name: "x", value: "5" };
    electronHarness.invoke.mockResolvedValueOnce(expected);
    const result = await api.queries.debugger.queryVarAtPosition("/a.c", 1, 0);
    expect(result).toBe(expected);
  });

  it("getVarByName returns the promise from ipcRenderer.invoke", async () => {
    const api = await loadPreloadApi(electronHarness);
    const expected = { name: "count", value: "42" };
    electronHarness.invoke.mockResolvedValueOnce(expected);
    const result = await api.queries.debugger.getVarByName("/a.c", "count");
    expect(result).toBe(expected);
  });

  it("evaluateExpression returns the promise from ipcRenderer.invoke", async () => {
    const api = await loadPreloadApi(electronHarness);
    electronHarness.invoke.mockResolvedValueOnce("99");
    const result = await api.queries.debugger.evaluateExpression("x + 1");
    expect(result).toBe("99");
  });
});

// ---------------------------------------------------------------------------
// commands group – send calls
// ---------------------------------------------------------------------------

describe("commands group – send", () => {
  it("sendGdbCommand sends to the correct channel with the command string", async () => {
    const api = await loadPreloadApi(electronHarness);
    api.commands.debugger.sendGdbCommand("next");
    expect(electronHarness.invoke).toHaveBeenCalledWith(
      IPC_CHANNELS.rendererToMain.commands.debugger.send,
      "next",
    );
  });

  it("sendGdbCommand passes the exact command string provided", async () => {
    const api = await loadPreloadApi(electronHarness);
    api.commands.debugger.sendGdbCommand("-exec-continue --all");
    expect(electronHarness.invoke).toHaveBeenCalledWith(
      IPC_CHANNELS.rendererToMain.commands.debugger.send,
      "-exec-continue --all",
    );
  });

  it("notifyMain sends to the correct channel with the request object", async () => {
    const api = await loadPreloadApi(electronHarness);
    api.commands.app.notifyMain({ command: "renderEnd" });
    expect(electronHarness.send).toHaveBeenCalledWith(
      IPC_CHANNELS.rendererToMain.commands.app.notify,
      { command: "renderEnd" },
    );
  });

  it("notifyMain sends the exact request object provided", async () => {
    const api = await loadPreloadApi(electronHarness);
    api.commands.app.notifyMain({ command: "renderStart" });
    expect(electronHarness.send).toHaveBeenCalledWith(
      IPC_CHANNELS.rendererToMain.commands.app.notify,
      { command: "renderStart" },
    );
  });
});

// ---------------------------------------------------------------------------
// Legacy flat API aliases
// ---------------------------------------------------------------------------

describe("legacy flat API – message aliases", () => {
  const legacyMessageCases = [
    ["consoleMessage", IPC_CHANNELS.mainToRenderer.console.message],
    ["logMessage", IPC_CHANNELS.mainToRenderer.console.log],
    ["errorMessage", IPC_CHANNELS.mainToRenderer.console.error],
    ["debugMessage", IPC_CHANNELS.mainToRenderer.console.debug],
    ["htmlMessage", IPC_CHANNELS.mainToRenderer.console.html],
  ] as const;

  it.each(legacyMessageCases)("api.%s registers on channel %s", async (method, channel) => {
    const api = await loadPreloadApi(electronHarness);
    (api[method] as (cb: (v: string) => void) => void)(vi.fn());
    expect(electronHarness.on).toHaveBeenCalledWith(channel, expect.any(Function));
  });

  it.each(legacyMessageCases)("api.%s forwards data to callback", async (method, _channel) => {
    const api = await loadPreloadApi(electronHarness);
    const cb = vi.fn();
    (api[method] as (cb: (v: string) => void) => void)(cb);
    fireListener(electronHarness, 0, "legacy-data");
    expect(cb).toHaveBeenCalledWith("legacy-data");
  });

  it.each(legacyMessageCases)("api.%s unsubscribe removes listener", async (method, channel) => {
    const api = await loadPreloadApi(electronHarness);
/**
 * Performs unsub as part of this module's internal workflow.
 *
 * @param api[method] as (cb - api[method] as (cb parameter.
 * @returns The computed result produced by this operation.
 */
    const unsub = (api[method] as (cb: (v: string) => void) => () => void)(vi.fn());
    const listener = captureListener(electronHarness, 0);
    unsub();
    expect(electronHarness.removeListener).toHaveBeenCalledWith(channel, listener);
  });
});

describe("legacy flat API – notification aliases", () => {
  it("api.connectionStatus registers on the correct channel", async () => {
    const api = await loadPreloadApi(electronHarness);
    api.connectionStatus(vi.fn());
    expect(electronHarness.on).toHaveBeenCalledWith(
      IPC_CHANNELS.mainToRenderer.notifications.connectionStatus,
      expect.any(Function),
    );
  });

  it("api.notifyRender registers on the correct channel", async () => {
    const api = await loadPreloadApi(electronHarness);
    api.notifyRender(vi.fn());
    expect(electronHarness.on).toHaveBeenCalledWith(
      IPC_CHANNELS.mainToRenderer.notifications.render,
      expect.any(Function),
    );
  });
});

describe("legacy flat API – debuggerData aliases", () => {
  const legacyDataCases = [
    ["dataRegisters", IPC_CHANNELS.mainToRenderer.debuggerData.registers],
    ["stackFrames", IPC_CHANNELS.mainToRenderer.debuggerData.stackFrames],
    ["sourceFile", IPC_CHANNELS.mainToRenderer.debuggerData.sourceFile],
    ["dataLocals", IPC_CHANNELS.mainToRenderer.debuggerData.locals],
    ["dataThreads", IPC_CHANNELS.mainToRenderer.debuggerData.threads],
    ["dataBrkPts", IPC_CHANNELS.mainToRenderer.debuggerData.breakpoints],
    ["dataMemory", IPC_CHANNELS.mainToRenderer.debuggerData.memory],
    ["dataDisasm", IPC_CHANNELS.mainToRenderer.debuggerData.disassembly],
    ["dataFunctions", IPC_CHANNELS.mainToRenderer.debuggerData.functions],
  ] as const;

  it.each(legacyDataCases)("api.%s registers on channel %s", async (method, channel) => {
    const api = await loadPreloadApi(electronHarness);
    (api[method] as (cb: (v: unknown) => void) => void)(vi.fn());
    expect(electronHarness.on).toHaveBeenCalledWith(channel, expect.any(Function));
  });

  it.each(legacyDataCases)("api.%s forwards data to callback", async (method, _channel) => {
    const api = await loadPreloadApi(electronHarness);
    const cb = vi.fn();
    (api[method] as (cb: (v: unknown) => void) => void)(cb);
    const sampleData = { key: method };
    fireListener(electronHarness, 0, sampleData);
    expect(cb).toHaveBeenCalledWith(sampleData);
  });
});

describe("legacy flat API – query aliases", () => {
  it("api.getSettings routes to the same channel as queries.app.getSettings", async () => {
    const api = await loadPreloadApi(electronHarness);
    api.getSettings();
    api.queries.app.getSettings();
    expect(electronHarness.invoke).toHaveBeenNthCalledWith(
      1,
      IPC_CHANNELS.rendererToMain.queries.app.settings,
    );
    expect(electronHarness.invoke).toHaveBeenNthCalledWith(
      2,
      IPC_CHANNELS.rendererToMain.queries.app.settings,
    );
  });

  it("api.getSystemFonts invokes the correct channel", async () => {
    const api = await loadPreloadApi(electronHarness);
    api.getSystemFonts();
    expect(electronHarness.invoke).toHaveBeenCalledWith(
      IPC_CHANNELS.rendererToMain.queries.app.systemFonts,
    );
  });

  it("api.getVersionInfo invokes the correct channel", async () => {
    const api = await loadPreloadApi(electronHarness);
    api.getVersionInfo();
    expect(electronHarness.invoke).toHaveBeenCalledWith(
      IPC_CHANNELS.rendererToMain.queries.app.versionInfo,
    );
  });

  it("api.getWslDistrobutions routes to the same channel as queries.environment.getWslDistrobutions", async () => {
    const api = await loadPreloadApi(electronHarness);
    api.getWslDistrobutions();
    api.queries.environment.getWslDistrobutions();
    expect(electronHarness.invoke).toHaveBeenNthCalledWith(
      1,
      IPC_CHANNELS.rendererToMain.queries.environment.wslDistributions,
    );
    expect(electronHarness.invoke).toHaveBeenNthCalledWith(
      2,
      IPC_CHANNELS.rendererToMain.queries.environment.wslDistributions,
    );
  });

  it("api.getFunctionNames routes to the same channel as queries.debugger.getFunctionNames", async () => {
    const api = await loadPreloadApi(electronHarness);
    api.getFunctionNames();
    api.queries.debugger.getFunctionNames();
    expect(electronHarness.invoke).toHaveBeenNthCalledWith(
      1,
      IPC_CHANNELS.rendererToMain.queries.debugger.functionNames,
    );
    expect(electronHarness.invoke).toHaveBeenNthCalledWith(
      2,
      IPC_CHANNELS.rendererToMain.queries.debugger.functionNames,
    );
  });
});

describe("legacy flat API – command aliases", () => {
  it("api.sendGdbCommand routes to the same channel as commands.debugger.sendGdbCommand", async () => {
    const api = await loadPreloadApi(electronHarness);
    api.sendGdbCommand("step");
    api.commands.debugger.sendGdbCommand("step");
    expect(electronHarness.invoke).toHaveBeenNthCalledWith(
      1,
      IPC_CHANNELS.rendererToMain.commands.debugger.send,
      "step",
    );
    expect(electronHarness.invoke).toHaveBeenNthCalledWith(
      2,
      IPC_CHANNELS.rendererToMain.commands.debugger.send,
      "step",
    );
  });

  it("api.notifyMain routes to the same channel as commands.app.notifyMain", async () => {
    const api = await loadPreloadApi(electronHarness);
    api.notifyMain({ command: "renderEnd" });
    api.commands.app.notifyMain({ command: "renderEnd" });
    expect(electronHarness.send).toHaveBeenNthCalledWith(
      1,
      IPC_CHANNELS.rendererToMain.commands.app.notify,
      { command: "renderEnd" },
    );
    expect(electronHarness.send).toHaveBeenNthCalledWith(
      2,
      IPC_CHANNELS.rendererToMain.commands.app.notify,
      { command: "renderEnd" },
    );
  });
});

// ---------------------------------------------------------------------------
// Cross-cutting: listener isolation
// ---------------------------------------------------------------------------

describe("listener isolation", () => {
  it("unsubscribing one callback does not affect another on the same channel", async () => {
    const api = await loadPreloadApi(electronHarness);
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    api.messages.console(cb1);
    const unsub2 = api.messages.console(cb2);

    // Unsubscribe the second listener only
    unsub2();

    // Only the second listener should have been removed
    const listener1 = captureListener(electronHarness, 0);
    const listener2 = captureListener(electronHarness, 1);
    expect(electronHarness.removeListener).toHaveBeenCalledWith(
      IPC_CHANNELS.mainToRenderer.console.message,
      listener2,
    );
    expect(electronHarness.removeListener).not.toHaveBeenCalledWith(
      IPC_CHANNELS.mainToRenderer.console.message,
      listener1,
    );
  });

  it("unsubscribing twice does not throw", async () => {
    const api = await loadPreloadApi(electronHarness);
    const unsub = api.messages.log(vi.fn());
    expect(() => {
      unsub();
      unsub();
    }).not.toThrow();
  });

  it("each subscribe call produces a distinct listener wrapper", async () => {
    const api = await loadPreloadApi(electronHarness);
    api.messages.error(vi.fn());
    api.messages.error(vi.fn());
    const listener1 = captureListener(electronHarness, 0);
    const listener2 = captureListener(electronHarness, 1);
    expect(listener1).not.toBe(listener2);
  });

  it("callback does not receive the Electron IpcRendererEvent argument", async () => {
    const api = await loadPreloadApi(electronHarness);
    const cb = vi.fn();
    api.messages.debug(cb);
    const fakeEvent = { sender: "renderer" };
    fireListener(electronHarness, 0, "payload");
    // The listener wrapper strips the event; callback should only see value
    expect(cb).toHaveBeenCalledWith("payload");
    expect(cb).not.toHaveBeenCalledWith(fakeEvent, "payload");
  });
});

// ---------------------------------------------------------------------------
// contextBridge – registration
// ---------------------------------------------------------------------------

describe("contextBridge registration", () => {
  it("exposes the API under the name 'ipcToMain'", async () => {
    await loadPreloadApi(electronHarness);
    expect(electronHarness.exposeInMainWorld).toHaveBeenCalledTimes(1);
    expect(electronHarness.exposeInMainWorld.mock.calls[0][0]).toBe("ipcToMain");
  });

  it("exposes exactly one world (called once)", async () => {
    await loadPreloadApi(electronHarness);
    expect(electronHarness.exposeInMainWorld).toHaveBeenCalledTimes(1);
  });
});
