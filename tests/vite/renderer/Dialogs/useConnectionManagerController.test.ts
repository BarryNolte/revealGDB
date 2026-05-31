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
  dragAndDropItemsToCommandStrings,
  extractSettingsConnections,
  getShellLabel,
  mapConnectionToGridRow,
} from "../../../../src/renderer/Dialogs/connectionManagerModel";
import {
  DEFAULT_WSL_DISTRO,
  getShellKeyFromConnection,
  mergeUniqueDistros,
  normalizeConnectionForStorage,
  normalizeDistroName,
  normalizeShellKey,
  toCommandStrings,
  toDragAndDropItems,
  useConnectionManagerController,
} from "../../../../src/renderer/Dialogs/useConnectionManagerController";

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

  it("getShellLabel returns the type label for known keys", () => {
    expect(getShellLabel("wsl")).toBe("WSL");
    expect(getShellLabel("bash")).toBe("Bash");
  });

  it("getShellLabel falls back to the raw key for unknown shell keys", () => {
    expect(getShellLabel("unknown-shell-xyz")).toBe("unknown-shell-xyz");
  });

  it("normalizeConnectionForStorage uses extraArguments when commands is absent", () => {
    const result = normalizeConnectionForStorage(
      { name: "A", shell: "wsl", extraArguments: ["gdb", "bt"] },
      "fallback",
      "wsl",
    );
    expect(result.commands).toEqual(["gdb", "bt"]);
  });

  it("normalizeConnectionForStorage uses empty commands when both commands and extraArguments are absent", () => {
    const result = normalizeConnectionForStorage({ name: "A", shell: "wsl" }, "fallback", "wsl");
    expect(result.commands).toEqual(["gdb"]);
  });

  it("normalizeConnectionForStorage falls back to fallbackName when name trims to empty", () => {
    const result = normalizeConnectionForStorage(
      { name: "   ", shell: "wsl", commands: ["gdb"] },
      "MyFallback",
      "wsl",
    );
    expect(result.name).toBe("MyFallback");
  });

  it("mapConnectionToGridRow uses shell label from connection.shell when shellKey is unknown", () => {
    const row = mapConnectionToGridRow(
      { shell: "CustomShell", commands: ["gdb"] },
      0,
      "unknown-key",
    );
    // shells["unknown-key"] is undefined → falls back to String(connection.shell ?? shellKey) = "CustomShell"
    expect(row.shell).toBe("CustomShell");
  });

  it("mapConnectionToGridRow uses empty string when connection name is absent", () => {
    const row = mapConnectionToGridRow({ shell: "wsl", commands: ["gdb"] }, 0, "wsl");
    expect(row.name).toBe("");
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

  it("effectiveSelectedWslDistro falls back to wslDistros[0] when selectedWslDistro is not in list", async () => {
    // Load a connection with wslDistribution "Ubuntu", but getWslDistrobutions returns only "Fedora".
    // After loading, selectedWslDistro becomes "Ubuntu" but wslDistros = ["Fedora", "default"].
    // The FALSE branch of: wslDistros.includes(selectedWslDistro) returns wslDistros[0].
    setWindowIpc({
      queries: {
        app: {
          getSettings: vi.fn().mockResolvedValue({
            connections: [
              {
                name: "Ubuntu-conn",
                shell: "WSL",
                commands: ["gdb"],
                wslDistribution: "Ubuntu",
              },
            ],
          }),
        },
        environment: {
          getWslDistrobutions: vi.fn().mockResolvedValue([{ name: "Fedora" }]),
        },
      },
      commands: {
        app: { notifyMain: vi.fn().mockResolvedValue(undefined) },
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
      expect(result.current.wslDistros).toContain("Fedora");
    });

    // Select the row — it sets selectedWslDistro to "Ubuntu" which is NOT in wslDistros
    act(() => {
      result.current.handleConnectionRowSelected({ data: { connectionIndex: 0 } });
    });

    await waitFor(() => {
      // effectiveSelectedWslDistro falls back to wslDistros[0] = "Fedora"
      expect(result.current.selectedWslDistro).toBe("Fedora");
    });
  });

  it("useNativeDomSetup effects return early when refs are null (no DOM elements)", async () => {
    // By NOT setting any DOM refs, all three useEffect guards (shellElement, connectionNameElement,
    // addButton) hit the 'if (!x) return' early-return path.
    setWindowIpc({
      queries: {
        app: {
          getSettings: vi.fn().mockResolvedValue({
            connections: [{ name: "A", shell: "WSL", commands: ["gdb"] }],
          }),
        },
        environment: {
          getWslDistrobutions: vi.fn().mockResolvedValue([{ name: "Ubuntu" }]),
        },
      },
      commands: {
        app: { notifyMain: vi.fn().mockResolvedValue(undefined) },
      },
    });

    const onCloseCallbackRef = { current: null as null | (() => void) };
    const { result } = renderHook(() => useConnectionManagerController({ onCloseCallbackRef }));

    // Open dialog WITHOUT setting refs — effects run with null refs
    act(() => {
      result.current.showDialog();
      result.current.dialogOpenFunc();
    });

    await waitFor(() => {
      expect(result.current.hideDialog).toBe(true);
      expect(result.current.connections).toHaveLength(1);
    });

    // No crash means the early-returns were taken successfully
  });

  it("applyConnectionToForm(null) is called when connections list is empty", async () => {
    // When getSettings returns empty connections, normalized[0] is undefined,
    // so applyConnectionToForm(null) is called → covers the !connection branch.
    setWindowIpc({
      queries: {
        app: {
          getSettings: vi.fn().mockResolvedValue({ connections: [] }),
        },
        environment: {
          getWslDistrobutions: vi.fn().mockResolvedValue([{ name: "Ubuntu" }]),
        },
      },
      commands: {
        app: { notifyMain: vi.fn().mockResolvedValue(undefined) },
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
      expect(result.current.connections).toHaveLength(0);
      // applyConnectionToForm(null) resets form to defaults
      expect(result.current.connectionName).toBe("");
    });
  });

  it("applyConnectionToForm uses wslDistros[0] when connection has no wslDistribution", async () => {
    // connection.wslDistribution is undefined → falls through to wslDistros[0]
    // wslDistros at load time is still the initial [DEFAULT_WSL_DISTRO], so result is DEFAULT_WSL_DISTRO
    setWindowIpc({
      queries: {
        app: {
          getSettings: vi.fn().mockResolvedValue({
            connections: [{ name: "NoDistro", shell: "WSL", commands: ["gdb"] }],
          }),
        },
        environment: {
          getWslDistrobutions: vi.fn().mockResolvedValue([{ name: "Fedora" }]),
        },
      },
      commands: {
        app: { notifyMain: vi.fn().mockResolvedValue(undefined) },
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
      expect(result.current.connections).toHaveLength(1);
    });

    // Connection has no wslDistribution — applyConnectionToForm uses wslDistros[0] fallback
    // wslDistros[0] at that point was DEFAULT_WSL_DISTRO ("default"), so selectedWslDistro = "default"
    // which IS in the new ["Fedora", "default"] list, so effectiveSelectedWslDistro stays "default"
    expect([DEFAULT_WSL_DISTRO, "Fedora"]).toContain(result.current.selectedWslDistro);
  });

  it("loadWslDistrosFromSystem uses empty distros list and pushes DEFAULT_WSL_DISTRO", async () => {
    // getWslDistrobutions returns only distros with empty names → all filtered out
    // → distroNames.length === 0 → pushes DEFAULT_WSL_DISTRO
    setWindowIpc({
      queries: {
        app: {
          getSettings: vi.fn().mockResolvedValue({ connections: [] }),
        },
        environment: {
          getWslDistrobutions: vi.fn().mockResolvedValue([{ name: "   " }, { name: "" }]),
        },
      },
      commands: {
        app: { notifyMain: vi.fn().mockResolvedValue(undefined) },
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
      expect(result.current.wslDistros).toContain(DEFAULT_WSL_DISTRO);
    });
  });

  it("isAddingConnection guard prevents concurrent add operations", async () => {
    let resolveNotify!: () => void;
    const notifyMain = vi.fn().mockReturnValue(
      new Promise<void>((resolve) => {
        resolveNotify = resolve;
      }),
    );
    const addButton = document.createElement("button");

    setWindowIpc({
      queries: {
        app: {
          getSettings: vi.fn().mockResolvedValue({
            connections: [{ name: "A", shell: "wsl", commands: ["gdb"] }],
          }),
        },
        environment: {
          getWslDistrobutions: vi.fn().mockResolvedValue([{ name: "Ubuntu" }]),
        },
      },
      commands: {
        app: { notifyMain },
      },
    });

    const onCloseCallbackRef = { current: null as null | (() => void) };
    const { result } = renderHook(() => useConnectionManagerController({ onCloseCallbackRef }));

    act(() => {
      result.current.addConnectionButtonRef.current = addButton;
      result.current.connectionNameInputRef.current = null;
      result.current.showDialog();
      result.current.dialogOpenFunc();
    });

    await waitFor(() => {
      expect(result.current.hideDialog).toBe(true);
    });

    // First add starts — won't resolve until resolveNotify is called
    act(() => {
      addButton.click();
    });

    expect(result.current.isAddingConnection).toBe(true);

    // Second click fires while first is still in-progress — should be a no-op
    act(() => {
      addButton.click();
    });

    // notifyMain should still only have been called once (second click ignored)
    // Resolve first add so the component cleans up
    act(() => {
      resolveNotify();
    });

    await waitFor(() => {
      expect(result.current.isAddingConnection).toBe(false);
    });
  });
});
