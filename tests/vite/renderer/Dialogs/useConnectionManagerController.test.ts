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

import { describe, expect, it } from "vitest";
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
    const result = buildConnectionFromForm(
      "   ",
      "bash",
      [{ text: "gdb", id: "1" }],
      "",
      "bash",
    );

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
});
