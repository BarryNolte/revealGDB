// @vitest-environment jsdom

/**
 * useConnectionManagerController.test module.
 *
 * @remarks
 * Source module for useConnectionManagerController.test.
 */

/**
 * @file useConnectionManagerController.test.ts
 * @description Source module for useConnectionManagerController.test.
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildConnectionFromForm,
  DEFAULT_WSL_DISTRO,
  dragAndDropItemsToCommandStrings,
  extractSettingsConnections,
  getShellKeyFromConnection,
  mapConnectionToGridRow,
  mergeUniqueDistros,
  normalizeConnectionForStorage,
  normalizeDistroName,
  normalizeShellKey,
  toCommandStrings,
  toDragAndDropItems,
} from "../../../../src/renderer/Dialogs/connectionManagerModel";
import { useConnectionManagerController } from "../../../../src/renderer/Dialogs/useConnectionManagerController";

type IpcStub = {
  queries: {
    app: {
      getSettings: ReturnType<typeof vi.fn>;
    };
    environment: {
      getWslDistrobutions: ReturnType<typeof vi.fn>;
    };
  };
  commands: {
    app: {
      notifyMain: ReturnType<typeof vi.fn>;
    };
  };
};

function setWindowIpc(ipc: IpcStub): void {
  Object.defineProperty(window, "ipcToMain", {
    configurable: true,
    writable: true,
    value: ipc,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("useConnectionManagerController model helpers", () => {
  it("normalizes distro names and collapses whitespace", () => {
    expect(normalizeDistroName("  Ubuntu   24.04  ")).toBe("Ubuntu 24.04");
  });

  it("merges distro names case-insensitively", () => {
    const merged = mergeUniqueDistros(["Ubuntu", "debian"], ["ubuntu", "Debian", "Arch"]);
    expect(merged).toEqual(["Ubuntu", "debian", "Arch"]);
  });

  it("supports command arrays and newline strings", () => {
    expect(toCommandStrings([" gdb ", "", " target remote :1234 "])).toEqual([
      "gdb",
      "target remote :1234",
    ]);

    expect(toCommandStrings("gdb\n\n target remote :3333 ")).toEqual([
      "gdb",
      "target remote :3333",
    ]);
  });

  it("creates fallback drag/drop command list", () => {
    expect(toDragAndDropItems([])).toEqual([{ text: "gdb", id: "list-01" }]);
  });

  it("normalizes shell keys from labels and keys", () => {
    expect(normalizeShellKey("WSL", "wsl")).toBe("wsl");
    expect(normalizeShellKey("pwsh", "wsl")).toBe("pwsh");
    expect(normalizeShellKey("unknown", "wsl")).toBe("wsl");
  });

  it("resolves shell from connection fields", () => {
    expect(getShellKeyFromConnection({ shell: "Bash" }, "wsl")).toBe("bash");
    expect(getShellKeyFromConnection({ connectionType: "PowerShell" }, "wsl")).toBe("pwsh");
    expect(getShellKeyFromConnection({}, "wsl")).toBe("wsl");
  });

  it("normalizes persisted connection schema and defaults", () => {
    const normalized = normalizeConnectionForStorage(
      {
        name: "  Test Conn  ",
        shell: "WSL",
        commands: ["", "gdb", "target remote :1234"],
        wslDistribution: " Ubuntu ",
      },
      "Connection 1",
      "wsl",
    );

    expect(normalized).toEqual({
      name: "Test Conn",
      shell: "wsl",
      commands: ["gdb", "target remote :1234"],
      wslDistribution: "Ubuntu",
    });
  });

  it("omits default wsl distro and injects default command", () => {
    const normalized = normalizeConnectionForStorage(
      {
        name: "No Commands",
        shell: "wsl",
        commands: ["", "   "],
        wslDistribution: DEFAULT_WSL_DISTRO,
      },
      "Connection 1",
      "wsl",
    );

    expect(normalized).toEqual({
      name: "No Commands",
      shell: "wsl",
      commands: ["gdb"],
    });
  });

  // --- New tests for extracted model helpers ---

  it("extracts connections from settings.connections", () => {
    const conns = [{ name: "A" }, { name: "B" }];
    expect(extractSettingsConnections({ connections: conns })).toBe(conns);
  });

  it("extracts connections from settings.gdb.connections", () => {
    const conns = [{ name: "C" }];
    expect(extractSettingsConnections({ gdb: { connections: conns } })).toBe(conns);
  });

  it("returns empty array for missing connections", () => {
    expect(extractSettingsConnections({})).toEqual([]);
    expect(extractSettingsConnections(null)).toEqual([]);
    expect(extractSettingsConnections(undefined)).toEqual([]);
  });

  it("converts drag-and-drop items to command strings", () => {
    const items = [
      { text: "gdb", id: "1" },
      { text: "  target remote :1234  ", id: "2" },
      { text: "   ", id: "3" },
    ];
    expect(dragAndDropItemsToCommandStrings(items)).toEqual(["gdb", "target remote :1234"]);
  });

  it("builds connection from form values", () => {
    const result = buildConnectionFromForm(
      "  My Conn  ",
      "wsl",
      [
        { text: "gdb", id: "1" },
        { text: "target remote :1234", id: "2" },
      ],
      "Ubuntu",
      "wsl",
    );

    expect(result).toEqual({
      name: "My Conn",
      shell: "wsl",
      commands: ["gdb", "target remote :1234"],
      wslDistribution: "Ubuntu",
    });
  });

  it("builds connection with defaults for empty name", () => {
    const result = buildConnectionFromForm("   ", "bash", [{ text: "gdb", id: "1" }], "", "bash");

    expect(result.name).toBe("Unnamed Connection");
    expect(result.shell).toBe("bash");
  });

  it("maps connection to grid row", () => {
    const row = mapConnectionToGridRow(
      { name: "Test", shell: "wsl", commands: ["gdb", "bt"] },
      3,
      "wsl",
    );

    expect(row).toEqual({
      connectionIndex: 3,
      name: "Test",
      shell: "WSL",
      commands: "gdb\nbt",
    });
  });

  it("loads persisted data, reacts to native form events, and saves updated connections", async () => {
    const notifyMain = vi.fn().mockResolvedValue(undefined);
    const refresh = vi.fn();

    setWindowIpc({
      queries: {
        app: {
          getSettings: vi.fn().mockResolvedValue({
            connections: [
              null,
              {
                name: "Primary",
                shell: "WSL",
                commands: ["gdb", "target remote :3333"],
                wslDistribution: " Ubuntu ",
              },
            ],
          }),
        },
        environment: {
          getWslDistrobutions: vi
            .fn()
            .mockResolvedValue([{ name: "Ubuntu" }, { name: "   " }, { name: "Debian" }]),
        },
      },
      commands: {
        app: {
          notifyMain,
        },
      },
    });

    const onClose = vi.fn();
    const onCloseCallbackRef = { current: null as null | (() => void) };
    const { result } = renderHook(() => useConnectionManagerController({ onCloseCallbackRef }));

    const connectionInput = document.createElement("input");
    const shellSelect = document.createElement("select");
    shellSelect.innerHTML = '<option value="wsl">WSL</option><option value="bash">Bash</option>';
    const addButton = document.createElement("button");

    act(() => {
      result.current.connectionNameInputRef.current = connectionInput;
      result.current.shellSelectRef.current = shellSelect;
      result.current.addConnectionButtonRef.current = addButton;
      result.current.connectionsGridRef.current = { refresh } as never;
      result.current.showDialog(onClose);
      result.current.dialogOpenFunc();
    });

    await waitFor(() => {
      expect(result.current.hideDialog).toBe(true);
      expect(result.current.connections).toHaveLength(1);
      expect(result.current.connectionName).toBe("Primary");
      expect(result.current.selectedShellLabel).toBe("WSL");
      expect(result.current.selectedWslDistro).toBe("Ubuntu");
      expect(result.current.wslDistros).toEqual(["Ubuntu", "Debian", "default"]);
    });

    await waitFor(() => {
      expect(refresh).toHaveBeenCalled();
    });

    act(() => {
      connectionInput.value = "Native Added";
      connectionInput.dispatchEvent(new Event("input", { bubbles: true }));
      shellSelect.value = "bash";
      shellSelect.dispatchEvent(new Event("change", { bubbles: true }));
      result.current.handleOnReorder([{ text: "lldb", id: "cmd-1" }]);
      result.current.wslDistroChangeHandler({ target: { value: "Debian" } } as never);
    });

    await waitFor(() => {
      expect(result.current.connectionName).toBe("Native Added");
      expect(result.current.selectedShellLabel).toBe("Bash");
      expect(result.current.commandsListKey).toBe("lldb");
      expect(result.current.selectedWslDistro).toBe("Debian");
    });

    act(() => {
      addButton.click();
    });

    await waitFor(() => {
      expect(result.current.connections).toHaveLength(2);
      expect(notifyMain).toHaveBeenCalled();
    });

    const latestSaveCall = notifyMain.mock.calls.at(-1)?.[0];
    expect(latestSaveCall).toMatchObject({
      command: "save-connections",
      data: {
        connections: [
          {
            name: "Primary",
            shell: "wsl",
            commands: ["gdb", "target remote :3333"],
            wslDistribution: "Ubuntu",
          },
          {
            name: "Native Added",
            shell: "bash",
            commands: ["lldb"],
          },
        ],
      },
    });

    await act(async () => {
      await result.current.handleDeleteConnection(1);
    });

    expect(result.current.connections).toHaveLength(1);

    act(() => {
      result.current.handleConnectionRowSelected({});
      result.current.handleConnectionRowSelected({ data: { connectionIndex: 99 } });
      result.current.handleConnectionRowSelected({ data: { connectionIndex: 0 } });
    });

    await waitFor(() => {
      expect(result.current.connectionName).toBe("Primary");
      expect(result.current.selectedShellLabel).toBe("WSL");
      expect(result.current.commandsListKey).toBe("gdb\u0001target remote :3333");
    });

    act(() => {
      result.current.connectionNameChangeHandler({ target: { value: "Manual" } } as never);
      result.current.shellChangeHandler({ target: { value: "not-a-shell" } } as never);
    });

    await waitFor(() => {
      expect(result.current.connectionName).toBe("Manual");
      expect(result.current.selectedShellLabel).toBe("WSL");
    });

    act(() => {
      result.current.dialogCloseFunc();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onCloseCallbackRef.current).toBeNull();
  });

  it("falls back to defaults when settings or distro queries fail", async () => {
    setWindowIpc({
      queries: {
        app: {
          getSettings: vi.fn().mockRejectedValue(new Error("settings failed")),
        },
        environment: {
          getWslDistrobutions: vi.fn().mockRejectedValue(new Error("distros failed")),
        },
      },
      commands: {
        app: {
          notifyMain: vi.fn().mockResolvedValue(undefined),
        },
      },
    });

    const onCloseCallbackRef = { current: null as null | (() => void) };
    const { result } = renderHook(() => useConnectionManagerController({ onCloseCallbackRef }));

    act(() => {
      result.current.showDialog();
      result.current.dialogOpenFunc();
    });

    await waitFor(() => {
      expect(result.current.hideDialog).toBe(true);
      expect(result.current.connections).toEqual([]);
      expect(result.current.connectionName).toBe("");
      expect(result.current.selectedShellLabel).toBe("WSL");
      expect(result.current.selectedWslDistro).toBe(DEFAULT_WSL_DISTRO);
      expect(result.current.wslDistros).toEqual([DEFAULT_WSL_DISTRO]);
      expect(result.current.commandsList).toEqual([{ text: "gdb", id: "list-01" }]);
    });

    act(() => {
      result.current.dialogCloseFunc();
    });

    expect(onCloseCallbackRef.current).toBeNull();
  });
});
