import { describe, expect, it, vi } from "vitest";

const ipcIndexMocks = vi.hoisted(() => ({
  registerIpcCommandHandlers: vi.fn(),
  registerIpcQueryHandlers: vi.fn(),
}));

vi.mock("../../../../src/main/ipc/commands", () => ({
  registerIpcCommandHandlers: ipcIndexMocks.registerIpcCommandHandlers,
}));

vi.mock("../../../../src/main/ipc/queries", () => ({
  registerIpcQueryHandlers: ipcIndexMocks.registerIpcQueryHandlers,
}));

import { registerIpcHandlers } from "../../../../src/main/ipc";

describe("registerIpcHandlers", () => {
  it("registers query handlers before command handlers", () => {
    const context = { ipcMain: {}, appSettings: {} } as never;

    registerIpcHandlers(context);

    expect(ipcIndexMocks.registerIpcQueryHandlers).toHaveBeenCalledWith(context);
    expect(ipcIndexMocks.registerIpcCommandHandlers).toHaveBeenCalledWith(context);
    expect(ipcIndexMocks.registerIpcQueryHandlers.mock.invocationCallOrder[0]).toBeLessThan(
      ipcIndexMocks.registerIpcCommandHandlers.mock.invocationCallOrder[0],
    );
  });
});
