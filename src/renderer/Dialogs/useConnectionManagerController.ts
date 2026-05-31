/**
 * Implements use connection manager controller dialog state and interaction workflows in the renderer.
 *
 * @remarks
 * Exported symbols include `useConnectionManagerController`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { GridComponent } from "@syncfusion/ej2-react-grids";
import {
  ChangeEvent,
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { DragAndDropListItem } from "../Components/DragAndDropList/DragAndDropList";
import type { ConnectionConfig, GdbSettings } from "../../common/settings-types";
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

export type UseConnectionManagerControllerArgs = {
  onCloseCallbackRef: RefObject<(() => void) | null>;
};

function useFormState(shellOptions: { key: string; label: string }[], fallbackShellKey: string) {
  const [connectionName, setConnectionName] = useState<string>("");
  const [selectedShellKey, setSelectedShellKey] = useState<string>(fallbackShellKey);
  const [wslDistros, setWslDistros] = useState<string[]>([DEFAULT_WSL_DISTRO]);
  const [selectedWslDistro, setSelectedWslDistro] = useState<string>(DEFAULT_WSL_DISTRO);
  const [commandsList, setCommandsList] = useState<DragAndDropListItem[]>(DEFAULT_COMMANDS_LIST);

  const selectedShellLabel = useMemo(() => {
    const matchedShell = shellOptions.find((s) => s.key === selectedShellKey);
    return matchedShell?.label ?? shells.wsl.type;
  }, [selectedShellKey, shellOptions]);

  const commandsListKey = useMemo(
    () => commandsList.map((item) => (typeof item === "string" ? item : item.text)).join("\u0001"),
    [commandsList],
  );

  // Derived: avoids the anti-pattern of synchronously calling setState inside an effect
  const effectiveSelectedWslDistro = wslDistros.includes(selectedWslDistro)
    ? selectedWslDistro
    : (wslDistros[0] ?? DEFAULT_WSL_DISTRO);

  const isWslShellSelected = selectedShellLabel.toLocaleLowerCase() === "wsl";

  const handleOnReorder = useCallback((items: DragAndDropListItem[]): void => {
    setCommandsList(items);
  }, []);

  const shellChangeHandler = useCallback(
    (e: ChangeEvent<HTMLSelectElement>): void => {
      setSelectedShellKey(normalizeShellKey(e.target.value, fallbackShellKey));
    },
    [fallbackShellKey],
  );

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

  return {
    connectionName,
    setConnectionName,
    selectedShellKey,
    setSelectedShellKey,
    wslDistros,
    setWslDistros,
    selectedWslDistro: effectiveSelectedWslDistro,
    setSelectedWslDistro,
    commandsList,
    setCommandsList,
    selectedShellLabel,
    commandsListKey,
    isWslShellSelected,
    handleOnReorder,
    shellChangeHandler,
    wslDistroChangeHandler,
    connectionNameChangeHandler,
    applyConnectionToForm,
  };
}

function useNativeDomSetup(
  shellSelectRef: RefObject<HTMLSelectElement | null>,
  connectionNameInputRef: RefObject<HTMLInputElement | null>,
  addConnectionButtonRef: RefObject<HTMLButtonElement | null>,
  fallbackShellKey: string,
  hideDialog: boolean,
  setSelectedShellKey: (key: string) => void,
  setConnectionName: (name: string) => void,
  handleAddConnection: () => Promise<void>,
): void {
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
  }, [fallbackShellKey, hideDialog, shellSelectRef, setSelectedShellKey]);

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
  }, [connectionNameInputRef, hideDialog, setConnectionName]);

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
  }, [addConnectionButtonRef, handleAddConnection, hideDialog]);
}

type FormState = ReturnType<typeof useFormState>;

async function saveConnectionsToSettings(
  connectionsToSave: NormalizedConnection[],
  fallbackShellKey: string,
): Promise<void> {
  try {
    const normalized = connectionsToSave.map((c: ConnectionConfig, i) =>
      normalizeConnectionForStorage(c, `Connection ${i + 1}`, fallbackShellKey),
    );
    await window.ipcToMain.commands.app.notifyMain({
      command: "save-connections",
      data: { connections: normalized },
    });
  } catch {
    // ignore
  }
}

function useHandleAddConnection(
  fallbackShellKey: string,
  connectionNameInputRef: RefObject<HTMLInputElement | null>,
  formState: FormState,
  loadedConnections: NormalizedConnection[],
  setLoadedConnections: Dispatch<SetStateAction<NormalizedConnection[]>>,
  setConnections: Dispatch<SetStateAction<ConnectionGridRow[]>>,
  toGridRows: (conns: NormalizedConnection[]) => ConnectionGridRow[],
) {
  const [isAddingConnection, setIsAddingConnection] = useState(false);
  const {
    connectionName,
    selectedShellKey,
    commandsList,
    selectedWslDistro,
    wslDistros,
    setConnectionName,
    setSelectedShellKey,
    setSelectedWslDistro,
    setCommandsList,
  } = formState;

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
      await saveConnectionsToSettings(updated, fallbackShellKey);
      setConnectionName("");
      setSelectedShellKey(fallbackShellKey);
      setSelectedWslDistro(wslDistros[0] ?? DEFAULT_WSL_DISTRO);
      setCommandsList(DEFAULT_COMMANDS_LIST);
    } catch {
      // ignore
    } finally {
      setIsAddingConnection(false);
    }
  }, [
    commandsList,
    connectionName,
    connectionNameInputRef,
    fallbackShellKey,
    isAddingConnection,
    loadedConnections,
    selectedShellKey,
    selectedWslDistro,
    setCommandsList,
    setConnectionName,
    setConnections,
    setLoadedConnections,
    setSelectedShellKey,
    setSelectedWslDistro,
    toGridRows,
    wslDistros,
  ]);

  return { isAddingConnection, handleAddConnection };
}

function useConnectionLoader(
  fallbackShellKey: string,
  applyConnectionToForm: (conn: NormalizedConnection | null) => void,
  setWslDistros: Dispatch<SetStateAction<string[]>>,
  setSelectedWslDistro: Dispatch<SetStateAction<string>>,
  setLoadedConnections: Dispatch<SetStateAction<NormalizedConnection[]>>,
  setConnections: Dispatch<SetStateAction<ConnectionGridRow[]>>,
  toGridRows: (conns: NormalizedConnection[]) => ConnectionGridRow[],
) {
  const loadConnectionsFromSettings = useCallback(async (): Promise<NormalizedConnection[]> => {
    try {
      const settings = (await window.ipcToMain.queries.app.getSettings()) as GdbSettings;
      const raw = extractSettingsConnections(settings);
      const normalized: NormalizedConnection[] = raw
        .filter((c: unknown) => c && typeof c === "object")
        .map((c: ConnectionConfig, i: number) =>
          normalizeConnectionForStorage(c, `Connection ${i + 1}`, fallbackShellKey),
        );
      setLoadedConnections(normalized);
      setConnections(toGridRows(normalized));
      applyConnectionToForm(normalized[0] ?? null);
      return normalized;
    } catch {
      setLoadedConnections([]);
      setConnections([]);
      applyConnectionToForm(null);
      return [];
    }
  }, [applyConnectionToForm, fallbackShellKey, setConnections, setLoadedConnections, toGridRows]);

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
    } catch {
      setWslDistros([DEFAULT_WSL_DISTRO]);
      setSelectedWslDistro((current) => current || DEFAULT_WSL_DISTRO);
    }
  }, [setSelectedWslDistro, setWslDistros]);

  return { loadConnectionsFromSettings, loadWslDistrosFromSystem };
}

function useConnectionPersist(
  fallbackShellKey: string,
  connectionNameInputRef: RefObject<HTMLInputElement | null>,
  formState: FormState,
  loadedConnections: NormalizedConnection[],
  setLoadedConnections: Dispatch<SetStateAction<NormalizedConnection[]>>,
  setConnections: Dispatch<SetStateAction<ConnectionGridRow[]>>,
  toGridRows: (conns: NormalizedConnection[]) => ConnectionGridRow[],
) {
  const handleDeleteConnection = useCallback(
    async (index: number): Promise<void> => {
      const updated = loadedConnections.filter((_, i) => i !== index);
      setLoadedConnections(updated);
      setConnections(toGridRows(updated));
      await saveConnectionsToSettings(updated, fallbackShellKey);
    },
    [fallbackShellKey, loadedConnections, setConnections, setLoadedConnections, toGridRows],
  );

  const addOps = useHandleAddConnection(
    fallbackShellKey,
    connectionNameInputRef,
    formState,
    loadedConnections,
    setLoadedConnections,
    setConnections,
    toGridRows,
  );

  return { handleDeleteConnection, ...addOps };
}

function useConnectionData(
  fallbackShellKey: string,
  connectionNameInputRef: RefObject<HTMLInputElement | null>,
  formState: FormState,
) {
  const [connections, setConnections] = useState<ConnectionGridRow[]>([]);
  const [loadedConnections, setLoadedConnections] = useState<NormalizedConnection[]>([]);
  const { applyConnectionToForm, setWslDistros, setSelectedWslDistro } = formState;

  const toGridRows = useCallback(
    (conns: NormalizedConnection[]) =>
      conns.map((c, i) => mapConnectionToGridRow(c, i, fallbackShellKey)),
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

  const loaderOps = useConnectionLoader(
    fallbackShellKey,
    applyConnectionToForm,
    setWslDistros,
    setSelectedWslDistro,
    setLoadedConnections,
    setConnections,
    toGridRows,
  );

  const persist = useConnectionPersist(
    fallbackShellKey,
    connectionNameInputRef,
    formState,
    loadedConnections,
    setLoadedConnections,
    setConnections,
    toGridRows,
  );

  return {
    connections,
    loadedConnections,
    handleConnectionRowSelected,
    ...loaderOps,
    ...persist,
  };
}

/**
 * Creates and returns the `useConnectionManagerController` hook API used by renderer components.
 *
 * @remarks
 * Encapsulates stateful React logic and returns values/callbacks consumed by UI components. Includes explicit error-handling logic for expected failure paths. Performs asynchronous work and should be used with completion ordering in mind.
 *
 * @param param1 - Value for `param1` consumed by this operation.
 */
