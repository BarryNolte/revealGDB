/**
 * Implements Toolbar.test for revealGDB.
 *
 * @remarks
 * Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import RevealToolbar from "../../../../src/renderer/Components/Toolbar";
import { setDockMenuConnector } from "../../../../src/renderer/utilities/dock-menu-state";

const toolbarMocks = vi.hoisted(() => ({
  renderSubscription: null as null | ((msg: unknown) => void),
}));

vi.mock("@syncfusion/ej2-react-navigations", async () => {
  const React = await import("react");

  const flatten = (nodes: React.ReactNode): React.ReactElement[] =>
    React.Children.toArray(nodes).flatMap((child) => {
      if (!React.isValidElement(child)) {
        return [];
      }

      const nestedChildren = child.props?.children;
      return nestedChildren ? flatten(nestedChildren) : [child];
    }) as React.ReactElement[];

  return {
    ToolbarComponent: ({
      items,
      children,
    }: {
      items?: Array<{
        id?: string;
        text?: string;
        disabled?: boolean;
        type?: string;
        click?: () => void;
      }>;
      children?: React.ReactNode;
    }) => {
      // Support both items prop (current usage) and children (legacy)
      const propItems = (items ?? []).filter((item) => item.type !== "Separator");
      const childItems = flatten(children)
        .map((child) => child.props)
        .filter((item) => item.type !== "Separator");
      const allItems = propItems.length > 0 ? propItems : childItems;

      return (
        <div data-testid="toolbar-component">
          {allItems.map((item) => (
            <button
              key={item.id ?? item.text}
              data-item-id={item.id}
              disabled={Boolean(item.disabled)}
              onClick={() => item.click?.()}
            >
              {item.text}
            </button>
          ))}
        </div>
      );
    },
    ItemsDirective: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    ItemDirective: () => null,
  };
});

vi.mock("@syncfusion/ej2-react-splitbuttons", async () => {
  const React = await import("react");

  return {
    SplitButtonComponent: ({
      id,
      content,
      items,
      open,
      select,
    }: {
      id?: string;
      content?: string;
      items?: Array<{ text?: string }>;
      open?: () => void;
      select?: (args: { item: { properties: { text: string | undefined } } }) => void;
    }) => (
      <div>
        <button id={id} onClick={() => open?.()}>
          {content}
        </button>
        <div data-testid="window-menu-items">
          {(items ?? []).map((item) => (
            <button
              key={item.text}
              onClick={() => select?.({ item: { properties: { text: item.text } } })}
            >
              {item.text}
            </button>
          ))}
        </div>
      </div>
    ),
  };
});

describe("RevealToolbar", () => {
  beforeEach(() => {
    const notifyMain = vi.fn();
    const sendGdbCommand = vi.fn();

    toolbarMocks.renderSubscription = null;

    Object.defineProperty(window, "ipcToMain", {
      configurable: true,
      writable: true,
      value: {
        notifications: {
          render: vi.fn((callback: (msg: unknown) => void) => {
            toolbarMocks.renderSubscription = callback;
            return vi.fn();
          }),
        },
        commands: {
          app: {
            notifyMain,
          },
          debugger: {
            sendGdbCommand,
          },
        },
      },
    });
  });

  afterEach(() => {
    setDockMenuConnector(null);
    vi.clearAllMocks();
  });

  it("updates command availability from notifications and routes toolbar actions", async () => {
    const connectionsShow = vi.fn();
    const whileConnectingShow = vi.fn();
    const settingsShow = vi.fn();

    setDockMenuConnector({
      reconsilePanels: vi.fn(),
      getPanelList: vi.fn(() => []),
    } as never);

    render(
      <RevealToolbar
        connectionsRef={{ current: { ShowDialog: connectionsShow } } as never}
        whileConnectingRef={{ current: { ShowDialog: whileConnectingShow } } as never}
        settingsRef={{ current: { ShowDialog: settingsShow } } as never}
      />,
    );

    expect((screen.getByRole("button", { name: "Connect" }) as HTMLButtonElement).disabled).toBe(
      false,
    );
    expect((screen.getByRole("button", { name: "Disconnect" }) as HTMLButtonElement).disabled).toBe(
      true,
    );

    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    fireEvent.click(screen.getByRole("button", { name: "New Window" }));
    fireEvent.click(screen.getByRole("button", { name: "Connections" }));
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    expect(whileConnectingShow).toHaveBeenCalledTimes(1);
    expect(connectionsShow).toHaveBeenCalledTimes(1);
    expect(settingsShow).toHaveBeenCalledTimes(1);

    act(() => {
      toolbarMocks.renderSubscription?.({ command: "connection-started" });
    });

    await waitFor(() => {
      expect((screen.getByRole("button", { name: "Connect" }) as HTMLButtonElement).disabled).toBe(
        true,
      );
      expect(
        (screen.getByRole("button", { name: "Disconnect" }) as HTMLButtonElement).disabled,
      ).toBe(false);
    });

    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    fireEvent.click(screen.getByRole("button", { name: "Step Over" }));
    fireEvent.click(screen.getByRole("button", { name: "Step In" }));
    fireEvent.click(screen.getByRole("button", { name: "Step Out" }));

    expect(window.ipcToMain.commands.app.notifyMain).toHaveBeenCalledWith({
      command: "newWindow",
    });
    expect(window.ipcToMain.commands.app.notifyMain).toHaveBeenCalledWith({
      command: "cancel-connection",
    });
    expect(window.ipcToMain.commands.debugger.sendGdbCommand).toHaveBeenNthCalledWith(
      1,
      "continue",
    );
    expect(window.ipcToMain.commands.debugger.sendGdbCommand).toHaveBeenNthCalledWith(
      2,
      "signal SIGINT",
    );
    expect(window.ipcToMain.commands.debugger.sendGdbCommand).toHaveBeenNthCalledWith(3, "kill");
    expect(window.ipcToMain.commands.debugger.sendGdbCommand).toHaveBeenNthCalledWith(4, "next");
    expect(window.ipcToMain.commands.debugger.sendGdbCommand).toHaveBeenNthCalledWith(5, "step");
    expect(window.ipcToMain.commands.debugger.sendGdbCommand).toHaveBeenNthCalledWith(6, "finish");

    act(() => {
      toolbarMocks.renderSubscription?.({ command: "connection-success" });
      toolbarMocks.renderSubscription?.({ command: "unknown-command" });
      toolbarMocks.renderSubscription?.({ command: "connection-failed" });
    });

    await waitFor(() => {
      expect(
        (screen.getByRole("button", { name: "Disconnect" }) as HTMLButtonElement).disabled,
      ).toBe(true);
    });

    act(() => {
      toolbarMocks.renderSubscription?.({ command: "cancel-connection" });
    });

    await waitFor(() => {
      expect(
        (screen.getByRole("button", { name: "Disconnect" }) as HTMLButtonElement).disabled,
      ).toBe(true);
    });
  });

  it("rebuilds the window menu and dispatches toggle events for selected windows", async () => {
    const reconsilePanels = vi.fn();
    let panels = [
      { displayName: "Locals", iconCss: "locals", panel: { isDialog: false } },
      { displayName: "Memory", iconCss: "memory", panel: { isDialog: true } },
    ];

    setDockMenuConnector({
      reconsilePanels,
      getPanelList: vi.fn(() => panels),
    } as never);

    const toggleHandler = vi.fn();
    window.addEventListener("toggle-window", toggleHandler as EventListener);

    render(<RevealToolbar />);

    expect(screen.getByRole("button", { name: "Locals" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Memory" })).toBeTruthy();
    expect(reconsilePanels).toHaveBeenCalledTimes(1);

    panels = [{ displayName: "Registers", iconCss: "registers", panel: { isDialog: false } }];
    act(() => {
      window.dispatchEvent(new Event("update-window-list"));
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Registers" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Windows" }));
    expect(reconsilePanels).toHaveBeenCalledTimes(3);

    fireEvent.click(screen.getByRole("button", { name: "Registers" }));

    expect(toggleHandler).toHaveBeenCalledTimes(1);
    const toggleEvent = toggleHandler.mock.calls[0]?.[0] as CustomEvent;
    expect(toggleEvent.detail).toBe("Registers");

    window.removeEventListener("toggle-window", toggleHandler as EventListener);
  });
});
