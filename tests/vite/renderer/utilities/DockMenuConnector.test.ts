// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dockConnectorMocks = vi.hoisted(() => {
  const createdPanels = new Map<string, MockPanelContainer>();

  class MockDialog {
    public setPosition = vi.fn();
    public hide = vi.fn();
  }

  class MockPanelContainer {
    public floatingDialog = {
      setPosition: vi.fn(),
      hide: vi.fn(),
    };
    public isDialog = false;
    public hideCloseButton = vi.fn();
    public performUndockToDialog = vi.fn(() => new MockDialog());

    constructor(
      public element: HTMLElement,
      public dockManager: unknown,
      public title: string,
    ) {
      createdPanels.set(title, this);
    }
  }

  return {
    MockPanelContainer,
    MockDialog,
    createdPanels,
  };
});

vi.mock("../../../../node_modules/dock-spawn-ts/lib/js/DockManager.js", () => ({
  DockManager: class {},
}));

vi.mock("../../../../node_modules/dock-spawn-ts/lib/js/PanelContainer.js", () => ({
  PanelContainer: dockConnectorMocks.MockPanelContainer,
}));

import { DockMenuConnector } from "../../../../src/renderer/utilities/DockMenuConnector";

describe("DockMenuConnector", () => {
  const toggleWindowListeners: EventListenerOrEventListenerObject[] = [];
  const originalAddEventListener = window.addEventListener.bind(window);

  beforeEach(() => {
    dockConnectorMocks.createdPanels.clear();
    document.body.innerHTML = "";

    vi.spyOn(window, "addEventListener").mockImplementation(((
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: AddEventListenerOptions,
    ) => {
      if (type === "toggle-window") {
        toggleWindowListeners.push(listener);
      }
      originalAddEventListener(type, listener, options);
    }) as typeof window.addEventListener);
  });

  afterEach(() => {
    while (toggleWindowListeners.length > 0) {
      const listener = toggleWindowListeners.pop();
      if (listener) {
        window.removeEventListener("toggle-window", listener);
      }
    }
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("registers panels, creates windows from DOM nodes, and reconciles live panel instances", () => {
    const dockManager = {
      getPanels: vi.fn(() => []),
      dockDialogUp: vi.fn(),
      context: { model: { rootNode: { id: "root" } } },
    };

    const connector = new DockMenuConnector(dockManager as never);
    connector.registerPanel("locals-window", "Locals", "Local variables", "locals-icon");
    connector.registerPanel("missing-window", "Missing", "No DOM node");

    const localsElement = document.createElement("div");
    localsElement.id = "locals-window";
    document.body.appendChild(localsElement);

    connector.createAllWindows();

    const localsPanel = connector.getPanelByDisplayName("Locals") as unknown as {
      hideCloseButton: ReturnType<typeof vi.fn>;
      element: HTMLElement;
    };

    expect(localsPanel.element).toBe(localsElement);
    expect(localsPanel.hideCloseButton).toHaveBeenCalledWith(true);

    const reconciledPanel = new dockConnectorMocks.MockPanelContainer(
      localsElement,
      dockManager,
      "Locals",
    ) as unknown as { title: string; marker: string };
    reconciledPanel.marker = "reconciled";
    dockManager.getPanels.mockReturnValue([reconciledPanel]);
    connector.reconsilePanels();

    expect(connector.getPanelByDisplayName("Locals")).toBe(reconciledPanel);
    expect(connector.getPanelList()).toHaveLength(2);
    expect(connector.getDockPanelInfoByDisplayName("Locals")?.description).toBe("Local variables");
    expect(connector.isVisible("Locals")).toBe(true);
    expect(() => connector.getPanelByDisplayName("Missing")).toThrow(
      "Panel 'Missing' is not registered or not initialized",
    );
  });

  it("toggles non-dialog panels into hidden dialogs and restores them on the next toggle", () => {
    const dockDialogUp = vi.fn();
    const dockManager = {
      getPanels: vi.fn(() => []),
      dockDialogUp,
      context: { model: { rootNode: { id: "root" } } },
    };

    const connector = new DockMenuConnector(dockManager as never);
    connector.registerPanel("locals-window", "Locals", "Local variables", "locals-icon");

    const localsElement = document.createElement("div");
    localsElement.id = "locals-window";
    document.body.appendChild(localsElement);
    connector.createAllWindows();

    const updateWindowList = vi.fn();
    const saveDockLayout = vi.fn();
    window.addEventListener("update-window-list", updateWindowList as EventListener);
    window.addEventListener("save-dock-layout", saveDockLayout as EventListener);

    const panel = connector.getPanelByDisplayName("Locals") as unknown as {
      isDialog: boolean;
      performUndockToDialog: ReturnType<typeof vi.fn>;
    };

    window.dispatchEvent(new CustomEvent("toggle-window", { detail: "Locals" }));

    const hiddenDialog = panel.performUndockToDialog.mock.results[0]?.value as {
      setPosition: ReturnType<typeof vi.fn>;
      hide: ReturnType<typeof vi.fn>;
    };

    expect(panel.performUndockToDialog).toHaveBeenCalled();
    expect(hiddenDialog.setPosition).toHaveBeenCalledWith(-100000, 0);
    expect(hiddenDialog.hide).toHaveBeenCalledTimes(1);
    expect(connector.isVisible("Locals")).toBe(false);
    expect(updateWindowList).toHaveBeenCalledTimes(1);
    expect(saveDockLayout).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new CustomEvent("toggle-window", { detail: "Locals" }));

    expect(dockDialogUp).toHaveBeenCalledWith(dockManager.context.model.rootNode, hiddenDialog);
    expect(connector.isVisible("Locals")).toBe(true);

    window.removeEventListener("update-window-list", updateWindowList as EventListener);
    window.removeEventListener("save-dock-layout", saveDockLayout as EventListener);
  });

  it("hides floating dialogs when the panel is already undocked", () => {
    const dockManager = {
      getPanels: vi.fn(() => []),
      dockDialogUp: vi.fn(),
      context: { model: { rootNode: { id: "root" } } },
    };

    const connector = new DockMenuConnector(dockManager as never);
    connector.registerPanel("memory-window", "Memory", "Memory view", "memory-icon");

    const memoryElement = document.createElement("div");
    memoryElement.id = "memory-window";
    document.body.appendChild(memoryElement);
    connector.createAllWindows();

    const panel = connector.getPanelByDisplayName("Memory") as unknown as {
      isDialog: boolean;
      floatingDialog: {
        setPosition: ReturnType<typeof vi.fn>;
        hide: ReturnType<typeof vi.fn>;
      };
      performUndockToDialog: ReturnType<typeof vi.fn>;
    };
    panel.isDialog = true;

    window.dispatchEvent(new CustomEvent("toggle-window", { detail: "Memory" }));

    expect(panel.performUndockToDialog).not.toHaveBeenCalled();
    expect(panel.floatingDialog.setPosition).toHaveBeenCalledWith(-100000, 0);
    expect(panel.floatingDialog.hide).toHaveBeenCalledTimes(1);
    expect(connector.isVisible("Memory")).toBe(true);
  });
});
