import { describe, expect, it, vi } from "vitest";
import { StateLifecycleCoordinator } from "../../../../../../src/main/mi-interface/gdb-state-database/orchestration/StateLifecycleCoordinator";

function createCoordinator() {
  const notifier = {
    sendSourceFile: vi.fn(),
  };
  const localsStore = { clearLocals: vi.fn(), getLocals: vi.fn().mockReturnValue(null) };
  const threadGroupStore = { clear: vi.fn(), threadGroups: [] };
  const threadStore = { clearThreadList: vi.fn(), threads: [] };
  const registerStore = { clear: vi.fn(), registers: [] };
  const featureStore = {
    clear: vi.fn(),
    features: new Map([["async", { feature: "async", available: true }]]),
  };
  const paramStore = { clear: vi.fn(), params: [] };
  const breakpointStore = { clear: vi.fn(), breakpoints: [] };
  const stackFrameStore = { clear: vi.fn(), stackFrames: [] };
  const sourceFileStore = {
    clearCache: vi.fn(),
    gdbSrcFileCache: { dump: vi.fn(() => ["main.c"]) },
  };
  const symbolStore = { clear: vi.fn(), symbolFiles: { mainSym: "", sections: [] } };
  const functionStore = { clear: vi.fn(), functionNames: new Map() };

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

    const lines = coordinator.dump();

    expect(sourceFileStore.gdbSrcFileCache.dump).toHaveBeenCalledTimes(1);
    expect(lines).toContain("Features:");
    expect(lines).toContain("Function Names:");
    expect(lines.some((l) => l.includes("async"))).toBe(true);
    expect(lines).toContain("Source Files:");
  });

  it("dumps 'unavailable' when a feature has available = false", () => {
    const { coordinator, featureStore } = createCoordinator();
    featureStore.features.set("async", { feature: "async", available: false });

    const lines = coordinator.dump();

    expect(lines.some((l) => l.includes("unavailable"))).toBe(true);
  });

  it("dumps locals entries when getLocals returns data", () => {
    const { coordinator, localsStore } = createCoordinator();
    localsStore.getLocals.mockReturnValue({
      locals: [{ name: "myVar", value: "99" }],
    });

    const lines = coordinator.dump();

    expect(lines.some((l) => l.includes("myVar"))).toBe(true);
  });

  it("dumps section with file annotation when section has a file", () => {
    const { coordinator, symbolStore } = createCoordinator();
    symbolStore.symbolFiles.sections = [
      { section: ".text", startAddr: "0x0", endAddr: "0x100", file: "main.elf" },
    ];

    const lines = coordinator.dump();

    expect(lines.some((l) => l.includes("(file: main.elf)"))).toBe(true);
  });

  it("dumps section without file annotation when section file is empty", () => {
    const { coordinator, symbolStore } = createCoordinator();
    symbolStore.symbolFiles.sections = [
      { section: ".data", startAddr: "0x200", endAddr: "0x300", file: "" },
    ];

    const lines = coordinator.dump();

    expect(lines.some((l) => l.includes(".data"))).toBe(true);
    expect(lines.every((l) => !l.includes("(file:"))).toBe(true);
  });
});
