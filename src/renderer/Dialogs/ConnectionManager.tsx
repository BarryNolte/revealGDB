/**
 * Connection manager dialog for RevealGDB.
 *
 * Provides UI for managing GDB connection profiles:
 * - Create/edit/delete connection configurations
 * - Select connection target (local, remote, WSL)
 * - Configure GDB executable paths and startup commands
 *
 * Note: Currently a placeholder implementation.
 */

import { ColumnDirective, ColumnsDirective, GridComponent } from "@syncfusion/ej2-react-grids";
import { DialogComponent } from "@syncfusion/ej2-react-popups";
import { forwardRef, JSX, useEffect, useImperativeHandle, useMemo, useState } from "react";
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

/** Imperative handle interface for parent components */
export type ConnectionManagerHandle = {
  /** Shows the connection manager dialog */
  ShowDialog: () => void;
};

/**
 * Connection manager component with forward ref for imperative control.
 * Placeholder implementation - full connection management UI to be implemented.
 */
export const ConnectionManager = forwardRef<ConnectionManagerHandle, undefined>(
  (_props, ref): JSX.Element => {
    //console.log("[ConnectionManager] Rendering");
    const [hideDialog, setHideDialog] = useState(false);
    const [connections] = useState<string[]>([]);

    useImperativeHandle(ref, () => ({
      ShowDialog: () => {
        console.log("[ConnectionManager] ShowDialog called");
        setHideDialog(true);
      },
    }));

    useEffect(() => {
      // Placeholder: Load connection profiles from settings or backend
    }, []);

    const dialogCloseFunc = () => {
      setHideDialog(false);
    };

    const header = (): JSX.Element => {
      return <div className="dialogHeader">Connections</div>;
    };

    const footer = (): JSX.Element => {
      return (
        <div>
          <button type="button" onClick={dialogCloseFunc}>
            OK
          </button>
        </div>
      );
    };

    const data: GdbAny[] = useMemo(
      () => [
        { text: "Hennessey Venom", id: "list-01" },
        { text: "Bugatti Chiron", id: "list-02" },
        { text: "Bugatti Veyron Super Sport", id: "list-03" },
        { text: "SSC Ultimate Aero", id: "list-04" },
        { text: "Koenigsegg CCR", id: "list-05" },
        { text: "McLaren F1", id: "list-06" },
        { text: "Aston Martin One- 77", id: "list-07" },
        { text: "Jaguar XJ220", id: "list-08" },
        { text: "McLaren P1", id: "list-09" },
        { text: "Ferrari LaFerrari", id: "list-10" },
      ],
      [],
    );

    function handleOnReorder(items: DragAndDropListItem[]): void {
      items.forEach((item) => {
        const itemData = typeof item === "string" ? { text: item, id: "" } : item;
        console.log(`Reordered item: ${itemData.text} (id: ${itemData.id})`);
      });
    }

    function getShells(): string[] {
      return Object.values(shells).map((shell) => shell.type);
    }

    function shellChangeHandler(e: GdbAny): void {
      console.log(`Shell changed to: ${e.value}`);
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
                  id="shellSelect"
                  onChange={(e) => shellChangeHandler({ value: e.target.value })}
                >
                  {getShells().map((shell) => (
                    <option key={shell} value={shell}>
                      {shell}
                    </option>
                  ))}
                </select>
              </div>
              <div className="controlGroup">
                <label htmlFor="wslDistros">WSL Distros</label>
                <select id="wslDistros">
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