export function useConnectionManagerController({
  onCloseCallbackRef,
}: UseConnectionManagerControllerArgs) {
  const shellOptions = useMemo(
    () => Object.entries(shells).map(([key, shell]) => ({ key, label: shell.type })),
    [],
  );
  const fallbackShellKey = shellOptions[0]?.key ?? "wsl";

  const [hideDialog, setHideDialog] = useState(false);
  const connectionsGridRef = useRef<GridComponent>(null);
  const connectionNameInputRef = useRef<HTMLInputElement>(null);
  const shellSelectRef = useRef<HTMLSelectElement>(null);
  const addConnectionButtonRef = useRef<HTMLButtonElement>(null);

  const formState = useFormState(shellOptions, fallbackShellKey);
  const dataOps = useConnectionData(fallbackShellKey, connectionNameInputRef, formState);

  useNativeDomSetup(
    shellSelectRef,
    connectionNameInputRef,
    addConnectionButtonRef,
    fallbackShellKey,
    hideDialog,
    formState.setSelectedShellKey,
    formState.setConnectionName,
    dataOps.handleAddConnection,
  );

  useEffect(() => {
    if (!hideDialog) {
      return;
    }
    window.setTimeout(() => {
      connectionsGridRef.current?.refresh();
    }, 0);
  }, [dataOps.connections, hideDialog]);

  const dialogCloseFunc = useCallback(() => {
    setHideDialog(false);
    onCloseCallbackRef.current?.();
    onCloseCallbackRef.current = null;
  }, [onCloseCallbackRef]);

  const { loadConnectionsFromSettings, loadWslDistrosFromSystem } = dataOps;
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
    isWslShellSelected: formState.isWslShellSelected,
    commandsList: formState.commandsList,
    commandsListKey: formState.commandsListKey,
    connectionName: formState.connectionName,
    selectedShellLabel: formState.selectedShellLabel,
    wslDistros: formState.wslDistros,
    selectedWslDistro: formState.selectedWslDistro,
    isAddingConnection: dataOps.isAddingConnection,
    connections: dataOps.connections,
    connectionsGridRef,
    connectionNameInputRef,
    shellSelectRef,
    addConnectionButtonRef,
    handleOnReorder: formState.handleOnReorder,
    shellChangeHandler: formState.shellChangeHandler,
    wslDistroChangeHandler: formState.wslDistroChangeHandler,
    connectionNameChangeHandler: formState.connectionNameChangeHandler,
    handleConnectionRowSelected: dataOps.handleConnectionRowSelected,
    handleDeleteConnection: dataOps.handleDeleteConnection,
    dialogCloseFunc,
    dialogOpenFunc,
    showDialog,
  };
}
