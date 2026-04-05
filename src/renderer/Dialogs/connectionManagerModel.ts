/**
 * Pure data model for the Connection Manager.
 *
 * Contains all types, constants, and stateless helper functions that were
 * previously co-located inside useConnectionManagerController.ts.  Extracting
 * them keeps the React hook slim (orchestration only) and makes the helpers
 * independently testable.
 */

import { GdbAny } from "../../common/gdb-common";
import { DragAndDropListItem } from "../Components/DragAndDropList/DragAndDropList";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Platform = "win32" | "linux" | "darwin";

export type ShellOption = {
  type: string;
  platform: Platform[];
  cmdLine: string;
};

export type ConnectionGridRow = {
  connectionIndex: number;
  name: string;
  shell: string;
  commands: string;
};

export type NormalizedConnection = {
  name: string;
  shell: string;
  commands: string[];
  wslDistribution?: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DEFAULT_WSL_DISTRO = "default";

export const shells: Record<string, ShellOption> = {
  wsl: { type: "WSL", platform: ["win32"], cmdLine: "wsl" },
  bash: { type: "Bash", platform: ["linux", "darwin"], cmdLine: "bash" },
  zsh: { type: "Zsh", platform: ["linux", "darwin"], cmdLine: "zsh" },
  cmd: { type: "CMD", platform: ["win32"], cmdLine: "cmd" },
  pwsh: { type: "PowerShell", platform: ["win32"], cmdLine: "pwsh" },
};

export const DEFAULT_COMMANDS_LIST: DragAndDropListItem[] = [{ text: "gdb", id: "list-01" }];

// ---------------------------------------------------------------------------
// Pure helpers — distro names
// ---------------------------------------------------------------------------

export function normalizeDistroName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function mergeUniqueDistros(...lists: string[][]): string[] {
  const uniqueMap = new Map<string, string>();

  for (const list of lists) {
    for (const item of list) {
      const normalized = normalizeDistroName(String(item ?? ""));
      if (!normalized) continue;

      const dedupeKey = normalized.toLocaleLowerCase();
      if (!uniqueMap.has(dedupeKey)) {
        uniqueMap.set(dedupeKey, normalized);
      }
    }
  }

  return Array.from(uniqueMap.values());
}

// ---------------------------------------------------------------------------
// Pure helpers — commands
// ---------------------------------------------------------------------------

export function toCommandStrings(commandsValue: unknown): string[] {
  if (Array.isArray(commandsValue)) {
    return commandsValue.map((value) => String(value).trim()).filter((value) => value.length > 0);
  }

  return String(commandsValue ?? "")
    .split("\n")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export function toDragAndDropItems(commandsValue: unknown): DragAndDropListItem[] {
  const commandStrings = toCommandStrings(commandsValue);

  if (commandStrings.length === 0) {
    return [{ text: "gdb", id: "list-01" }];
  }

  return commandStrings.map((command, index) => ({
    text: command,
    id: `command-${index}`,
  }));
}

/** Convert DragAndDropListItems back into a trimmed string array. */
export function dragAndDropItemsToCommandStrings(items: DragAndDropListItem[]): string[] {
  return items
    .map((item) => String(typeof item === "string" ? item : item.text).trim())
    .filter((value) => value.length > 0);
}

// ---------------------------------------------------------------------------
// Pure helpers — shell resolution
// ---------------------------------------------------------------------------

export function normalizeShellKey(shellValue: string, fallbackKey: string): string {
  const normalizedValue = shellValue.trim().toLocaleLowerCase();
  if (normalizedValue in shells) {
    return normalizedValue;
  }

  const matchedEntry = Object.entries(shells).find(
    ([, shellOption]) => shellOption.type.toLocaleLowerCase() === normalizedValue,
  );

  return matchedEntry?.[0] ?? fallbackKey;
}

export function getShellKeyFromConnection(connection: GdbAny, fallbackKey: string): string {
  const shellValue = String(connection.shell ?? connection.connectionType ?? "").toLowerCase();
  if (shellValue in shells) {
    return shellValue;
  }

  const matchedEntry = Object.entries(shells).find(
    ([, shellOption]) => shellOption.type.toLowerCase() === shellValue,
  );

  return matchedEntry?.[0] ?? fallbackKey;
}

/** Resolve the human-readable shell label from a shell key. */
export function getShellLabel(shellKey: string): string {
  return shells[shellKey]?.type ?? shellKey;
}

// ---------------------------------------------------------------------------
// Pure helpers — connection normalization
// ---------------------------------------------------------------------------

export function normalizeConnectionForStorage(
  connection: GdbAny,
  fallbackName: string,
  fallbackShellKey: string,
): NormalizedConnection {
  const shellKey = getShellKeyFromConnection(connection, fallbackShellKey);
  const commands = toCommandStrings(connection.commands ?? connection.extraArguments ?? []);
  const name = String(connection.name ?? fallbackName).trim() || fallbackName;

  const normalized: NormalizedConnection = {
    name,
    shell: shellKey,
    commands: commands.length > 0 ? commands : ["gdb"],
  };

  const wslDistribution = normalizeDistroName(String(connection.wslDistribution ?? ""));
  if (
    shellKey === "wsl" &&
    wslDistribution &&
    wslDistribution.toLocaleLowerCase() !== DEFAULT_WSL_DISTRO.toLocaleLowerCase()
  ) {
    normalized.wslDistribution = wslDistribution;
  }

  return normalized;
}

/** Map a NormalizedConnection to the grid-row shape the UI needs. */
export function mapConnectionToGridRow(
  connection: GdbAny,
  index: number,
  fallbackShellKey: string,
): ConnectionGridRow {
  const commands = toCommandStrings(connection.commands).join("\n");
  const shellKey = getShellKeyFromConnection(connection, fallbackShellKey);
  const shellLabel = shells[shellKey]?.type ?? String(connection.shell ?? shellKey);

  return {
    connectionIndex: index,
    name: String(connection.name ?? ""),
    shell: shellLabel,
    commands,
  };
}

// ---------------------------------------------------------------------------
// Pure helpers — settings extraction
// ---------------------------------------------------------------------------

/** Pull the raw connections array out of a settings object (various legacy shapes). */
export function extractSettingsConnections(settings: GdbAny): GdbAny[] {
  if (Array.isArray(settings?.connections)) return settings.connections;
  if (Array.isArray(settings?.gdb?.connections)) return settings.gdb.connections;
  return [];
}

/**
 * Build a NormalizedConnection from the current form values.
 * This is a pure mapper — no side-effects.
 */
export function buildConnectionFromForm(
  name: string,
  shellKey: string,
  commands: DragAndDropListItem[],
  wslDistribution: string,
  fallbackShellKey: string,
): NormalizedConnection {
  return normalizeConnectionForStorage(
    {
      name: name.trim() || "Unnamed Connection",
      shell: shellKey,
      commands: dragAndDropItemsToCommandStrings(commands),
      wslDistribution,
    },
    "Unnamed Connection",
    fallbackShellKey,
  );
}
