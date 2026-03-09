/**
 * Connection manager dialog for RevealGDB.
 *
 * Provides UI for managing GDB connection profiles:
 * - Create/edit/delete connection configurations
 * - Select connection target (local, remote, WSL)
 * - Configure GDB executable paths and startup commands
 *
 */

import {
  ColumnDirective,
  ColumnsDirective,
  GridComponent,
  Inject,
  Resize,
} from "@syncfusion/ej2-react-grids";
import { DialogComponent } from "@syncfusion/ej2-react-popups";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactElement,
} from "react";
import { GdbAny } from "../../common/gdb-common";
import DragAndDropList, {
  DragAndDropListItem,
} from "../Components/DragAndDropList/DragAndDropList";
import "./ConnectionManager.css";

type Platform = "win32" | "linux" | "darwin";
type ShellOption = {
  type: string;
  platform: Platform[];
  cmdLine: string;
};

const DEFAULT_WSL_DISTRO = "default";

const shells: Record<string, ShellOption> = {
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

export interface ConnectionManagerHandle {
  ShowDialog: (onClose?: () => void) => void;
}

// If there are no props, keep this as an empty object type.
type ConnectionManagerProps = Record<never, never>;

type ConnectionGridRow = {
  connectionIndex: number;
  name: string;
  shell: string;
  commands: string;
};

type NormalizedConnection = {
  name: string;
  shell: string;
  commands: string[];
  wslDistribution?: string;
};

function normalizeDistroName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function mergeUniqueDistros(...lists: string[][]): string[] {
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

export const ConnectionManager = forwardRef<ConnectionManagerHandle, ConnectionManagerProps>(
  function ConnectionManager(_props, ref) {
    const shellOptions = useMemo(
      () => Object.entries(shells).map(([key, shell]) => ({ key, label: shell.type })),
      [],
    );

    const [hideDialog, setHideDialog] = useState(false);
    const [connections, setConnections] = useState<ConnectionGridRow[]>([]);
    const [loadedConnections, setLoadedConnections] = useState<GdbAny[]>([]);
    const connectionsGridRef = useRef<GridComponent>(null);
    const connectionNameInputRef = useRef<HTMLInputElement>(null);
    const shellSelectRef = useRef<HTMLSelectElement>(null);
    const addConnectionButtonRef = useRef<HTMLButtonElement>(null);
    const [isAddingConnection, setIsAddingConnection] = useState(false);
    const [connectionName, setConnectionName] = useState<string>("");
    const [selectedShellKey, setSelectedShellKey] = useState<string>(shellOptions[0]?.key ?? "");
    const [wslDistros, setWslDistros] = useState<string[]>([DEFAULT_WSL_DISTRO]);
    const [selectedWslDistro, setSelectedWslDistro] = useState<string>(DEFAULT_WSL_DISTRO);
    const [commandsList, setCommandsList] = useState<DragAndDropListItem[]>([
      { text: "gdb", id: "list-01" },
    ]);

    const onCloseCallbackRef = useRef<(() => void) | null>(null);

    const selectedShellLabel = useMemo(() => {
      const matchedShell = shellOptions.find((shellOption) => shellOption.key === selectedShellKey);
      return matchedShell?.label ?? shells.wsl.type;
    }, [selectedShellKey, shellOptions]);

    const commandsListKey = useMemo(
      () =>
        commandsList.map((item) => (typeof item === "string" ? item : item.text)).join("\u0001"),
      [commandsList],
    );

    const handleOnReorder = useCallback((items: DragAndDropListItem[]): void => {
      setCommandsList(items);
    }, []);

    const normalizeShellKey = useCallback(
      (shellValue: string): string => {
        const normalizedValue = shellValue.trim().toLocaleLowerCase();
        if (normalizedValue in shells) {
          return normalizedValue;
        }

        const matchedEntry = Object.entries(shells).find(
          ([, shellOption]) => shellOption.type.toLocaleLowerCase() === normalizedValue,
        );

        return matchedEntry?.[0] ?? shellOptions[0]?.key ?? "wsl";
      },
      [shellOptions],
    );

    const shellChangeHandler = useCallback(
      (e: ChangeEvent<HTMLSelectElement>): void => {
        setSelectedShellKey(normalizeShellKey(e.target.value));
      },
      [normalizeShellKey],
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

        setSelectedShellKey(normalizeShellKey(target.value));
      };

      shellElement.addEventListener("change", nativeShellChangeHandler);

      return () => {
        shellElement.removeEventListener("change", nativeShellChangeHandler);
      };
    }, [hideDialog, normalizeShellKey]);

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

    const getShellKeyFromConnection = useCallback(
      (connection: GdbAny): string => {
        const shellValue = String(
          connection.shell ?? connection.connectionType ?? "",
        ).toLowerCase();
        if (shellValue in shells) {
          return shellValue;
        }

        const matchedEntry = Object.entries(shells).find(
          ([, shellOption]) => shellOption.type.toLowerCase() === shellValue,
        );

        return matchedEntry?.[0] ?? shellOptions[0]?.key ?? "wsl";
      },
      [shellOptions],
    );

    const toCommandStrings = useCallback((commandsValue: unknown): string[] => {
      if (Array.isArray(commandsValue)) {
        return commandsValue
          .map((value) => String(value).trim())
          .filter((value) => value.length > 0);
      }

      return String(commandsValue ?? "")
        .split("\n")
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
    }, []);

    const toDragAndDropItems = useCallback(
      (commandsValue: unknown): DragAndDropListItem[] => {
        const commandStrings = toCommandStrings(commandsValue);

        if (commandStrings.length === 0) {
          return [{ text: "gdb", id: "list-01" }];
        }

        return commandStrings.map((command, index) => ({
          text: command,
          id: `command-${index}`,
        }));
      },
      [toCommandStrings],
    );

    const normalizeConnectionForStorage = useCallback(
      (connection: GdbAny, fallbackName: string): NormalizedConnection => {
        const shellKey = getShellKeyFromConnection(connection);
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
      },
      [getShellKeyFromConnection, toCommandStrings],
    );

    const applyConnectionToForm = useCallback(
      (connection: NormalizedConnection | null): void => {
        if (!connection) {
          setConnectionName("");
          setSelectedShellKey(normalizeShellKey(shellOptions[0]?.key ?? "wsl"));
          setSelectedWslDistro((current) => current || wslDistros[0] || DEFAULT_WSL_DISTRO);
          setCommandsList([{ text: "gdb", id: "list-01" }]);
          return;
        }

        setConnectionName(connection.name);
        setSelectedShellKey(normalizeShellKey(connection.shell));
        setSelectedWslDistro(connection.wslDistribution || wslDistros[0] || DEFAULT_WSL_DISTRO);
        setCommandsList(toDragAndDropItems(connection.commands));
      },
      [normalizeShellKey, shellOptions, toDragAndDropItems, wslDistros],
    );

    const normalizeConnection = useCallback(
      (connection: GdbAny, index: number): ConnectionGridRow => {
        const commands = toCommandStrings(connection.commands).join("\n");
        const shellKey = getShellKeyFromConnection(connection);
        const shellLabel = shells[shellKey]?.type ?? String(connection.shell ?? shellKey);

        return {
          connectionIndex: index,
          name: String(connection.name ?? ""),
          shell: shellLabel,
          commands,
        };
      },
      [getShellKeyFromConnection, toCommandStrings],
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
        const settings = (await window.ipcToMain.getSettings()) as GdbAny;
        const settingsConnections = Array.isArray(settings?.connections)
          ? settings.connections
          : Array.isArray(settings?.gdb?.connections)
            ? settings.gdb.connections
            : [];

        const normalizedSourceConnections: NormalizedConnection[] = (
          settingsConnections as GdbAny[]
        )
          .filter((connection: unknown) => connection && typeof connection === "object")
          .map((connection: GdbAny, index: number) =>
            normalizeConnectionForStorage(connection, `Connection ${index + 1}`),
          );

        setLoadedConnections(normalizedSourceConnections);
        setConnections(
          normalizedSourceConnections.map((connection, index) =>
            normalizeConnection(connection, index),
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
    }, [applyConnectionToForm, normalizeConnection, normalizeConnectionForStorage]);

    const loadWslDistrosFromSystem = useCallback(async (): Promise<void> => {
      try {
        const distros = await window.ipcToMain.getWslDistrobutions();
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

      // Grid is rendered inside a popup layer; force a refresh after data changes.
      window.setTimeout(() => {
        connectionsGridRef.current?.refresh();
      }, 0);
    }, [connections, hideDialog]);

    const saveConnectionsToSettings = useCallback(
      async (connectionsToSave: GdbAny[]): Promise<void> => {
        try {
          const normalizedConnectionsToSave = connectionsToSave.map(
            (connection: GdbAny, index: number) =>
              normalizeConnectionForStorage(connection, `Connection ${index + 1}`),
          );

          await window.ipcToMain.notifyMain({
            command: "save-connections",
            data: { connections: normalizedConnectionsToSave },
          });
        } catch (error) {
          console.error("Failed to save connections to settings", error);
        }
      },
      [normalizeConnectionForStorage],
    );

    const handleDeleteConnection = useCallback(
      async (index: number): Promise<void> => {
        const updatedLoadedConnections = loadedConnections.filter((_, i) => i !== index);
        setLoadedConnections(updatedLoadedConnections);
        setConnections(
          updatedLoadedConnections.map((connection, connIndex) =>
            normalizeConnection(connection, connIndex),
          ),
        );
        await saveConnectionsToSettings(updatedLoadedConnections);
      },
      [loadedConnections, normalizeConnection, saveConnectionsToSettings],
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
        );

        const updatedLoadedConnections = [...loadedConnections, newConnection];

        setLoadedConnections(updatedLoadedConnections);
        setConnections(
          updatedLoadedConnections.map((connection, index) =>
            normalizeConnection(connection, index),
          ),
        );

        await saveConnectionsToSettings(updatedLoadedConnections);

        console.log("Connection saved to settings", newConnection);

        // Reset form fields to default values for new connection
        setConnectionName("");
        setSelectedShellKey(normalizeShellKey(shellOptions[0]?.key ?? "wsl"));
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
      isAddingConnection,
      loadedConnections,
      normalizeConnection,
      normalizeConnectionForStorage,
      normalizeShellKey,
      saveConnectionsToSettings,
      selectedShellKey,
      selectedWslDistro,
      shellOptions,
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
    }, [hideDialog, handleAddConnection]);

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
    }, []);

    const header = (): ReactElement => {
      return <div className="dialogHeader">Connections</div>;
    };

    const footer = (): ReactElement => {
      return (
        <div>
          <button type="button" onClick={dialogCloseFunc}>
            OK
          </button>
        </div>
      );
    };

    useImperativeHandle(ref, () => ({
      ShowDialog(onClose?: () => void) {
        onCloseCallbackRef.current = onClose ?? null;
        setHideDialog(true);
      },
    }));

    const dialogOpenFunc = useCallback(() => {
      void (async () => {
        await loadConnectionsFromSettings();
        await loadWslDistrosFromSystem();
      })();
    }, [loadConnectionsFromSettings, loadWslDistrosFromSystem]);

    return (
      <div>
        <DialogComponent
          className="dialogHeaderContainer"
          height="500px"
          width="600px"
          position={{ X: "center", Y: "center" }}
          visible={hideDialog}
          header={header}
          footerTemplate={footer}
          closeOnEscape={true}
          showCloseIcon={true}
          open={dialogOpenFunc}
          close={dialogCloseFunc}
          isModal={true} // Makes the dialog modal
        >
          <div className="connectionManagerContainer">
            <div className="controlGroup controlGroupOfOne">
              <label htmlFor="connectionName">Connection Name</label>
              <input
                ref={connectionNameInputRef}
                className="controlInput"
                type="text"
                id="connectionName"
                value={connectionName}
                onChange={connectionNameChangeHandler}
                placeholder="Enter connection name"
              />
            </div>
            <div className="horizontalControls">
              <div className="controlGroup">
                <label htmlFor="shellSelect">Shell</label>
                <select
                  ref={shellSelectRef}
                  className="controlInput"
                  id="shellSelect"
                  value={selectedShellLabel}
                  onChange={shellChangeHandler}
                >
                  {shellOptions.map((shell) => (
                    <option key={shell.key} value={shell.label}>
                      {shell.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="controlGroup">
                <label htmlFor="wslDistros">WSL Distros</label>
                <select
                  className="controlInput"
                  id="wslDistros"
                  value={selectedWslDistro}
                  onChange={wslDistroChangeHandler}
                  disabled={!isWslShellSelected}
                  title={
                    !isWslShellSelected ? "Select WSL in Shell to enable this list" : undefined
                  }
                >
                  {wslDistros.map((distro) => (
                    <option key={distro} value={distro}>
                      {distro}
                    </option>
                  ))}
                </select>
              </div>
              <div className="controlGroup">
                <label htmlFor="commandsTreeView">Startup Commands</label>
                <DragAndDropList
                  key={commandsListKey}
                  id="commandsTreeView"
                  items={commandsList}
                  onReorder={handleOnReorder}
                />
              </div>
            </div>
            <button
              ref={addConnectionButtonRef}
              id="addConnectionButton"
              type="button"
              className="connectionManagerItem connectionAddButton"
              disabled={isAddingConnection || !connectionName.trim()}
            >
              Add Connection
            </button>
            <GridComponent
              ref={connectionsGridRef}
              id="connectionsGrid"
              className="connectionManagerItem"
              dataSource={connections}
              rowSelected={handleConnectionRowSelected}
              allowResizing={true}
              rowHeight={22}
            >
              <ColumnsDirective>
                <ColumnDirective
                  field="name"
                  headerText="Name"
                  width="100"
                  allowResizing={true}
                  clipMode="Ellipsis"
                />
                <ColumnDirective
                  field="shell"
                  headerText="Shell"
                  width="60"
                  allowResizing={true}
                  clipMode="Ellipsis"
                />
                <ColumnDirective
                  field="commands"
                  headerText="Commands"
                  allowResizing={true}
                  clipMode="Ellipsis"
                />
                <ColumnDirective
                  headerText="Action"
                  width="45"
                  allowResizing={false}
                  template={(props: ConnectionGridRow): ReactElement => (
                    <button
                      type="button"
                      className="connection-delete-button"
                      onClick={() => void handleDeleteConnection(props.connectionIndex)}
                      title="Delete this connection"
                    >
                      Delete
                    </button>
                  )}
                />
              </ColumnsDirective>
            </GridComponent>
            <Inject services={[Resize]} />
          </div>
        </DialogComponent>
      </div>
    );
  },
);

ConnectionManager.displayName = "ConnectionManager";
