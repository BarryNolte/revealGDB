// @vitest-environment node

import { EventEmitter } from "events";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SelectedConnection } from "../../../common/gdb-common";
import type { gdbStateDatabase } from "../gdb-state-database/gdbStateDatabase";
import { OutputAvailableEventArgs } from "./gdb-connector";

const { spawnMock, notifierMock, resetNotifierState, setNotifierWatching, setFilePrefixMock } =
  vi.hoisted(() => {
    let watchingConsole = false;

    return {
      spawnMock: vi.fn(),
      notifierMock: {
        notifyGdbStartup: vi.fn(),
        isWatchingConsole: vi.fn(() => watchingConsole),
        endWatchingConsole: vi.fn(() => {
          watchingConsole = false;
        }),
        consoleCapture: vi.fn(),
      },
      resetNotifierState: () => {
        watchingConsole = false;
      },
      setNotifierWatching: (value: boolean) => {
        watchingConsole = value;
      },
      setFilePrefixMock: vi.fn(),
    };
  });

vi.mock("child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("child_process")>();

  return {
    ...actual,
    spawn: spawnMock,
  };
});

vi.mock("../../utilities/ConnectionNotifier", () => ({
  ConnectionNotifier: {
    shellRunning: "(revealGDB) Shell Running (revealGDB)",
    runningCommandsComplete: "(revealGDB) Commands Complete (revealGDB)",
    getInstance: vi.fn(() => notifierMock),
  },
}));

import { gdbConnectorIdfOnWsl } from "./gdb-connector-general";

type MockChildProcess = EventEmitter & {
  pid: number;
  exitCode: number | null;
  stdout: EventEmitter;
  stderr: EventEmitter;
  stdin: {
    cork: ReturnType<typeof vi.fn>;
    write: ReturnType<typeof vi.fn>;
    uncork: ReturnType<typeof vi.fn>;
  };
  kill: ReturnType<typeof vi.fn>;
};

type WslSelectedConnection = SelectedConnection & {
  wslDistribution: string;
};

function createMockChildProcess(): MockChildProcess {
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();

  return Object.assign(new EventEmitter(), {
    pid: 321,
    exitCode: null,
    stdout,
    stderr,
    stdin: {
      cork: vi.fn(),
      write: vi.fn((data: string, callback?: (error?: Error | null) => void) => {
        callback?.(null);
        return true;
      }),
      uncork: vi.fn(),
    },
    kill: vi.fn(() => true),
  });
}

function createSelectedConnection(overrides: Partial<SelectedConnection> = {}): SelectedConnection {
  return {
    name: "Session",
    shell: "bash",
    commands: ["gdb --interpreter=mi"],
    ...overrides,
  };
}

function createWslConnection(
  overrides: Partial<WslSelectedConnection> = {},
): WslSelectedConnection {
  return {
    ...createSelectedConnection({ shell: "wsl" }),
    wslDistribution: "Ubuntu",
    ...overrides,
  };
}

