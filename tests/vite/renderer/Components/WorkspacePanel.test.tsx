// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspacePanel } from "../../../../src/renderer/Components/WorkspacePanel";

const workspacePanelMocks = vi.hoisted(() => ({
  addWindow: vi.fn().mockResolvedValue(undefined),
  removeWindow: vi.fn().mockResolvedValue(undefined),
  showWindow: vi.fn().mockResolvedValue(undefined),
  hideWindow: vi.fn().mockResolvedValue(undefined),
  moveWindow: vi.fn().mockResolvedValue(undefined),
  setActiveWindow: vi.fn().mockResolvedValue(undefined),
  splitPane: vi.fn().mockResolvedValue(undefined),
  moveWindowToPane: vi.fn().mockImplementation(async () => initialWorkspace),
  reorderPaneWindows: vi.fn().mockImplementation(async () => initialWorkspace),
  createHost: vi.fn().mockResolvedValue("satellite-test"),
  notifyMain: vi.fn(),
  unsubscribe: vi.fn(),
  workspaceUpdatedCallback: undefined as undefined | ((workspace: any) => void),
}));

const initialWorkspace = {
  version: 1,
  windows: [
    {
      id: "host-main",
      type: "main",
      bounds: { x: 0, y: 0, width: 1200, height: 800 },
      layout: {
        id: "layout-main",
        root: { id: "pane-main", windowIds: ["doc-1", "tool-1"], activeWindowId: "doc-1", size: 1 },
      },
      isMinimized: false,
      isMaximized: false,
    },
  ],
  groups: [
    {
      name: "documents",
      type: "SourceFileWindow",
      windows: [
        {
          id: "doc-1",
          type: "SourceFileWindow",
          title: "main.cpp",
          group: "documents",
          isActive: false,
          isVisible: true,
        },
      ],
    },
    {
      name: "toolwindows",
      type: "ToolWindow",
      windows: [
        {
          id: "tool-1",
          type: "ToolWindow",
          title: "Locals",
          group: "toolwindows",
          isActive: true,
          isVisible: true,
        },
      ],
    },
  ],
  activeWindowId: "host-main",
  metadata: {
    createdAt: 1,
    updatedAt: 1,
    appVersion: "1.0.0",
  },
};

const splitWorkspace = {
  ...initialWorkspace,
  windows: [
    {
      ...initialWorkspace.windows[0],
      layout: {
        id: "layout-main",
        root: {
          type: "split",
          direction: "horizontal",
          splitters: [{ id: "split-1", direction: "horizontal" }],
          children: [
            { id: "pane-left", windowIds: ["doc-1"], activeWindowId: "doc-1", size: 0.5 },
            { id: "pane-right", windowIds: ["tool-1"], activeWindowId: "tool-1", size: 0.5 },
          ],
        },
      },
    },
  ],
};

