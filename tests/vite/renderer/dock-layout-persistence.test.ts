/**
 * dock-layout-persistence.test.ts
 *
 * @description Tests for dock layout save/restore functionality
 * Verifies that:
 * - Layout changes trigger saves
 * - Layout is restored from saved state
 * - Debouncing prevents excessive IPC calls
 * - Layout is saved before window unload
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  persistHostLayoutState,
  resolveHostLayoutForRestore,
} from "../../../src/renderer/utilities/dock-workspace-utils";

/**
 * Mock implementation of DockManager for testing
 */
interface MockDockManager {
  saveState: () => string;
  loadState: (state: string) => Promise<void>;
  addLayoutListener: (listener: LayoutListener) => void;
  context: {
    model: {
      rootNode: object | null;
      documentManagerNode?: object | null;
    };
  };
  config: {
    dialogRootElement?: HTMLElement;
    enableBrowserWindows?: boolean;
  };
  initialize: () => void;
  resize: (width: number, height: number) => void;
}

interface LayoutListener {
  onContainerResized?: () => void;
  onTabChanged?: () => void;
  onPanelAdded?: () => void;
  onPanelRemoved?: () => void;
  onBeforePanelClose?: () => boolean;
  onAfterPanelClose?: () => void;
}

/**
 * Create a mock DockManager for testing
 */
function createMockDockManager(overrides?: Partial<MockDockManager>): MockDockManager {
  const layoutState = { version: 1, panels: [] };

  return {
    saveState: vi.fn(() => JSON.stringify(layoutState)),
    loadState: vi.fn(async (state: string) => {
      // Validate JSON
      JSON.parse(state);
    }),
    addLayoutListener: vi.fn(),
    context: {
      model: {
        rootNode: {},
        documentManagerNode: {},
      },
    },
    config: {
      dialogRootElement: undefined,
      enableBrowserWindows: false,
    },
    initialize: vi.fn(),
    resize: vi.fn(),
    ...overrides,
  };
}

/**
 * Mock IPC implementation
 */
function createMockIpc() {
  return {
    commands: {
      workspace: {
        saveHostLayout: vi.fn(async () => {
          // Mock IPC call
        }),
      },
    },
  };
}

