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
});
