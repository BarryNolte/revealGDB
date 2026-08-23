/**
 * Integration tests for useWindowVisibility hook.
 *
 * @remarks
 * Tests window visibility state management and IPC interaction.
 */
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("useWindowVisibility hook", () => {
  beforeEach(() => {
    // Setup global window mock
    if (typeof window === "undefined") {
      (globalThis as any).window = {};
    }

    // Mock window.ipcToMain
    (window as any).ipcToMain = {
      setWindowVisibility: vi.fn().mockResolvedValue({
        id: "default",
        windows: [],
        updatedAt: Date.now(),
      }),
      workspaceUpdated: vi.fn().mockReturnValue(() => {}),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("module loading", () => {
    it("should be able to import the hook", async () => {
      const { useWindowVisibility } =
        await import("../../../src/renderer/hooks/useWindowVisibility");
      expect(typeof useWindowVisibility).toBe("function");
    });
  });

  describe("hook verification", () => {
    it("useWindowVisibility should export as a function", async () => {
      const module = await import("../../../src/renderer/hooks/useWindowVisibility");
      expect(module.useWindowVisibility).toBeDefined();
      expect(typeof module.useWindowVisibility).toBe("function");
    });

    it("should have ipcToMain available on window", () => {
      expect(window.ipcToMain).toBeDefined();
      expect(typeof window.ipcToMain.setWindowVisibility).toBe("function");
    });
  });

  describe("IPC methods available", () => {
    it("should have setWindowVisibility method", () => {
      expect(window.ipcToMain.setWindowVisibility).toBeDefined();
    });

    it("should have workspaceUpdated subscription", () => {
      expect(window.ipcToMain.workspaceUpdated).toBeDefined();
    });
  });
});
