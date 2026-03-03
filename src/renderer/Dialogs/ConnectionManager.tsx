/**
 * Connection manager dialog for RevealGDB.
 *
 * Provides UI for managing GDB connection profiles:
 * - Create/edit/delete connection configurations
 * - Select connection target (local, remote, WSL)
 * - Configure GDB executable paths and startup commands
 *
 */

import { ColumnDirective, ColumnsDirective, GridComponent } from "@syncfusion/ej2-react-grids";
import { DialogComponent } from "@syncfusion/ej2-react-popups";
import {
  forwardRef,
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

export const ConnectionManager = forwardRef<ConnectionManagerHandle, ConnectionManagerProps>(
  function ConnectionManager(_props, ref) {
    const [hideDialog, setHideDialog] = useState(false);
    const [connections] = useState<string[]>([]);
    const shellSelectRef = useRef<HTMLSelectElement | null>(null);
    const shellOptions = useMemo(
      () => Object.entries(shells).map(([key, shell]) => ({ key, label: shell.type })),
      [],
    );
    const [selectedShellKey, setSelectedShellKey] = useState<string>(shellOptions[0]?.key ?? "");

    useImperativeHandle(ref, () => ({
      ShowDialog() {
        setHideDialog(true);
      },
    }));

    useEffect(() => {
      // Placeholder: Load connection profiles from settings or backend
    }, []);

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

    const dialogCloseFunc = () => {
      setHideDialog(false);
    };

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

    const data: GdbAny[] = useMemo(() => [{ text: "gdb", id: "list-01" }], []);

    function handleOnReorder(items: DragAndDropListItem[]): void {
      items.forEach((item) => {
        const itemData = typeof item === "string" ? { text: item, id: "" } : item;
        console.log(`Reordered item: ${itemData.text} (id: ${itemData.id})`);
      });
    }

    function shellChangeHandler(e: ChangeEvent<HTMLSelectElement>): void {
      setSelectedShellKey(e.target.value);
      console.log(`Shell changed to: ${e.target.value}`);
    }

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
                <DragAndDropList id="commandsTreeView" items={data} onReorder={handleOnReorder} />
              </div>
            </div>
            <button
              type="button"
              className="connectionManagerItem connectionAddButton"
              onClick={() => alert("Add connection - to be implemented")}
            >
              Add Connection
            </button>
            <GridComponent
              id="connectionsGrid"
              className="connectionManagerItem"
              dataSource={connections}
            >
              <ColumnsDirective>
                <ColumnDirective field="name" headerText="Name" width="100" />
                <ColumnDirective field="shell" headerText="Shell" width="70" />
                <ColumnDirective field="commands" headerText="Commands" />
              </ColumnsDirective>
            </GridComponent>
          </div>
        </DialogComponent>
      </div>
    );
  },
);

ConnectionManager.displayName = "ConnectionManager";
