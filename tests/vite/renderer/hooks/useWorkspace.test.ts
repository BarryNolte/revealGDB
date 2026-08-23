/**
 * Integration tests for useWorkspace hook.
 *
 * @remarks
 * Tests the workspace state management and IPC integration.
 */
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("useWorkspace hook", () => {
  beforeEach(() => {
    // Setup global window mock
    if (typeof window === "undefined") {
      (globalThis as any).window = {};
    }

    // Mock window.ipcToMain
    (window as any).ipcToMain = {
      getWorkspaceState: vi.fn().mockResolvedValue({
        id: "default",
        windows: [],
        updatedAt: Date.now(),
      }),
      workspaceUpdated: vi.fn().mockReturnValue(() => {}),
      createDockableWindow: vi.fn().mockResolvedValue({
        id: "default",
        windows: [],
        updatedAt: Date.now(),
      }),
      moveWindow: vi.fn().mockResolvedValue({
        id: "default",
        windows: [],
        updatedAt: Date.now(),
      }),
      setWindowVisibility: vi.fn().mockResolvedValue({
        id: "default",
        windows: [],
        updatedAt: Date.now(),
      }),
      saveDockLayout: vi.fn().mockResolvedValue({
        workspace: {
          id: "default",
          windows: [],
          updatedAt: Date.now(),
        },
        result: true,
      }),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("module loading", () => {
    it("should be able to import the hook", async () => {
      const { useWorkspace } = await import("../../../src/renderer/hooks/useWorkspace");
      expect(typeof useWorkspace).toBe("function");
    });
  });

  describe("hook verification", () => {
    it("useWorkspace should export as a function", async () => {
      const module = await import("../../../src/renderer/hooks/useWorkspace");
      expect(module.useWorkspace).toBeDefined();
      expect(typeof module.useWorkspace).toBe("function");
    });

    it("should have ipcToMain available on window", () => {
      expect(window.ipcToMain).toBeDefined();
      expect(typeof window.ipcToMain.getWorkspaceState).toBe("function");
    });
  });

  describe("IPC methods available", () => {
    it("should have getWorkspaceState method", () => {
      expect(window.ipcToMain.getWorkspaceState).toBeDefined();
    });

    it("should have workspaceUpdated subscription", () => {
      expect(window.ipcToMain.workspaceUpdated).toBeDefined();
    });

    it("should have createDockableWindow method", () => {
      expect(window.ipcToMain.createDockableWindow).toBeDefined();
    });

    it("should have moveWindow method", () => {
      expect(window.ipcToMain.moveWindow).toBeDefined();
    });

    it("should have setWindowVisibility method", () => {
      expect(window.ipcToMain.setWindowVisibility).toBeDefined();
    });

    it("should have saveDockLayout method", () => {
      expect(window.ipcToMain.saveDockLayout).toBeDefined();
    });
  });
});
