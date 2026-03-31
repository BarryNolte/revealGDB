import { describe, expect, it } from "vitest";
import {
  DEFAULT_WSL_DISTRO,
  getShellKeyFromConnection,
  mergeUniqueDistros,
  normalizeConnectionForStorage,
  normalizeDistroName,
  normalizeShellKey,
  toCommandStrings,
  toDragAndDropItems,
} from "../../../../src/renderer/Dialogs/useConnectionManagerController";

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
});
