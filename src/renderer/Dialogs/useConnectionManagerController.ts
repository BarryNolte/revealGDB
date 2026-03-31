import { GridComponent } from "@syncfusion/ej2-react-grids";
import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { GdbAny } from "../../common/gdb-common";
import { DragAndDropListItem } from "../Components/DragAndDropList/DragAndDropList";

export type Platform = "win32" | "linux" | "darwin";
export type ShellOption = {
  type: string;
  platform: Platform[];
  cmdLine: string;
};

export const DEFAULT_WSL_DISTRO = "default";

export const shells: Record<string, ShellOption> = {
  wsl: {
    type: "WSL",
    platform: ["win32"],
    cmdLine: "wsl",
  },
  bash: { type: "Bash", platform: ["linux", "darwin"], cmdLine: "bash" },
  zsh: { type: "Zsh", platform: ["linux", "darwin"], cmdLine: "zsh" },
  cmd: { type: "CMD", platform: ["win32"], cmdLine: "cmd" },
  pwsh: { type: "PowerShell", platform: ["win32"], cmdLine: "pwsh" },
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

export function normalizeDistroName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function mergeUniqueDistros(...lists: string[][]): string[] {
  const uniqueMap = new Map<string, string>();

  for (const list of lists) {
    for (const item of list) {
      const normalized = normalizeDistroName(String(item ?? ""));
      if (!normalized) {
        continue;
      }

      const dedupeKey = normalized.toLocaleLowerCase();
      if (!uniqueMap.has(dedupeKey)) {
        uniqueMap.set(dedupeKey, normalized);
      }
    }
  }

  return Array.from(uniqueMap.values());
}

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

export function normalizeConnectionForStorage(
  connection: GdbAny,
  fallbackName: string,
  fallbackShellKey: string,
): NormalizedConnection {
  const shellKey = getShellKeyFromConnection(connection, fallbackShellKey);
  const normalizedConnection: NormalizedConnection = {
    name: String(connection.name ?? fallbackName).trim() || fallbackName,
    shell: shellKey,
    commands: toCommandStrings(connection.commands ?? connection.extraArguments ?? []),
  };

  const wslDistribution = normalizeDistroName(String(connection.wslDistribution ?? ""));
  if (
    shellKey === "wsl" &&
    wslDistribution &&
    wslDistribution.toLocaleLowerCase() !== DEFAULT_WSL_DISTRO.toLocaleLowerCase()
  ) {
    normalizedConnection.wslDistribution = wslDistribution;
  }

  if (normalizedConnection.commands.length === 0) {
    normalizedConnection.commands = ["gdb"];
  }

  return normalizedConnection;
}

type UseConnectionManagerControllerArgs = {
  onCloseCallbackRef: RefObject<(() => void) | null>;
};

export function useConnectionManagerController({
  onCloseCallbackRef,
}: UseConnectionManagerControllerArgs) {
  const shellOptions = useMemo(
    () => Object.entries(shells).map(([key, shell]) => ({ key, label: shell.type })),
    [],
  );

  const fallbackShellKey = shellOptions[0]?.key ?? "wsl";

  const [hideDialog, setHideDialog] = useState(false);
  const [connections, setConnections] = useState<ConnectionGridRow[]>([]);
  const [loadedConnections, setLoadedConnections] = useState<GdbAny[]>([]);
  const connectionsGridRef = useRef<GridComponent>(null);
  const connectionNameInputRef = useRef<HTMLInputElement>(null);
  const shellSelectRef = useRef<HTMLSelectElement>(null);
  const addConnectionButtonRef = useRef<HTMLButtonElement>(null);
  const [isAddingConnection, setIsAddingConnection] = useState(false);
  const [connectionName, setConnectionName] = useState<string>("");
  const [selectedShellKey, setSelectedShellKey] = useState<string>(fallbackShellKey);
  const [wslDistros, setWslDistros] = useState<string[]>([DEFAULT_WSL_DISTRO]);
  const [selectedWslDistro, setSelectedWslDistro] = useState<string>(DEFAULT_WSL_DISTRO);
  const [commandsList, setCommandsList] = useState<DragAndDropListItem[]>([
    { text: "gdb", id: "list-01" },
  ]);

  const selectedShellLabel = useMemo(() => {
    const matchedShell = shellOptions.find((shellOption) => shellOption.key === selectedShellKey);
    return matchedShell?.label ?? shells.wsl.type;
  }, [selectedShellKey, shellOptions]);

  const commandsListKey = useMemo(
    () => commandsList.map((item) => (typeof item === "string" ? item : item.text)).join("\u0001"),
    [commandsList],
  );

  const handleOnReorder = useCallback((items: DragAndDropListItem[]): void => {
    setCommandsList(items);
  }, []);

  const shellChangeHandler = useCallback(
    (e: ChangeEvent<HTMLSelectElement>): void => {
      setSelectedShellKey(normalizeShellKey(e.target.value, fallbackShellKey));
    },
    [fallbackShellKey],
  );

  useEffect(() => {
    const shellElement = shellSelectRef.current;
    if (!shellElement) {
      return;
    }

    const nativeShellChangeHandler = (event: Event): void => {
      const target = event.target as HTMLSelectElement | null;
      if (!target) {
        return;
      }

      setSelectedShellKey(normalizeShellKey(target.value, fallbackShellKey));
    };

    shellElement.addEventListener("change", nativeShellChangeHandler);

    return () => {
      shellElement.removeEventListener("change", nativeShellChangeHandler);
    };
  }, [fallbackShellKey, hideDialog]);

  useEffect(() => {
    const connectionNameElement = connectionNameInputRef.current;
    if (!connectionNameElement) {
      return;
    }

    const nativeConnectionNameInputHandler = (event: Event): void => {
      const target = event.target as HTMLInputElement | null;
      if (!target) {
        return;
      }

      setConnectionName(target.value);
    };

    connectionNameElement.addEventListener("input", nativeConnectionNameInputHandler);
    connectionNameElement.addEventListener("change", nativeConnectionNameInputHandler);

    return () => {
      connectionNameElement.removeEventListener("input", nativeConnectionNameInputHandler);
      connectionNameElement.removeEventListener("change", nativeConnectionNameInputHandler);
    };
  }, [hideDialog]);

  const isWslShellSelected = selectedShellLabel.toLocaleLowerCase() === "wsl";

  const wslDistroChangeHandler = useCallback((e: ChangeEvent<HTMLSelectElement>): void => {
    setSelectedWslDistro(e.target.value);
  }, []);

  const connectionNameChangeHandler = useCallback((e: ChangeEvent<HTMLInputElement>): void => {
    setConnectionName(e.target.value);
  }, []);

  const applyConnectionToForm = useCallback(
    (connection: NormalizedConnection | null): void => {
      if (!connection) {
        setConnectionName("");
        setSelectedShellKey(fallbackShellKey);
        setSelectedWslDistro((current) => current || wslDistros[0] || DEFAULT_WSL_DISTRO);
        setCommandsList([{ text: "gdb", id: "list-01" }]);
        return;
      }

      setConnectionName(connection.name);
      setSelectedShellKey(normalizeShellKey(connection.shell, fallbackShellKey));
      setSelectedWslDistro(connection.wslDistribution || wslDistros[0] || DEFAULT_WSL_DISTRO);
      setCommandsList(toDragAndDropItems(connection.commands));
    },
    [fallbackShellKey, wslDistros],
  );

  const normalizeConnectionRow = useCallback(
    (connection: GdbAny, index: number): ConnectionGridRow => {
      const commands = toCommandStrings(connection.commands).join("\n");
      const shellKey = getShellKeyFromConnection(connection, fallbackShellKey);
      const shellLabel = shells[shellKey]?.type ?? String(connection.shell ?? shellKey);

      return {
        connectionIndex: index,
        name: String(connection.name ?? ""),
        shell: shellLabel,
        commands,
      };
    },
    [fallbackShellKey],
  );

  const handleConnectionRowSelected = useCallback(
    (args: { data?: ConnectionGridRow }): void => {
      const selectedIndex = args.data?.connectionIndex;
      if (typeof selectedIndex !== "number") {
        return;
      }

      const selectedConnection = loadedConnections[selectedIndex] as
        | NormalizedConnection
        | undefined;
      if (!selectedConnection) {
        return;
      }

      applyConnectionToForm(selectedConnection);
    },
    [applyConnectionToForm, loadedConnections],
  );

  const loadConnectionsFromSettings = useCallback(async (): Promise<NormalizedConnection[]> => {
    try {
      const settings = (await window.ipcToMain.queries.app.getSettings()) as GdbAny;
      const settingsConnections = Array.isArray(settings?.connections)
        ? settings.connections
        : Array.isArray(settings?.gdb?.connections)
          ? settings.gdb.connections
          : [];

      const normalizedSourceConnections: NormalizedConnection[] = (settingsConnections as GdbAny[])
        .filter((connection: unknown) => connection && typeof connection === "object")
        .map((connection: GdbAny, index: number) =>
          normalizeConnectionForStorage(connection, `Connection ${index + 1}`, fallbackShellKey),
        );

      setLoadedConnections(normalizedSourceConnections);
      setConnections(
        normalizedSourceConnections.map((connection, index) =>
          normalizeConnectionRow(connection, index),
        ),
      );
      applyConnectionToForm(normalizedSourceConnections[0] ?? null);
      return normalizedSourceConnections;
    } catch (error) {
      console.error("Failed to load connections from settings", error);
      setLoadedConnections([]);
      setConnections([]);
      applyConnectionToForm(null);
      return [];
    }
  }, [applyConnectionToForm, fallbackShellKey, normalizeConnectionRow]);

  const loadWslDistrosFromSystem = useCallback(async (): Promise<void> => {
    try {
      const distros = await window.ipcToMain.queries.environment.getWslDistrobutions();
      const systemDistroNames = distros
        .map((distro) => normalizeDistroName(String(distro.name ?? "")))
        .filter((name) => name.length > 0);

      const distroNames = mergeUniqueDistros(systemDistroNames, [DEFAULT_WSL_DISTRO]);

      if (distroNames.length === 0) {
        distroNames.push(DEFAULT_WSL_DISTRO);
      }

      setWslDistros(distroNames);
      setSelectedWslDistro((current) =>
        distroNames.includes(current) ? current : (distroNames[0] ?? DEFAULT_WSL_DISTRO),
      );
    } catch (error) {
      console.error("Failed to load WSL distributions", error);
      setWslDistros([DEFAULT_WSL_DISTRO]);
      setSelectedWslDistro((current) => current || DEFAULT_WSL_DISTRO);
    }
  }, []);

  useEffect(() => {
    if (!hideDialog) {
      return;
    }

    window.setTimeout(() => {
      connectionsGridRef.current?.refresh();
    }, 0);
  }, [connections, hideDialog]);

  const saveConnectionsToSettings = useCallback(
    async (connectionsToSave: GdbAny[]): Promise<void> => {
      try {
        const normalizedConnectionsToSave = connectionsToSave.map((connection: GdbAny, index) =>
          normalizeConnectionForStorage(connection, `Connection ${index + 1}`, fallbackShellKey),
        );

        await window.ipcToMain.commands.app.notifyMain({
          command: "save-connections",
          data: { connections: normalizedConnectionsToSave },
        });
      } catch (error) {
        console.error("Failed to save connections to settings", error);
      }
    },
    [fallbackShellKey],
  );

  const handleDeleteConnection = useCallback(
    async (index: number): Promise<void> => {
      const updatedLoadedConnections = loadedConnections.filter((_, i) => i !== index);
      setLoadedConnections(updatedLoadedConnections);
      setConnections(
        updatedLoadedConnections.map((connection, connIndex) =>
          normalizeConnectionRow(connection, connIndex),
        ),
      );
      await saveConnectionsToSettings(updatedLoadedConnections);
    },
    [loadedConnections, normalizeConnectionRow, saveConnectionsToSettings],
  );

  const handleAddConnection = useCallback(async (): Promise<void> => {
    if (isAddingConnection) {
      return;
    }

    setIsAddingConnection(true);
    try {
      const connectionNameForSave = connectionNameInputRef.current?.value ?? connectionName;
      const commandsArray = commandsList
        .map((item) => {
          const itemData = typeof item === "string" ? item : item.text;
          return String(itemData).trim();
        })
        .filter((value) => value.length > 0);

      const newConnection = normalizeConnectionForStorage(
        {
          name: connectionNameForSave.trim() || "Unnamed Connection",
          shell: selectedShellKey,
          commands: commandsArray,
          wslDistribution: selectedWslDistro,
        },
        "Unnamed Connection",
        fallbackShellKey,
      );

      const updatedLoadedConnections = [...loadedConnections, newConnection];

      setLoadedConnections(updatedLoadedConnections);
      setConnections(
        updatedLoadedConnections.map((connection, index) =>
          normalizeConnectionRow(connection, index),
        ),
      );

      await saveConnectionsToSettings(updatedLoadedConnections);

      setConnectionName("");
      setSelectedShellKey(fallbackShellKey);
      setSelectedWslDistro(wslDistros[0] ?? DEFAULT_WSL_DISTRO);
      setCommandsList([{ text: "gdb", id: "list-01" }]);
    } catch (error) {
      console.error("Failed to add connection", error);
    } finally {
      setIsAddingConnection(false);
    }
  }, [
    commandsList,
    connectionName,
    fallbackShellKey,
    isAddingConnection,
    loadedConnections,
    normalizeConnectionRow,
    saveConnectionsToSettings,
    selectedShellKey,
    selectedWslDistro,
    wslDistros,
  ]);

  useEffect(() => {
    const addButton = addConnectionButtonRef.current;
    if (!addButton) {
      return;
    }

    const nativeAddConnectionClickHandler = (): void => {
      void handleAddConnection();
    };

    addButton.addEventListener("click", nativeAddConnectionClickHandler);

    return () => {
      addButton.removeEventListener("click", nativeAddConnectionClickHandler);
    };
  }, [handleAddConnection, hideDialog]);

  useEffect(() => {
    if (wslDistros.includes(selectedWslDistro)) {
      return;
    }

    setSelectedWslDistro(wslDistros[0] ?? DEFAULT_WSL_DISTRO);
  }, [selectedWslDistro, wslDistros]);

  const dialogCloseFunc = useCallback(() => {
    setHideDialog(false);
    onCloseCallbackRef.current?.();
    onCloseCallbackRef.current = null;
  }, [onCloseCallbackRef]);

  const dialogOpenFunc = useCallback(() => {
    void (async () => {
      await loadConnectionsFromSettings();
      await loadWslDistrosFromSystem();
    })();
  }, [loadConnectionsFromSettings, loadWslDistrosFromSystem]);

  const showDialog = useCallback(
    (onClose?: () => void) => {
      onCloseCallbackRef.current = onClose ?? null;
      setHideDialog(true);
    },
    [onCloseCallbackRef],
  );

  return {
    hideDialog,
    shellOptions,
    isWslShellSelected,
    commandsList,
    commandsListKey,
    connectionName,
    selectedShellLabel,
    wslDistros,
    selectedWslDistro,
    isAddingConnection,
    connections,
    connectionsGridRef,
    connectionNameInputRef,
    shellSelectRef,
    addConnectionButtonRef,
    handleOnReorder,
    shellChangeHandler,
    wslDistroChangeHandler,
    connectionNameChangeHandler,
    handleConnectionRowSelected,
    handleDeleteConnection,
    dialogCloseFunc,
    dialogOpenFunc,
    showDialog,
  };
}
