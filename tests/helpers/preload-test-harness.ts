import { vi } from "vitest";

export function createPreloadElectronHarness() {
  const exposeInMainWorld = vi.fn();
  const on = vi.fn();
  const removeListener = vi.fn();
  const invoke = vi.fn();
  const send = vi.fn();

  return {
    exposeInMainWorld,
    on,
    removeListener,
    invoke,
    send,
    reset() {
      exposeInMainWorld.mockReset();
      on.mockReset();
      removeListener.mockReset();
      invoke.mockReset();
      send.mockReset();
    },
    moduleFactory() {
      return {
        contextBridge: {
          exposeInMainWorld,
        },
        ipcRenderer: {
          on,
          removeListener,
          invoke,
          send,
        },
      };
    },
  };
}

export async function loadPreloadApi(harness: ReturnType<typeof createPreloadElectronHarness>) {
  vi.resetModules();
  harness.reset();
  vi.doMock("electron", () => harness.moduleFactory());

  await import("../../src/preload/preload.js");

  return harness.exposeInMainWorld.mock.calls[0]?.[1];
}
