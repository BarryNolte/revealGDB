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
  subType?: () => string[] | undefined;
};

const shells: Record<string, ShellOption> = {
  wsl: {
    type: "WSL",
    platform: ["win32"],
    cmdLine: "wsl",
    subType: () => ["Ubuntu-22.04", "Debian", "Fedora"],
  },
  bash: { type: "Bash", platform: ["linux", "darwin"], cmdLine: "bash" },
  zsh: { type: "Zsh", platform: ["linux", "darwin"], cmdLine: "zsh" },
  cmd: { type: "CMD", platform: ["win32"], cmdLine: "cmd" },
  pwsh: { type: "PowerShell", platform: ["win32"], cmdLine: "pwsh" },
};

export interface ConnectionManagerHandle {
  ShowDialog: () => void;
}

// If there are no props, keep this as an empty object type.
type ConnectionManagerProps = Record<never, never>;

type ConnectionGridRow = {
  connectionIndex: number;
  name: string;
  shell: string;
  commands: string;
};

export const ConnectionManager = forwardRef<ConnectionManagerHandle, ConnectionManagerProps>(
  function ConnectionManager(_props, ref) {
    const [hideDialog, setHideDialog] = useState(false);
    const [connections, setConnections] = useState<ConnectionGridRow[]>([]);
    const [loadedConnections, setLoadedConnections] = useState<GdbAny[]>([]);
    const [isAddingConnection, setIsAddingConnection] = useState(false);
    const connectionNameInputRef = useRef<HTMLInputElement | null>(null);
    const shellSelectRef = useRef<HTMLSelectElement | null>(null);
    const addConnectionButtonRef = useRef<HTMLButtonElement | null>(null);
    const shellOptions = useMemo(
      () => Object.entries(shells).map(([key, shell]) => ({ key, label: shell.type })),
      [],
    );
    const [connectionName, setConnectionName] = useState<string>("");
    const [selectedShellKey, setSelectedShellKey] = useState<string>(shellOptions[0]?.key ?? "");
    const [selectedWslDistro, setSelectedWslDistro] = useState<string>("Ubuntu-22.04");
    const [commandsList, setCommandsList] = useState<DragAndDropListItem[]>([
      { text: "gdb", id: "list-01" },
    ]);
    const commandsListKey = useMemo(
      () =>
        commandsList.map((item) => (typeof item === "string" ? item : item.text)).join("\u0001"),
      [commandsList],
    );

    const handleOnReorder = useCallback((items: DragAndDropListItem[]): void => {
      setCommandsList(items);
    }, []);

    const shellChangeHandler = useCallback((e: ChangeEvent<HTMLSelectElement>): void => {
      setSelectedShellKey(e.target.value);
      console.log(`Shell changed to: ${e.target.value}`);
    }, []);

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

    const toDragAndDropItems = useCallback((commandsValue: unknown): DragAndDropListItem[] => {
      const commandStrings = Array.isArray(commandsValue)
        ? commandsValue.map((value) => String(value))
        : String(commandsValue ?? "")
            .split("\n")
            .map((value) => value.trim())
            .filter((value) => value.length > 0);

      if (commandStrings.length === 0) {
        return [{ text: "gdb", id: "list-01" }];
      }

      return commandStrings.map((command, index) => ({
        text: command,
        id: `command-${index}`,
      }));
    }, []);

    const normalizeConnection = useCallback(
      (connection: GdbAny, index: number): ConnectionGridRow => {
        const commandsValue = connection.commands ?? connection.extraArguments ?? [];
        const commands = Array.isArray(commandsValue)
          ? commandsValue.map((value: unknown) => String(value)).join("\n")
          : String(commandsValue ?? "");

        return {
          connectionIndex: index,
          name: String(connection.name ?? ""),
          shell: String(connection.shell ?? connection.connectionType ?? ""),
          commands,
        };
      },
      [],
    );

    const handleConnectionRowSelected = useCallback(
      (args: { data?: ConnectionGridRow }): void => {
        const selectedIndex = args.data?.connectionIndex;
        if (typeof selectedIndex !== "number") {
          return;
        }

        const selectedConnection = loadedConnections[selectedIndex];
        if (!selectedConnection) {
          return;
        }

        setConnectionName(String(selectedConnection.name ?? ""));
        setSelectedShellKey(getShellKeyFromConnection(selectedConnection));

        const selectedDistro = String(selectedConnection.wslDistribution ?? "").trim();
        setSelectedWslDistro(selectedDistro || "Ubuntu-22.04");

        const selectedCommands =
          selectedConnection.commands ?? selectedConnection.extraArguments ?? [];
        setCommandsList(toDragAndDropItems(selectedCommands));
      },
      [getShellKeyFromConnection, loadedConnections, toDragAndDropItems],
    );

    const loadConnectionsFromSettings = useCallback(async (): Promise<void> => {
      try {
        const settings = (await window.ipcToMain.getSettings()) as GdbAny;
        const settingsConnections = settings?.connections;
        if (!Array.isArray(settingsConnections)) {
          setLoadedConnections([]);
          setConnections([]);
          return;
        }

        setLoadedConnections(settingsConnections as GdbAny[]);
        setConnections(
          settingsConnections.map((connection, index) => normalizeConnection(connection, index)),
        );
      } catch (error) {
        console.error("Failed to load connections from settings", error);
        setLoadedConnections([]);
        setConnections([]);
      }
    }, [normalizeConnection]);

    const saveConnectionsToSettings = useCallback(
      async (connectionsToSave: GdbAny[]): Promise<void> => {
        try {
          await window.ipcToMain.notifyMain({
            command: "save-connections",
            data: { connections: connectionsToSave },
          });
        } catch (error) {
          console.error("Failed to save connections to settings", error);
        }
      },
      [],
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

        const newConnection: GdbAny = {
          name: connectionNameForSave.trim() || "Unnamed Connection",
          shell: shells[selectedShellKey]?.type ?? selectedShellKey,
          commands: commandsArray,
        };

        if (selectedShellKey === "wsl") {
          newConnection.wslDistribution = selectedWslDistro;
        }

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
        setSelectedShellKey(shellOptions[0]?.key ?? "wsl");
        setSelectedWslDistro("Ubuntu-22.04");
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
      saveConnectionsToSettings,
      selectedShellKey,
      selectedWslDistro,
      shellOptions,
    ]);

    useEffect(() => {
      const connectionNameInput = connectionNameInputRef.current;
      if (!connectionNameInput) {
        return;
      }

      const onNativeInput = (event: Event) => {
        const target = event.target as HTMLInputElement;
        setConnectionName(target.value);
      };

      connectionNameInput.addEventListener("input", onNativeInput);
      connectionNameInput.addEventListener("change", onNativeInput);
      return () => {
        connectionNameInput.removeEventListener("input", onNativeInput);
        connectionNameInput.removeEventListener("change", onNativeInput);
      };
    }, [hideDialog]);

    useEffect(() => {
      const shellSelect = shellSelectRef.current;
      if (!shellSelect) {
        return;
      }

      const onNativeChange = (event: Event) => {
        const target = event.target as HTMLSelectElement;
        setSelectedShellKey(target.value);
      };

      shellSelect.addEventListener("change", onNativeChange);
      return () => {
        shellSelect.removeEventListener("change", onNativeChange);
      };
    }, [hideDialog]);

    useEffect(() => {
      const addButton = addConnectionButtonRef.current;
      if (!addButton) {
        return;
      }

      const onNativeClick = () => {
        void handleAddConnection();
      };

      addButton.addEventListener("click", onNativeClick);
      return () => {
        addButton.removeEventListener("click", onNativeClick);
      };
    }, [hideDialog, handleAddConnection]);

    const dialogCloseFunc = useCallback(() => {
      setHideDialog(false);
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
      ShowDialog() {
        void loadConnectionsFromSettings();
        setHideDialog(true);
      },
    }));

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
          close={dialogCloseFunc}
          isModal={true} // Makes the dialog modal
        >
          <div className="connectionManagerContainer">
            <div className="controlGroup">
              <label htmlFor="connectionName">Connection Name</label>
              <input
                ref={connectionNameInputRef}
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
                  id="shellSelect"
                  value={selectedShellKey}
                  onChange={shellChangeHandler}
                >
                  {shellOptions.map((shell) => (
                    <option key={shell.key} value={shell.key}>
                      {shell.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="controlGroup">
                <label htmlFor="wslDistros">WSL Distros</label>
                <select
                  id="wslDistros"
                  value={selectedWslDistro}
                  onChange={wslDistroChangeHandler}
                  disabled={selectedShellKey !== "wsl"}
                  title={
                    selectedShellKey !== "wsl"
                      ? "Select WSL in Shell to enable this list"
                      : undefined
                  }
                >
                  {(shells.wsl.subType?.() ?? []).map((distro) => (
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
              id="connectionsGrid"
              className="connectionManagerItem"
              dataSource={connections}
              rowSelected={handleConnectionRowSelected}
              allowResizing={true}
            >
              <ColumnsDirective>
                <ColumnDirective field="name" headerText="Name" width="100" allowResizing={true} />
                <ColumnDirective field="shell" headerText="Shell" width="70" allowResizing={true} />
                <ColumnDirective field="commands" headerText="Commands" allowResizing={true} />
                <ColumnDirective
                  headerText="Action"
                  width="80"
                  allowResizing={true}
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