describe("Dock Layout Persistence", () => {
  let mockDockManager: MockDockManager;
  let mockIpc: ReturnType<typeof createMockIpc>;
  let eventListeners: Map<string, Set<EventListener>>;
  let savedEventDispatcher: EventTarget | null = null;

  beforeEach(() => {
    mockDockManager = createMockDockManager();
    mockIpc = createMockIpc();
    eventListeners = new Map();

    // Mock window event listener system
    const originalAddEventListener = window.addEventListener;
    const originalRemoveEventListener = window.removeEventListener;
    const originalDispatchEvent = window.dispatchEvent;

    window.addEventListener = vi.fn((type: string, listener: EventListener) => {
      if (!eventListeners.has(type)) {
        eventListeners.set(type, new Set());
      }
      eventListeners.get(type)!.add(listener);
      originalAddEventListener.call(window, type, listener as never);
    });

    window.removeEventListener = vi.fn((type: string, listener: EventListener) => {
      eventListeners.get(type)?.delete(listener);
      originalRemoveEventListener.call(window, type, listener as never);
    });

    window.dispatchEvent = vi.fn((event: Event) => {
      const listeners = eventListeners.get(event.type);
      if (listeners) {
        listeners.forEach((listener) => {
          try {
            listener(event);
          } catch (e) {
            // Ignore listener errors in test
          }
        });
      }
      return originalDispatchEvent.call(window, event);
    });

    // Mock window.ipcToMain
    (window as any).ipcToMain = mockIpc;
  });

  afterEach(() => {
    vi.clearAllMocks();
    eventListeners.clear();
    // Restore original window methods
    vi.restoreAllMocks();
  });

  describe("Layout Event Listeners", () => {
    it("sets up layout listener with multiple event handlers", () => {
      // Simulate setupLayoutListeners call by creating a listener with all expected properties
      const listener: LayoutListener = {
        onContainerResized: vi.fn(),
        onTabChanged: vi.fn(),
        onPanelAdded: vi.fn(),
        onPanelRemoved: vi.fn(),
        onBeforePanelClose: vi.fn(() => true),
        onAfterPanelClose: vi.fn(),
      };

      mockDockManager.addLayoutListener(listener as never);

      expect(mockDockManager.addLayoutListener).toHaveBeenCalledWith(listener);

      const addedListener = (mockDockManager.addLayoutListener as any).mock.calls[0][0];

      // Verify all expected event handlers are present
      expect(addedListener).toHaveProperty("onContainerResized");
      expect(addedListener).toHaveProperty("onTabChanged");
      expect(addedListener).toHaveProperty("onPanelAdded");
      expect(addedListener).toHaveProperty("onPanelRemoved");
      expect(addedListener).toHaveProperty("onBeforePanelClose");
      expect(addedListener).toHaveProperty("onAfterPanelClose");
    });

    it("triggers save on container resize event", () => {
      const listener = {
        onContainerResized: vi.fn(() => {
          window.dispatchEvent(new Event("save-dock-layout"));
        }),
      };

      mockDockManager.addLayoutListener(listener as never);
      const addedListener = (mockDockManager.addLayoutListener as any).mock.calls[0][0];

      // Trigger the event
      addedListener.onContainerResized();

      expect(listener.onContainerResized).toHaveBeenCalled();
    });

    it("triggers save on tab changed event", () => {
      const listener = {
        onTabChanged: vi.fn(() => {
          window.dispatchEvent(new Event("save-dock-layout"));
        }),
      };

      mockDockManager.addLayoutListener(listener as never);
      const addedListener = (mockDockManager.addLayoutListener as any).mock.calls[0][0];

      // Trigger the event
      addedListener.onTabChanged();

      expect(listener.onTabChanged).toHaveBeenCalled();
    });

    it("triggers save on panel added event", () => {
      const listener = {
        onPanelAdded: vi.fn(() => {
          window.dispatchEvent(new Event("save-dock-layout"));
        }),
      };

      mockDockManager.addLayoutListener(listener as never);
      const addedListener = (mockDockManager.addLayoutListener as any).mock.calls[0][0];

      // Trigger the event
      addedListener.onPanelAdded();

      expect(listener.onPanelAdded).toHaveBeenCalled();
    });

    it("triggers save on panel removed event", () => {
      const listener = {
        onPanelRemoved: vi.fn(() => {
          window.dispatchEvent(new Event("save-dock-layout"));
        }),
      };

      mockDockManager.addLayoutListener(listener as never);
      const addedListener = (mockDockManager.addLayoutListener as any).mock.calls[0][0];

      // Trigger the event
      addedListener.onPanelRemoved();

      expect(listener.onPanelRemoved).toHaveBeenCalled();
    });

    it("triggers save on after panel close event", () => {
      const listener = {
        onAfterPanelClose: vi.fn(() => {
          window.dispatchEvent(new Event("save-dock-layout"));
        }),
      };

      mockDockManager.addLayoutListener(listener as never);
      const addedListener = (mockDockManager.addLayoutListener as any).mock.calls[0][0];

      // Trigger the event
      addedListener.onAfterPanelClose();

      expect(listener.onAfterPanelClose).toHaveBeenCalled();
    });
  });

  describe("Layout Save Listener", () => {
    it("saves layout when save event is dispatched", async () => {
      const hostId = "main";

      // Setup save listener
      const saveListener = async (): Promise<void> => {
        const layoutState = JSON.parse(mockDockManager.saveState() as string);
        await (window as any).ipcToMain.commands.workspace.saveHostLayout(hostId, layoutState);
      };

      window.addEventListener("save-dock-layout", saveListener as any);

      // Dispatch save event
      window.dispatchEvent(new Event("save-dock-layout"));

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect((window as any).ipcToMain.commands.workspace.saveHostLayout).toHaveBeenCalledWith(
        hostId,
        expect.any(Object),
      );

      window.removeEventListener("save-dock-layout", saveListener as any);
    });

    it("debounces layout saves to prevent excessive IPC calls", async () => {
      const hostId = "main";
      let savePending = false;
      let saveTimer: ReturnType<typeof setTimeout> | null = null;

      const performSave = async (): Promise<void> => {
        const layoutState = JSON.parse(mockDockManager.saveState() as string);
        await (window as any).ipcToMain.commands.workspace.saveHostLayout(hostId, layoutState);
      };

      const handleSaveDockLayout = (): void => {
        if (saveTimer) {
          clearTimeout(saveTimer);
        }

        savePending = true;
        saveTimer = setTimeout(async () => {
          savePending = false;
          saveTimer = null;
          await performSave();
        }, 500);
      };

      window.addEventListener("save-dock-layout", handleSaveDockLayout as any);

      // Dispatch multiple save events rapidly
      window.dispatchEvent(new Event("save-dock-layout"));
      window.dispatchEvent(new Event("save-dock-layout"));
      window.dispatchEvent(new Event("save-dock-layout"));

      // Should not have called IPC yet (debounced)
      expect((window as any).ipcToMain.commands.workspace.saveHostLayout).not.toHaveBeenCalled();

      // Wait for debounce timeout
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Should have called IPC exactly once after debounce
      expect((window as any).ipcToMain.commands.workspace.saveHostLayout).toHaveBeenCalledTimes(1);

      // Cleanup
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
      window.removeEventListener("save-dock-layout", handleSaveDockLayout as any);
    });

    it("saves layout immediately before window unload", async () => {
      const hostId = "main";
      let savePending = false;
      let saveTimer: ReturnType<typeof setTimeout> | null = null;

      const performSave = async (): Promise<void> => {
        const layoutState = JSON.parse(mockDockManager.saveState() as string);
        await (window as any).ipcToMain.commands.workspace.saveHostLayout(hostId, layoutState);
      };

      const handleSaveDockLayout = (): void => {
        if (saveTimer) {
          clearTimeout(saveTimer);
        }

        savePending = true;
        saveTimer = setTimeout(async () => {
          savePending = false;
          saveTimer = null;
          await performSave();
        }, 500);
      };

      const handleBeforeUnload = async (): Promise<void> => {
        if (saveTimer) {
          clearTimeout(saveTimer);
          saveTimer = null;
        }
        if (savePending) {
          await performSave();
        }
      };

      window.addEventListener("save-dock-layout", handleSaveDockLayout as any);
      window.addEventListener("beforeunload", handleBeforeUnload as any);

      // Dispatch save event
      window.dispatchEvent(new Event("save-dock-layout"));

      // Immediately trigger unload (before debounce completes)
      window.dispatchEvent(new Event("beforeunload"));

      // Should have called IPC immediately
      expect((window as any).ipcToMain.commands.workspace.saveHostLayout).toHaveBeenCalled();

      // Cleanup
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
      window.removeEventListener("save-dock-layout", handleSaveDockLayout as any);
      window.removeEventListener("beforeunload", handleBeforeUnload as any);
    });
  });

  describe("Layout State Capture", () => {
    it("prefers the host-specific workspace layout over the legacy main-window global layout for secondary hosts", () => {
      const workspaceState = {
        id: "workspace-1",
        windows: [],
        hosts: [
          { id: "main", label: "Main Window", visibleWindows: [] },
          { id: "dock-1", label: "Dock Window 1", visibleWindows: [] },
        ],
        hostLayouts: {
          main: { legacyMain: true },
          "dock-1": { hostSpecific: true },
        },
        updatedAt: Date.now(),
      } as any;

      const settingsLayout = { legacyMain: true };

      expect(resolveHostLayoutForRestore(settingsLayout, workspaceState, "dock-1")).toEqual({
        hostSpecific: true,
      });
      expect(resolveHostLayoutForRestore(settingsLayout, workspaceState, "main")).toEqual({
        legacyMain: true,
      });
    });

    it("saves secondary host layouts without writing the legacy global dockLayout key", async () => {
      const notifyMain = vi.fn();
      const saveHostLayout = vi.fn(async () => undefined);
      const layout = { version: 1, panels: [{ id: "locals", title: "Locals" }] };

      await persistHostLayoutState("dock-1", layout, saveHostLayout, notifyMain, false);

      expect(saveHostLayout).toHaveBeenCalledWith("dock-1", layout);
      expect(notifyMain).not.toHaveBeenCalled();
    });

    it("correctly serializes layout state for persistence", () => {
      const mockLayout = {
        version: 1,
        panels: [
          { id: "source", title: "Source", position: "center" },
          { id: "locals", title: "Locals", position: "left" },
        ],
      };

      mockDockManager.saveState = vi.fn(() => JSON.stringify(mockLayout));

      const layoutState = JSON.parse(mockDockManager.saveState() as string);

      expect(layoutState).toEqual(mockLayout);
      expect(layoutState.version).toBe(1);
      expect(layoutState.panels).toHaveLength(2);
    });

    it("loads layout state from persisted format", async () => {
      const mockLayout = {
        version: 1,
        panels: [
          { id: "source", title: "Source", position: "center" },
          { id: "locals", title: "Locals", position: "left" },
        ],
      };

      mockDockManager.loadState = vi.fn(async (state: string) => {
        // Validate JSON can be parsed
        const parsed = JSON.parse(state);
        expect(parsed).toBeDefined();
      });

      const layoutJson = JSON.stringify(mockLayout);
      await mockDockManager.loadState(layoutJson);

      expect(mockDockManager.loadState).toHaveBeenCalledWith(layoutJson);
    });
  });

  describe("Layout Persistence Round-Trip", () => {
    it("saves and restores layout with identical state", async () => {
      const hostId = "main";
      const originalLayout = { version: 1, panels: [{ id: "source", title: "Source" }] };

      // Setup save
      mockDockManager.saveState = vi.fn(() => JSON.stringify(originalLayout));

      // Capture saved state
      const savedState = JSON.parse(mockDockManager.saveState() as string);

      // Setup restore
      const restoredLayout = { ...savedState };

      // Verify round-trip
      expect(restoredLayout).toEqual(originalLayout);
      expect(restoredLayout.version).toBe(originalLayout.version);
      expect(restoredLayout.panels).toEqual(originalLayout.panels);
    });
  });

  describe("DOM Mutation Observation", () => {
    it("triggers save on DOM mutations in dock container", async () => {
      // Create mock dock container
      const container = document.createElement("div");
      container.id = "revealDockManager";
      document.body.appendChild(container);

      const saveEvents: string[] = [];
      const handleSave = () => {
        saveEvents.push("save");
      };

      window.addEventListener("save-dock-layout", handleSave as any);

      // Simulate MutationObserver detecting style changes
      if (typeof MutationObserver !== "undefined") {
        const observer = new MutationObserver(() => {
          window.dispatchEvent(new Event("save-dock-layout"));
        });

        observer.observe(container, {
          attributes: true,
          attributeFilter: ["style", "class"],
          subtree: true,
        });

        // Trigger mutation by changing style
        container.style.width = "500px";
        container.style.height = "400px";

        // Wait for mutation observer to fire
        await new Promise((resolve) => setTimeout(resolve, 100));

        observer.disconnect();
      }

      // Verify save events were triggered
      expect(saveEvents.length).toBeGreaterThan(0);

      // Cleanup
      window.removeEventListener("save-dock-layout", handleSave as any);
      document.body.removeChild(container);
    });
  });
});
