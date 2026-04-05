/**
 * React hook for Connection Manager orchestration.
 *
 * All pure helpers, types, and constants live in ./connectionManagerModel.ts
 * so the hook is limited to React state, effects, refs, and IO.
 */

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
import {
  buildConnectionFromForm,
  DEFAULT_COMMANDS_LIST,
  DEFAULT_WSL_DISTRO,
  extractSettingsConnections,
  mapConnectionToGridRow,
  mergeUniqueDistros,
  normalizeConnectionForStorage,
  normalizeDistroName,
  normalizeShellKey,
  shells,
  toDragAndDropItems,
  type ConnectionGridRow,
  type NormalizedConnection,
} from "./connectionManagerModel";

// Re-export model surface so existing consumers keep working.
export {
  DEFAULT_WSL_DISTRO,
  getShellKeyFromConnection,
  mergeUniqueDistros,
  normalizeConnectionForStorage,
  normalizeDistroName,
  normalizeShellKey,
  shells,
  toCommandStrings,
  toDragAndDropItems,
  type ConnectionGridRow,
  type NormalizedConnection,
  type Platform,
  type ShellOption,
} from "./connectionManagerModel";

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
  const [commandsList, setCommandsList] = useState<DragAndDropListItem[]>(DEFAULT_COMMANDS_LIST);

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
        setCommandsList(DEFAULT_COMMANDS_LIST);
        return;
      }

      setConnectionName(connection.name);
      setSelectedShellKey(normalizeShellKey(connection.shell, fallbackShellKey));
      setSelectedWslDistro(connection.wslDistribution || wslDistros[0] || DEFAULT_WSL_DISTRO);
      setCommandsList(toDragAndDropItems(connection.commands));
    },
    [fallbackShellKey, wslDistros],
  );

  const toGridRows = useCallback(
    (conns: GdbAny[]) => conns.map((c, i) => mapConnectionToGridRow(c, i, fallbackShellKey)),
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
      const raw = extractSettingsConnections(settings);

      const normalized: NormalizedConnection[] = raw
        .filter((c: unknown) => c && typeof c === "object")
        .map((c: GdbAny, i: number) =>
          normalizeConnectionForStorage(c, `Connection ${i + 1}`, fallbackShellKey),
        );

      setLoadedConnections(normalized);
      setConnections(toGridRows(normalized));
      applyConnectionToForm(normalized[0] ?? null);
      return normalized;
    } catch (error) {
      console.error("Failed to load connections from settings", error);
      setLoadedConnections([]);
      setConnections([]);
      applyConnectionToForm(null);
      return [];
    }
  }, [applyConnectionToForm, fallbackShellKey, toGridRows]);

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
      const updated = loadedConnections.filter((_, i) => i !== index);
      setLoadedConnections(updated);
      setConnections(toGridRows(updated));
      await saveConnectionsToSettings(updated);
    },
    [loadedConnections, toGridRows, saveConnectionsToSettings],
  );

  const handleAddConnection = useCallback(async (): Promise<void> => {
    if (isAddingConnection) return;

    setIsAddingConnection(true);
    try {
      const nameForSave = connectionNameInputRef.current?.value ?? connectionName;

      const newConnection = buildConnectionFromForm(
        nameForSave,
        selectedShellKey,
        commandsList,
        selectedWslDistro,
        fallbackShellKey,
      );

      const updated = [...loadedConnections, newConnection];
      setLoadedConnections(updated);
      setConnections(toGridRows(updated));
      await saveConnectionsToSettings(updated);

      setConnectionName("");
      setSelectedShellKey(fallbackShellKey);
      setSelectedWslDistro(wslDistros[0] ?? DEFAULT_WSL_DISTRO);
      setCommandsList(DEFAULT_COMMANDS_LIST);
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
    toGridRows,
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
