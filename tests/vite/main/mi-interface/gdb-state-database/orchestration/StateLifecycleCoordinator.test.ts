import { describe, expect, it, vi } from "vitest";
import { StateLifecycleCoordinator } from "../../../../../../src/main/mi-interface/gdb-state-database/orchestration/StateLifecycleCoordinator";

function createCoordinator() {
  const notifier = {
    sendSourceFile: vi.fn(),
  };
  const localsStore = { clearLocals: vi.fn() };
  const threadGroupStore = { clear: vi.fn(), threadGroups: ["tg"] };
  const threadStore = { clearThreadList: vi.fn(), threads: ["thread"] };
  const registerStore = { clear: vi.fn(), registers: ["r0"] };
  const featureStore = { clear: vi.fn(), features: ["async"] };
  const paramStore = { clear: vi.fn(), params: ["pagination"] };
  const breakpointStore = { clear: vi.fn(), breakpoints: [1] };
  const stackFrameStore = { clear: vi.fn(), stackFrames: ["frame"] };
  const sourceFileStore = {
    clearCache: vi.fn(),
    gdbSrcFileCache: { dump: vi.fn(() => ["main.c"]) },
  };
  const symbolStore = { clear: vi.fn(), symbolFiles: ["app.elf"] };
  const functionStore = { clear: vi.fn(), functionNames: ["main"] };

  return {
    coordinator: new StateLifecycleCoordinator(
      notifier as never,
      localsStore as never,
      threadGroupStore as never,
      threadStore as never,
      registerStore as never,
      featureStore as never,
      paramStore as never,
      breakpointStore as never,
      stackFrameStore as never,
      sourceFileStore as never,
      symbolStore as never,
      functionStore as never,
    ),
    notifier,
    localsStore,
    threadGroupStore,
    threadStore,
    registerStore,
    featureStore,
    paramStore,
    breakpointStore,
    stackFrameStore,
    sourceFileStore,
    symbolStore,
    functionStore,
  };
}

describe("StateLifecycleCoordinator", () => {
  it("clears source files by sending a blank source info payload", () => {
    const { coordinator, notifier } = createCoordinator();

    coordinator.clearSourceFiles();

    expect(notifier.sendSourceFile).toHaveBeenCalledWith({
      fileName: " ",
      line: "0",
      contents: " ",
    });
  });

  it("clears all managed state stores and source info", () => {
    const stores = createCoordinator();

    stores.coordinator.clearDatabase();

    expect(stores.threadGroupStore.clear).toHaveBeenCalledTimes(1);
    expect(stores.threadStore.clearThreadList).toHaveBeenCalledTimes(1);
    expect(stores.registerStore.clear).toHaveBeenCalledTimes(1);
    expect(stores.featureStore.clear).toHaveBeenCalledTimes(1);
    expect(stores.paramStore.clear).toHaveBeenCalledTimes(1);
    expect(stores.breakpointStore.clear).toHaveBeenCalledTimes(1);
    expect(stores.stackFrameStore.clear).toHaveBeenCalledTimes(1);
    expect(stores.sourceFileStore.clearCache).toHaveBeenCalledTimes(1);
    expect(stores.symbolStore.clear).toHaveBeenCalledTimes(1);
    expect(stores.functionStore.clear).toHaveBeenCalledTimes(1);
    expect(stores.localsStore.clearLocals).toHaveBeenCalledTimes(1);
    expect(stores.notifier.sendSourceFile).toHaveBeenCalledTimes(1);
  });

  it("dumps current state to the console", () => {
    const { coordinator, sourceFileStore } = createCoordinator();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    coordinator.dump();

    expect(sourceFileStore.gdbSrcFileCache.dump).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith("GDB State Database");
    expect(logSpy).toHaveBeenCalledWith("Features:");
    expect(logSpy).toHaveBeenCalledWith(["async"]);
    expect(logSpy).toHaveBeenCalledWith("Function Names:");
    expect(logSpy).toHaveBeenCalledWith(["main"]);

    logSpy.mockRestore();
  });
});