describe("WorkspacePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(window, "ipcToMain", {
      configurable: true,
      writable: true,
      value: {
        queries: {
          workspace: {
            getWorkspace: vi.fn().mockResolvedValue(initialWorkspace),
          },
        },
        notifications: {
          workspaceUpdated: vi.fn((callback: (workspace: unknown) => void) => {
            workspacePanelMocks.workspaceUpdatedCallback = callback;
            return workspacePanelMocks.unsubscribe;
          }),
        },
        commands: {
          workspace: {
            addWindow: workspacePanelMocks.addWindow,
            removeWindow: workspacePanelMocks.removeWindow,
            showWindow: workspacePanelMocks.showWindow,
            hideWindow: workspacePanelMocks.hideWindow,
            moveWindow: workspacePanelMocks.moveWindow,
            setActiveWindow: workspacePanelMocks.setActiveWindow,
            splitPane: workspacePanelMocks.splitPane,
            moveWindowToPane: workspacePanelMocks.moveWindowToPane,
            reorderPaneWindows: workspacePanelMocks.reorderPaneWindows,
            createHost: workspacePanelMocks.createHost,
          },
          app: {
            notifyMain: workspacePanelMocks.notifyMain,
          },
        },
      },
    });
  });

  afterEach(() => {
    workspacePanelMocks.workspaceUpdatedCallback = undefined;
  });

  it("loads the current workspace and issues basic window commands", async () => {
    render(<WorkspacePanel isVisible={true} />);

    await screen.findByText("Workspace Manager");
    await screen.findAllByText("main.cpp");

    fireEvent.click(screen.getByText("+ Source File"));
    expect(workspacePanelMocks.addWindow).toHaveBeenCalledWith("SourceFileWindow", "untitled.cpp");

    fireEvent.click(screen.getByTitle("Toggle visibility"));
    expect(workspacePanelMocks.hideWindow).toHaveBeenCalledWith("doc-1");

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "toolwindows" } });
    expect(workspacePanelMocks.moveWindow).toHaveBeenCalledWith("doc-1", "toolwindows");

    fireEvent.click(screen.getByTitle("Remove window"));
    expect(workspacePanelMocks.removeWindow).toHaveBeenCalledWith("doc-1");
  });

  it("updates the rendered workspace when a workspaceUpdated notification arrives", async () => {
    render(<WorkspacePanel isVisible={true} />);

    await screen.findAllByText("main.cpp");

    workspacePanelMocks.workspaceUpdatedCallback?.({
      ...initialWorkspace,
      groups: [
        {
          ...initialWorkspace.groups[0],
          windows: [
            ...initialWorkspace.groups[0].windows,
            {
              id: "doc-2",
              type: "SourceFileWindow",
              title: "updated.cpp",
              group: "documents",
              isActive: false,
              isVisible: true,
            },
          ],
        },
        initialWorkspace.groups[1],
      ],
    });

    await waitFor(() => {
      expect(screen.getByText("updated.cpp")).toBeTruthy();
    });
  });

  it("supports phase 3 activate, split, and pane drag interactions in the debug layout", async () => {
    Object.defineProperty(window, "ipcToMain", {
      configurable: true,
      writable: true,
      value: {
        queries: {
          workspace: {
            getWorkspace: vi.fn().mockResolvedValue(splitWorkspace),
          },
        },
        notifications: {
          workspaceUpdated: vi.fn((callback: (workspace: unknown) => void) => {
            workspacePanelMocks.workspaceUpdatedCallback = callback;
            return workspacePanelMocks.unsubscribe;
          }),
        },
        commands: {
          workspace: {
            addWindow: workspacePanelMocks.addWindow,
            removeWindow: workspacePanelMocks.removeWindow,
            showWindow: workspacePanelMocks.showWindow,
            hideWindow: workspacePanelMocks.hideWindow,
            moveWindow: workspacePanelMocks.moveWindow,
            setActiveWindow: workspacePanelMocks.setActiveWindow,
            splitPane: workspacePanelMocks.splitPane,
            moveWindowToPane: workspacePanelMocks.moveWindowToPane,
            reorderPaneWindows: workspacePanelMocks.reorderPaneWindows,
            createHost: workspacePanelMocks.createHost,
          },
          app: {
            notifyMain: workspacePanelMocks.notifyMain,
          },
        },
      },
    });

    render(<WorkspacePanel isVisible={true} />);

    await screen.findByText("Debug Layout");

    fireEvent.click(screen.getByTestId("pane-tab-doc-1"));
    expect(workspacePanelMocks.setActiveWindow).toHaveBeenCalledWith("doc-1");

    fireEvent.click(screen.getAllByText("Split H")[0]);
    expect(workspacePanelMocks.splitPane).toHaveBeenCalledWith("doc-1", "horizontal");

    fireEvent.dragStart(screen.getByTestId("pane-tab-doc-1"));
    fireEvent.dragOver(screen.getByTestId("pane-pane-right"));
    fireEvent.drop(screen.getByTestId("pane-pane-right"));

    await waitFor(() => {
      expect(workspacePanelMocks.moveWindowToPane).toHaveBeenCalledWith("doc-1", "pane-right");
    });
  });

  it("supports keyboard tab activation shortcuts and workspace context actions", async () => {
    render(<WorkspacePanel isVisible={true} />);

    await screen.findAllByText("main.cpp");

    const paneTab = screen.getByTestId("pane-tab-doc-1");
    paneTab.focus();
    fireEvent.keyDown(paneTab, { key: "Enter" });
    expect(workspacePanelMocks.setActiveWindow).toHaveBeenCalledWith("doc-1");

    fireEvent.keyDown(paneTab, { key: "C", ctrlKey: true, shiftKey: true });
    expect(workspacePanelMocks.notifyMain).toHaveBeenCalledWith({ command: "connections-dialog" });

    fireEvent.keyDown(paneTab, { key: "N", ctrlKey: true, shiftKey: true });
    expect(workspacePanelMocks.createHost).toHaveBeenCalledWith({ label: "New Window" });

    fireEvent.contextMenu(screen.getByTitle("Toggle visibility").closest("div") as HTMLElement, {
      clientX: 100,
      clientY: 100,
    });
    expect(screen.getByTestId("workspace-context-menu")).toBeTruthy();

    fireEvent.click(screen.getByText("Open Connections"));
    expect(workspacePanelMocks.notifyMain).toHaveBeenCalledWith({ command: "connections-dialog" });
  });
});