describe("gdbConnectorIdfOnWsl", () => {
  let db: gdbStateDatabase;
  let connector: gdbConnectorIdfOnWsl;
  let childProcess: MockChildProcess;

  beforeEach(() => {
    vi.clearAllMocks();
    resetNotifierState();
    childProcess = createMockChildProcess();
    spawnMock.mockReturnValue(childProcess);
    db = {
      gdbSrcFileCache: {
        setFilePrefix: setFilePrefixMock,
      },
    } as unknown as gdbStateDatabase;
    connector = new gdbConnectorIdfOnWsl(db);
  });

  it("starts the shell, sets the WSL file prefix, and sends bootstrap commands in order", () => {
    const inputListener = vi.fn();
    connector.on("gdb-input", inputListener);

    const started = connector.Start(
      createWslConnection({
        name: "WSL session",
        commands: ["cd /work/revealGDB", "gdb --interpreter=mi"],
      }),
    );

    expect(started).toBe(true);
    expect(notifierMock.notifyGdbStartup).toHaveBeenCalledWith("starting-shell", "in-progress");
    expect(setFilePrefixMock).toHaveBeenCalledWith("//wsl$/Ubuntu");
    expect(spawnMock).toHaveBeenCalledWith("wsl", undefined, {
      cwd: "",
      shell: false,
      windowsHide: true,
    });

    const writtenCommands = childProcess.stdin.write.mock.calls.map(([data]) => data);
    expect(writtenCommands).toHaveLength(4);
    expect(writtenCommands[0]).toContain("(revealGDB) Shell Running (revealGDB)");
    expect(writtenCommands[1]).toContain("cd /work/revealGDB");
    expect(writtenCommands[2]).toContain("(revealGDB) Commands Complete (revealGDB)");
    expect(writtenCommands[3]).toContain("gdb --interpreter=mi");

    expect(inputListener).toHaveBeenNthCalledWith(
      1,
      "echo '(revealGDB) Shell Running (revealGDB)'\n",
    );
    expect(inputListener).toHaveBeenNthCalledWith(2, "cd /work/revealGDB\n");
    expect(inputListener).toHaveBeenNthCalledWith(
      3,
      "echo '(revealGDB) Commands Complete (revealGDB)'\n",
    );
    expect(inputListener).toHaveBeenNthCalledWith(4, "gdb --interpreter=mi\n");
  });

  it("emits data, error, and end events from the child process", () => {
    const dataListener = vi.fn();
    const errorListener = vi.fn();
    const endListener = vi.fn();
    connector.on("gdb-data", dataListener);
    connector.on("gdb-error", errorListener);
    connector.on("gdb-end", endListener);

    connector.Start(
      createSelectedConnection({
        name: "Bash session",
        commands: ["gdb --interpreter=mi"],
      }),
    );

    childProcess.stdout.emit("data", new TextEncoder().encode('~"hello\\n"'));
    childProcess.stderr.emit("data", new TextEncoder().encode("startup warning"));
    childProcess.emit("close", 0, "SIGTERM");

    expect(dataListener).toHaveBeenCalledTimes(1);
    expect(dataListener.mock.calls[0][0]).toBeInstanceOf(OutputAvailableEventArgs);
    expect(dataListener.mock.calls[0][0].Output).toBe('~"hello\\n"');

    expect(errorListener).toHaveBeenCalledTimes(1);
    expect(errorListener.mock.calls[0][0]).toBeInstanceOf(OutputAvailableEventArgs);
    expect(errorListener.mock.calls[0][0].Output).toBe("startup warning");
    expect(endListener).toHaveBeenCalledWith(0, "SIGTERM");
    expect(setFilePrefixMock).not.toHaveBeenCalled();
  });

  it("routes console capture while the notifier is watching the startup console", () => {
    setNotifierWatching(true);
    const dataListener = vi.fn();
    const errorListener = vi.fn();
    connector.on("gdb-data", dataListener);
    connector.on("gdb-error", errorListener);

    connector.Start(
      createWslConnection({
        name: "WSL session",
        commands: ["gdb --interpreter=mi"],
      }),
    );

    childProcess.stdout.emit("data", new TextEncoder().encode("waiting for target\n"));
    childProcess.stderr.emit("data", new TextEncoder().encode("warning text\n"));

    expect(notifierMock.consoleCapture).toHaveBeenNthCalledWith(1, false, "waiting for target\n");
    expect(notifierMock.consoleCapture).toHaveBeenNthCalledWith(2, true, "warning text\n");
    expect(dataListener).not.toHaveBeenCalled();
    expect(errorListener).not.toHaveBeenCalled();
  });

  it("exits console watch mode when MI output arrives and resumes normal data events", () => {
    setNotifierWatching(true);
    const dataListener = vi.fn();
    connector.on("gdb-data", dataListener);

    connector.Start(
      createWslConnection({
        name: "WSL session",
        commands: ["gdb --interpreter=mi"],
      }),
    );

    childProcess.stdout.emit("data", new TextEncoder().encode("^running"));

    expect(notifierMock.endWatchingConsole).toHaveBeenCalledTimes(1);
    expect(notifierMock.notifyGdbStartup).toHaveBeenNthCalledWith(2, "target-running", "completed");
    expect(notifierMock.consoleCapture).not.toHaveBeenCalled();
    expect(dataListener).toHaveBeenCalledTimes(1);
    expect(dataListener.mock.calls[0][0].Output).toBe("^running");
  });

  it("reports running state and delegates shutdown to the child process", () => {
    connector.Start(
      createSelectedConnection({
        name: "Bash session",
        commands: ["gdb --interpreter=mi"],
      }),
    );

    expect(connector.IsRunning()).toBe(true);
    expect(connector.End()).toBe(true);
    expect(childProcess.kill).toHaveBeenCalledTimes(1);

    childProcess.exitCode = 0;
    expect(connector.IsRunning()).toBe(false);
  });
});
