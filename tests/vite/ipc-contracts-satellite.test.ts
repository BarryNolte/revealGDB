import { describe, it, expect } from "vitest";
import type { NotifyMainRequest, NotifyMainPayloadMap } from "../src/common/ipc-contracts";
import type { SatelliteWindowsState } from "../src/common/satellite-window-types";

describe("IPC Contracts - Satellite Windows", () => {
  describe("NotifyMainCommand", () => {
    it("should include save-satellite-windows command", () => {
      const command = "save-satellite-windows";
      // This test verifies the command is recognized by TypeScript
      const request: Extract<NotifyMainRequest, { command: typeof command }> = {
        command: "save-satellite-windows",
        data: {
          windows: {},
          windowCounter: 0,
        },
      };
      expect(request.command).toBe("save-satellite-windows");
    });
  });

  describe("NotifyMainPayloadMap", () => {
    it("should map save-satellite-windows to SatelliteWindowsState", () => {
      // Verify the payload type is defined
      const payload: NotifyMainPayloadMap["save-satellite-windows"] = {
        windows: {},
        windowCounter: 0,
      };
      expect(payload).toBeDefined();
      expect(typeof payload).toBe("object");
    });

    it("should support complex satellite windows payload", () => {
      const payload: NotifyMainPayloadMap["save-satellite-windows"] = {
        windows: {
          "sat-1": {
            windowId: "sat-1",
            title: "Breakpoints",
            layout: { panels: ["bp"] },
            bounds: { x: 0, y: 0, width: 800, height: 600 },
            autoRestore: true,
            lastModified: Date.now(),
          },
        },
        windowCounter: 1,
      };
      expect(Object.keys(payload.windows)).toContain("sat-1");
    });
  });

  describe("NotifyMainRequest discriminated union", () => {
    it("should create valid request for save-satellite-windows", () => {
      const request: NotifyMainRequest = {
        command: "save-satellite-windows",
        data: {
          windows: {},
          windowCounter: 0,
        },
      };

      // Type guard: narrow down to specific command
      if (request.command === "save-satellite-windows") {
        expect(request.data).toBeDefined();
        expect(typeof (request.data as SatelliteWindowsState).windowCounter).toBe("number");
      }
    });

    it("should allow type-safe extraction", () => {
      const satelliteWindowRequest: Extract<
        NotifyMainRequest,
        { command: "save-satellite-windows" }
      > = {
        command: "save-satellite-windows",
        data: {
          windows: {
            "window-1": {
              windowId: "window-1",
              title: "Test",
              layout: {},
              bounds: { x: 0, y: 0, width: 800, height: 600 },
              autoRestore: true,
              lastModified: Date.now(),
            },
          },
          windowCounter: 1,
        },
      };

      expect(satelliteWindowRequest.command).toBe("save-satellite-windows");
    });

    it("should preserve other commands", () => {
      const docklayoutRequest: Extract<NotifyMainRequest, { command: "save-dock-layout" }> = {
        command: "save-dock-layout",
        data: { version: 1, panels: [] },
      };

      expect(docklayoutRequest.command).toBe("save-dock-layout");
    });
  });

  describe("Payload serialization", () => {
    it("should serialize satellite windows state to JSON", () => {
      const state: SatelliteWindowsState = {
        windows: {
          "sat-1": {
            windowId: "sat-1",
            title: "Memory Viewer",
            layout: { type: "memory", address: "0x1000" },
            bounds: { x: 100, y: 100, width: 900, height: 700 },
            autoRestore: true,
            lastModified: 1234567890,
          },
        },
        windowCounter: 5,
      };

      const json = JSON.stringify(state);
      const parsed = JSON.parse(json) as SatelliteWindowsState;

      expect(parsed.windows["sat-1"].windowId).toBe("sat-1");
      expect(parsed.windowCounter).toBe(5);
    });

    it("should handle payload in IPC message", () => {
      const request: NotifyMainRequest = {
        command: "save-satellite-windows",
        data: {
          windows: {
            "sat-1": {
              windowId: "sat-1",
              title: "Test Window",
              layout: {},
              bounds: { x: 0, y: 0, width: 800, height: 600 },
              autoRestore: true,
              lastModified: Date.now(),
            },
          },
          windowCounter: 1,
        },
      };

      // Simulate IPC transmission (stringify and parse)
      const transmitted = JSON.parse(JSON.stringify(request)) as NotifyMainRequest;

      expect(transmitted.command).toBe("save-satellite-windows");
      if (transmitted.command === "save-satellite-windows") {
        expect((transmitted.data as any).windows["sat-1"].title).toBe("Test Window");
      }
    });
  });

  describe("Type compatibility", () => {
    it("should accept empty windows map", () => {
      const request: NotifyMainRequest = {
        command: "save-satellite-windows",
        data: {
          windows: {},
          windowCounter: 0,
        },
      };
      expect(request).toBeDefined();
    });

    it("should accept multiple windows", () => {
      const request: NotifyMainRequest = {
        command: "save-satellite-windows",
        data: {
          windows: {
            "sat-1": {
              windowId: "sat-1",
              title: "W1",
              layout: {},
              bounds: { x: 0, y: 0, width: 800, height: 600 },
              autoRestore: true,
              lastModified: Date.now(),
            },
            "sat-2": {
              windowId: "sat-2",
              title: "W2",
              layout: {},
              bounds: { x: 100, y: 100, width: 800, height: 600 },
              autoRestore: false,
              lastModified: Date.now(),
            },
            "sat-3": {
              windowId: "sat-3",
              title: "W3",
              layout: {},
              bounds: { x: 200, y: 200, width: 800, height: 600 },
              autoRestore: true,
              lastModified: Date.now(),
            },
          },
          windowCounter: 3,
        },
      };
      expect(Object.keys(request.data!.windows)).toHaveLength(3);
    });

    it("should work with discriminated union pattern", () => {
      const allRequests: NotifyMainRequest[] = [
        {
          command: "save-satellite-windows",
          data: { windows: {}, windowCounter: 0 },
        },
        {
          command: "save-dock-layout",
          data: { version: 1 },
        },
        {
          command: "command-entry",
        },
      ];

      const satelliteRequests = allRequests.filter((r) => r.command === "save-satellite-windows");
      expect(satelliteRequests).toHaveLength(1);
    });
  });
});
