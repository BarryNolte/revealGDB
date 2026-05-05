/**
 * Implements connection manager model dialog state and interaction workflows in the renderer.
 *
 * @remarks
 * Exported symbols include `Platform`, `ShellOption`, `ConnectionGridRow`, `NormalizedConnection`, `DEFAULT_WSL_DISTRO`, `shells`, `DEFAULT_COMMANDS_LIST`, `normalizeDistroName`, and others. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import type { NormalizedConnection } from "../../common/connection-types";
import { GdbAny } from "../../common/gdb-common";
import { DragAndDropListItem } from "../Components/DragAndDropList/DragAndDropList";
export type { NormalizedConnection };

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

/**
 * Normalizes distro name into a consistent representation.
 *
 * @param value - Value to validate, normalize, or transform before further processing.
 * @returns The resulting string value produced by this operation.
 */
export function normalizeDistroName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/**
 * Performs merge unique distros as part of this module's public API.
 *
 * @param lists - Value for `lists` consumed by this operation.
 * @returns The resulting collection produced by this operation.
 */
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

/**
 * Performs to command strings as part of this module's public API.
 *
 * @param commandsValue - Debugger command text or command descriptor to execute.
 * @returns The resulting collection produced by this operation.
 */
export function toCommandStrings(commandsValue: unknown): string[] {
  if (Array.isArray(commandsValue)) {
    return commandsValue.map((value) => String(value).trim()).filter((value) => value.length > 0);
  }

  return String(commandsValue ?? "")
    .split("\n")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

/**
 * Performs to drag and drop items as part of this module's public API.
 *
 * @param commandsValue - Debugger command text or command descriptor to execute.
 * @returns The resulting collection produced by this operation.
 */
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

/**
 * Performs drag and drop items to command strings as part of this module's public API.
 *
 * @param items - Value for `items` consumed by this operation.
 * @returns The resulting collection produced by this operation.
 */
export function dragAndDropItemsToCommandStrings(items: DragAndDropListItem[]): string[] {
  return items
    .map((item) => String(typeof item === "string" ? item : item.text).trim())
    .filter((value) => value.length > 0);
}

// ---------------------------------------------------------------------------
// Pure helpers — shell resolution
// ---------------------------------------------------------------------------

/**
 * Normalizes shell key into a consistent representation.
 *
 * @param shellValue - Value for `shellValue` consumed by this operation.
 * @param fallbackKey - Value for `fallbackKey` consumed by this operation.
 * @returns The resulting string value produced by this operation.
 */
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

/**
 * Returns shell key from connection from current state.
 *
 * @param connection - Value for `connection` consumed by this operation.
 * @param fallbackKey - Value for `fallbackKey` consumed by this operation.
 * @returns The resulting string value produced by this operation.
 */
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

/**
 * Returns shell label from current state.
 *
 * @param shellKey - Value for `shellKey` consumed by this operation.
 * @returns The resulting string value produced by this operation.
 */
export function getShellLabel(shellKey: string): string {
  return shells[shellKey]?.type ?? shellKey;
}

// ---------------------------------------------------------------------------
// Pure helpers — connection normalization
// ---------------------------------------------------------------------------

/**
 * Normalizes connection for storage into a consistent representation.
 *
 * @param connection - Value for `connection` consumed by this operation.
 * @param fallbackName - Value for `fallbackName` consumed by this operation.
 * @param fallbackShellKey - Value for `fallbackShellKey` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
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

/**
 * Maps source input into connection to grid row output.
 *
 * @param connection - Value for `connection` consumed by this operation.
 * @param index - Zero-based index used to address a specific item.
 * @param fallbackShellKey - Value for `fallbackShellKey` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
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

/**
 * Extracts settings connections from the provided input.
 *
 * @param settings - Value for `settings` consumed by this operation.
 * @returns The resulting collection produced by this operation.
 */
export function extractSettingsConnections(settings: GdbAny): GdbAny[] {
  if (Array.isArray(settings?.connections)) return settings.connections;
  if (Array.isArray(settings?.gdb?.connections)) return settings.gdb.connections;
  return [];
}

/**
 * Performs build connection from form as part of this module's public API.
 *
 * @param name - Value for `name` consumed by this operation.
 * @param shellKey - Value for `shellKey` consumed by this operation.
 * @param commands - Debugger command text or command descriptor to execute.
 * @param wslDistribution - Value for `wslDistribution` consumed by this operation.
 * @param fallbackShellKey - Value for `fallbackShellKey` consumed by this operation.
 * @returns The computed result produced by this operation.
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
