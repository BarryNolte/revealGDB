/**
 * Implements ConnectionNotifier.test for revealGDB.
 *
 * @remarks
 * Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const notifierMocks = vi.hoisted(() => ({
  send: vi.fn(),
}));

vi.mock("../../../../src/main/ipc-sender", () => ({
  sendToRenderer: notifierMocks.send,
}));

import { ConnectionNotifier } from "../../../../src/main/utilities/ConnectionNotifier";

describe("ConnectionNotifier", () => {
  afterEach(() => {
    notifierMocks.send.mockClear();
  });

  it("returns a singleton instance and tracks console watching state", () => {
    const notifier = ConnectionNotifier.getInstance();
    const sameNotifier = ConnectionNotifier.getInstance();

    notifier.endWatchingConsole();
    expect(notifier.isWatchingConsole()).toBe(false);

    notifier.startWatchingConsole();
    expect(notifier.isWatchingConsole()).toBe(true);

    notifier.startWatchingConsole();
    notifier.endWatchingConsole();
    expect(notifier.isWatchingConsole()).toBe(false);
    expect(sameNotifier).toBe(notifier);
  });

  it("normalizes console output into startup and console-capture events", () => {
    const notifier = ConnectionNotifier.getInstance();

    notifier.consoleCapture(
      true,
      [
        ConnectionNotifier.shellRunning,
        "stderr line",
        ConnectionNotifier.runningCommandsComplete,
        "plain output",
      ].join("\n"),
    );

    expect(notifierMocks.send).toHaveBeenCalledWith("connection-status", [
      "gdb-startup",
      "starting-shell",
      "completed",
    ]);
    expect(notifierMocks.send).toHaveBeenCalledWith("connection-status", [
      "gdb-startup",
      "running-commands",
      "in-progress",
    ]);
    expect(notifierMocks.send).toHaveBeenCalledWith("connection-status", [
      "gdb-startup",
      "running-commands",
      "completed",
    ]);
    expect(notifierMocks.send).toHaveBeenCalledWith("connection-status", [
      "gdb-startup",
      "target-running",
      "in-progress",
    ]);
    expect(notifierMocks.send).toHaveBeenCalledWith("connection-status", [
      "console-capture",
      { error: true, line: "stderr line" },
    ]);
    expect(notifierMocks.send).toHaveBeenCalledWith("connection-status", [
      "console-capture",
      { error: true, line: "plain output" },
    ]);
  });

  it("detects startup markers from MI-escaped console lines", () => {
    const notifier = ConnectionNotifier.getInstance();

    notifier.consoleCapture(
      false,
      [
        `~"${ConnectionNotifier.shellRunning}\\r\\n"`,
        `~"${ConnectionNotifier.runningCommandsComplete}\\r\\n"`,
      ].join("\n"),
    );

    expect(notifierMocks.send).toHaveBeenCalledWith("connection-status", [
      "gdb-startup",
      "starting-shell",
      "completed",
    ]);
    expect(notifierMocks.send).toHaveBeenCalledWith("connection-status", [
      "gdb-startup",
      "running-commands",
      "completed",
    ]);
  });

  it("sends explicit startup notifications", () => {
    const notifier = ConnectionNotifier.getInstance();

    notifier.notifyGdbStartup("target-running", "failed");

    expect(notifierMocks.send).toHaveBeenCalledWith("connection-status", [
      "gdb-startup",
      "target-running",
      "failed",
    ]);
  });
});
