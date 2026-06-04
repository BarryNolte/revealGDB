// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useConnectionDialogController } from "../../../../src/renderer/Dialogs/useConnectionDialogController";

describe("useConnectionDialogController", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("loads connections, reacts to notifications, and opens the connection manager flow", async () => {
    const renderSubscriptions: Array<(msg: unknown) => void> = [];
    const statusSubscriptions: Array<(msg: unknown) => void> = [];
    const notifyMain = vi.fn();
    const connDialog = { show: vi.fn(), hide: vi.fn() };
    const outputDiv = document.createElement("div");
    document.body.appendChild(outputDiv);
    const connectionsButton = document.createElement("button");
    connectionsButton.id = "connectionsButton";
    document.body.appendChild(connectionsButton);
    const connectionsRef = {
      current: {
        ShowDialog: vi.fn((onClose?: () => void) => {
          onClose?.();
        }),
      },
    };

    Object.defineProperty(window, "ipcToMain", {
      configurable: true,
      writable: true,
      value: {
        queries: {
          app: {
            getSettings: vi.fn().mockResolvedValue({
              connections: [{ name: "Primary" }, { name: "Backup" }],
              lastUsedConnection: "Backup",
            }),
          },
        },
        notifications: {
          render: vi.fn((callback: (msg: unknown) => void) => {
            renderSubscriptions.push(callback);
            return vi.fn();
          }),
          connectionStatus: vi.fn((callback: (msg: unknown) => void) => {
            statusSubscriptions.push(callback);
            return vi.fn();
          }),
        },
        commands: {
          app: {
            notifyMain,
          },
        },
      },
    });

    const { result } = renderHook(() =>
      useConnectionDialogController({
        connectionsRef: connectionsRef as never,
        connDlgRef: { current: connDialog } as never,
        outputRef: { current: outputDiv } as never,
      }),
    );

    await waitFor(() => {
      expect(result.current.definedConnections.map((entry) => entry.name)).toEqual([
        "Primary",
        "Backup",
      ]);
      expect(result.current.selectedConnectionName).toBe("Backup");
    });

    act(() => {
      renderSubscriptions[0]?.({ command: "connection-started" });
    });
    await waitFor(() => {
      expect(result.current.disconnectAvailable).toBe(true);
    });

    act(() => {
      statusSubscriptions[0]?.(["console-capture", { error: false, line: "hello" }]);
    });

    expect(outputDiv.textContent).toContain("hello");

    act(() => {
      result.current.onConnectClick();
      result.current.onSelectedConnectionChange({ name: "Primary" });
    });

    expect(notifyMain).toHaveBeenCalledWith({
      command: "connect-selected-connection",
      data: { connection: { name: "Backup" } },
    });
    expect(notifyMain).toHaveBeenCalledWith({
      command: "save-last-used-connection",
      data: "Primary",
    });

    act(() => {
      connectionsButton.click();
    });

    await waitFor(() => {
      expect(connDialog.hide).toHaveBeenCalled();
      expect(connectionsRef.current.ShowDialog).toHaveBeenCalled();
      expect(connDialog.show).toHaveBeenCalled();
    });

    act(() => {
      result.current.onCancelConnectionClick();
    });

    expect(notifyMain).toHaveBeenCalledWith({ command: "cancel-connection" });
    expect(connDialog.hide).toHaveBeenCalled();

    document.body.removeChild(connectionsButton);
    document.body.removeChild(outputDiv);
  });

  it("handles startup status updates, resets dialog output, and ignores invalid connect requests", async () => {
    vi.useFakeTimers();

    const renderSubscriptions: Array<(msg: unknown) => void> = [];
    const statusSubscriptions: Array<(msg: unknown) => void> = [];
    const notifyMain = vi.fn();
    const connDialog = { show: vi.fn(), hide: vi.fn() };
    const outputDiv = document.createElement("div");
    outputDiv.innerHTML = "stale output";
    document.body.appendChild(outputDiv);

    Object.defineProperty(window, "ipcToMain", {
      configurable: true,
      writable: true,
      value: {
        queries: {
          app: {
            getSettings: vi.fn().mockResolvedValue({
              connections: [{ name: "Primary" }],
              lastUsedConnection: "Missing",
            }),
          },
        },
        notifications: {
          render: vi.fn((callback: (msg: unknown) => void) => {
            renderSubscriptions.push(callback);
            return vi.fn();
          }),
          connectionStatus: vi.fn((callback: (msg: unknown) => void) => {
            statusSubscriptions.push(callback);
            return vi.fn();
          }),
        },
        commands: {
          app: {
            notifyMain,
          },
        },
      },
    });

    const { result } = renderHook(() =>
      useConnectionDialogController({
        connectionsRef: undefined,
        connDlgRef: { current: connDialog } as never,
        outputRef: { current: outputDiv } as never,
      }),
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.definedConnections).toHaveLength(1);
    expect(result.current.selectedConnectionName).toBeUndefined();

    const showCallCountBeforeManualShow = connDialog.show.mock.calls.length;

    act(() => {
      result.current.onConnectClick();
      result.current.showDialog();
    });

    expect(outputDiv.innerHTML).toBe("");
    expect(connDialog.show.mock.calls.length).toBeGreaterThan(showCallCountBeforeManualShow);
    expect(notifyMain).not.toHaveBeenCalledWith(
      expect.objectContaining({ command: "connect-selected-connection" }),
    );

    act(() => {
      renderSubscriptions[0]?.({ command: "connection-failed" });
      renderSubscriptions[0]?.({ command: "unknown" });
      statusSubscriptions[0]?.(["gdb-startup", "starting-shell", "completed"]);
      statusSubscriptions[0]?.(["gdb-startup", "running-commands", "in-progress"]);
      statusSubscriptions[0]?.(["gdb-startup", "target-running", "completed"]);
      statusSubscriptions[0]?.(["unknown-status"]);
    });

    expect(result.current.disconnectAvailable).toBe(false);
    expect(result.current.connectionStateRows).toEqual([
      { step: 0, name: "Starting Shell", state: "completed" },
      { step: 1, name: "Running Commands", state: "in-progress" },
      { step: 2, name: "Target Running", state: "completed" },
    ]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(connDialog.hide).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.hideDialog();
      result.current.onDialogClose();
    });

    expect(connDialog.hide).toHaveBeenCalledTimes(3);
    expect(notifyMain).toHaveBeenCalledWith({
      command: "save-last-used-connection",
      data: null,
    });

    document.body.removeChild(outputDiv);
  });

  it("falls back cleanly when settings loading fails and ignores unrelated document clicks", async () => {
    vi.useFakeTimers();

    const renderSubscriptions: Array<(msg: unknown) => void> = [];
    const statusSubscriptions: Array<(msg: unknown) => void> = [];
    const notifyMain = vi.fn();
    const connDialog = { show: vi.fn(), hide: vi.fn() };
    const outputDiv = document.createElement("div");
    document.body.appendChild(outputDiv);
    const outsideButton = document.createElement("button");
    outsideButton.id = "outside";
    document.body.appendChild(outsideButton);
    const connectionsRef = {
      current: {
        ShowDialog: vi.fn(),
      },
    };

    Object.defineProperty(window, "ipcToMain", {
      configurable: true,
      writable: true,
      value: {
        queries: {
          app: {
            getSettings: vi.fn().mockRejectedValue(new Error("settings failed")),
          },
        },
        notifications: {
          render: vi.fn((callback: (msg: unknown) => void) => {
            renderSubscriptions.push(callback);
            return vi.fn();
          }),
          connectionStatus: vi.fn((callback: (msg: unknown) => void) => {
            statusSubscriptions.push(callback);
            return vi.fn();
          }),
        },
        commands: {
          app: {
            notifyMain,
          },
        },
      },
    });

    const { result } = renderHook(() =>
      useConnectionDialogController({
        connectionsRef: connectionsRef as never,
        connDlgRef: { current: connDialog } as never,
        outputRef: { current: outputDiv } as never,
      }),
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.definedConnections).toEqual([]);
    expect(result.current.selectedConnectionName).toBeUndefined();

    act(() => {
      outsideButton.click();
    });

    expect(connectionsRef.current.ShowDialog).not.toHaveBeenCalled();
    expect(connDialog.hide).not.toHaveBeenCalled();

    document.body.removeChild(outsideButton);
    document.body.removeChild(outputDiv);
  });

  it("normalizeConnections returns empty array for non-array connections value", async () => {
    vi.useFakeTimers();
    const connDialog = { show: vi.fn(), hide: vi.fn() };
    const outputDiv = document.createElement("div");
    document.body.appendChild(outputDiv);

    Object.defineProperty(window, "ipcToMain", {
      configurable: true,
      writable: true,
      value: {
        queries: {
          app: {
            // Return connections as a non-array value (object) to trigger the !Array.isArray branch
            getSettings: vi.fn().mockResolvedValue({ connections: "not-an-array" }),
          },
        },
        notifications: {
          render: vi.fn(() => vi.fn()),
          connectionStatus: vi.fn(() => vi.fn()),
        },
        commands: { app: { notifyMain: vi.fn() } },
      },
    });

    const { result } = renderHook(() =>
      useConnectionDialogController({
        connectionsRef: undefined,
        connDlgRef: { current: connDialog } as never,
        outputRef: { current: outputDiv } as never,
      }),
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // normalizeConnections returned [] because connections was not an array
    expect(result.current.definedConnections).toEqual([]);

    document.body.removeChild(outputDiv);
  });

  it("openConnectionManagerClickHandler shows dialog when connectionsRef is null", async () => {
    vi.useFakeTimers();
    const connDialog = { show: vi.fn(), hide: vi.fn() };
    const outputDiv = document.createElement("div");
    document.body.appendChild(outputDiv);
    const connectionsButton = document.createElement("button");
    connectionsButton.id = "connectionsButton";
    document.body.appendChild(connectionsButton);

    Object.defineProperty(window, "ipcToMain", {
      configurable: true,
      writable: true,
      value: {
        queries: {
          app: {
            getSettings: vi.fn().mockResolvedValue({ connections: [] }),
          },
        },
        notifications: {
          render: vi.fn(() => vi.fn()),
          connectionStatus: vi.fn(() => vi.fn()),
        },
        commands: { app: { notifyMain: vi.fn() } },
      },
    });

    renderHook(() =>
      useConnectionDialogController({
        // connectionsRef is undefined — its .current is falsy → triggers show + return
        connectionsRef: undefined,
        connDlgRef: { current: connDialog } as never,
        outputRef: { current: outputDiv } as never,
      }),
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Clicking connectionsButton triggers openConnectionManagerClickHandler
    act(() => {
      connectionsButton.click();
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // The handler should call hide first, then (because connectionsRef is null) call show
    expect(connDialog.hide).toHaveBeenCalled();
    expect(connDialog.show).toHaveBeenCalled();

    document.body.removeChild(connectionsButton);
    document.body.removeChild(outputDiv);
  });

  it("document click handler skips non-Element targets (covers line 217)", async () => {
    vi.useFakeTimers();
    const connDialog = { show: vi.fn(), hide: vi.fn() };
    const outputDiv = document.createElement("div");
    document.body.appendChild(outputDiv);

    Object.defineProperty(window, "ipcToMain", {
      configurable: true,
      writable: true,
      value: {
        queries: {
          app: {
            getSettings: vi.fn().mockResolvedValue({ connections: [] }),
          },
        },
        notifications: {
          render: vi.fn(() => vi.fn()),
          connectionStatus: vi.fn(() => vi.fn()),
        },
        commands: { app: { notifyMain: vi.fn() } },
      },
    });

    renderHook(() =>
      useConnectionDialogController({
        connectionsRef: undefined,
        connDlgRef: { current: connDialog } as never,
        outputRef: { current: outputDiv } as never,
      }),
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Dispatch a click event directly on the document (target = document, not an Element)
    // This triggers the !(eventTarget instanceof Element) → return early branch
    act(() => {
      document.dispatchEvent(new MouseEvent("click", { bubbles: false }));
    });

    // connDialog methods should NOT have been called (handler returned early)
    expect(connDialog.hide).not.toHaveBeenCalled();

    document.body.removeChild(outputDiv);
  });

  it("normalizeConnections generates fallback name for connections without a name property", async () => {
    vi.useFakeTimers();
    const connDialog = { show: vi.fn(), hide: vi.fn() };
    const outputDiv = document.createElement("div");
    document.body.appendChild(outputDiv);

    Object.defineProperty(window, "ipcToMain", {
      configurable: true,
      writable: true,
      value: {
        queries: {
          app: {
            // connection object has no 'name' → name ?? `Connection ${index+1}` branch
            getSettings: vi
              .fn()
              .mockResolvedValue({ connections: [{ shell: "wsl" }, { shell: "native-gdb" }] }),
          },
        },
        notifications: {
          render: vi.fn(() => vi.fn()),
          connectionStatus: vi.fn(() => vi.fn()),
        },
        commands: { app: { notifyMain: vi.fn() } },
      },
    });

    const { result } = renderHook(() =>
      useConnectionDialogController({
        connectionsRef: undefined,
        connDlgRef: { current: connDialog } as never,
        outputRef: { current: outputDiv } as never,
      }),
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.definedConnections[0]?.name).toBe("Connection 1");
    expect(result.current.definedConnections[1]?.name).toBe("Connection 2");

    document.body.removeChild(outputDiv);
  });

  it("console-capture with error=true adds consoleError class to the output div", async () => {
    const statusSubscriptions: Array<(msg: unknown) => void> = [];
    const connDialog = { show: vi.fn(), hide: vi.fn() };
    const outputDiv = document.createElement("div");
    document.body.appendChild(outputDiv);

    Object.defineProperty(window, "ipcToMain", {
      configurable: true,
      writable: true,
      value: {
        queries: {
          app: {
            getSettings: vi.fn().mockResolvedValue({ connections: [] }),
          },
        },
        notifications: {
          render: vi.fn(() => vi.fn()),
          connectionStatus: vi.fn((callback: (msg: unknown) => void) => {
            statusSubscriptions.push(callback);
            return vi.fn();
          }),
        },
        commands: { app: { notifyMain: vi.fn() } },
      },
    });

    renderHook(() =>
      useConnectionDialogController({
        connectionsRef: undefined,
        connDlgRef: { current: connDialog } as never,
        outputRef: { current: outputDiv } as never,
      }),
    );

    await waitFor(() => {
      expect(statusSubscriptions.length).toBeGreaterThan(0);
    });

    act(() => {
      statusSubscriptions[0]?.(["console-capture", { error: true, line: "error happened" }]);
    });

    const errorDiv = outputDiv.querySelector(".consoleError");
    expect(errorDiv).not.toBeNull();
    expect(errorDiv?.textContent).toBe("error happened");

    document.body.removeChild(outputDiv);
  });

  it("onSelectedConnectionChange with null triggers save-last-used-connection with null data", async () => {
    const notifyMain = vi.fn();
    const connDialog = { show: vi.fn(), hide: vi.fn() };
    const outputDiv = document.createElement("div");
    document.body.appendChild(outputDiv);

    Object.defineProperty(window, "ipcToMain", {
      configurable: true,
      writable: true,
      value: {
        queries: {
          app: {
            getSettings: vi.fn().mockResolvedValue({ connections: [{ name: "A" }] }),
          },
        },
        notifications: {
          render: vi.fn(() => vi.fn()),
          connectionStatus: vi.fn(() => vi.fn()),
        },
        commands: { app: { notifyMain } },
      },
    });

    const { result } = renderHook(() =>
      useConnectionDialogController({
        connectionsRef: undefined,
        connDlgRef: { current: connDialog } as never,
        outputRef: { current: outputDiv } as never,
      }),
    );

    await waitFor(() => {
      expect(result.current.definedConnections).toHaveLength(1);
    });

    act(() => {
      // Pass null to trigger the (itemData as DefinedConnection | undefined) ?? null branch
      result.current.onSelectedConnectionChange(null);
    });

    expect(notifyMain).toHaveBeenCalledWith({
      command: "save-last-used-connection",
      data: null,
    });

    document.body.removeChild(outputDiv);
  });

  it("resetDialogState is safe when outputRef.current is null", async () => {
    const connDialog = { show: vi.fn(), hide: vi.fn() };

    Object.defineProperty(window, "ipcToMain", {
      configurable: true,
      writable: true,
      value: {
        queries: {
          app: {
            getSettings: vi.fn().mockResolvedValue({ connections: [] }),
          },
        },
        notifications: {
          render: vi.fn(() => vi.fn()),
          connectionStatus: vi.fn(() => vi.fn()),
        },
        commands: { app: { notifyMain: vi.fn() } },
      },
    });

    const { result } = renderHook(() =>
      useConnectionDialogController({
        connectionsRef: undefined,
        connDlgRef: { current: connDialog } as never,
        // outputRef.current is null → resetDialogState if(outputRef.current) false branch
        outputRef: { current: null } as never,
      }),
    );

    await waitFor(() => {
      expect(result.current.definedConnections).toHaveLength(0);
    });

    // showDialog calls resetDialogState which has the if(outputRef.current) check
    await act(async () => {
      result.current.showDialog();
    });

    // If we get here without throwing, the false branch was safely handled
    expect(connDialog.show).toHaveBeenCalled();
  });
});
