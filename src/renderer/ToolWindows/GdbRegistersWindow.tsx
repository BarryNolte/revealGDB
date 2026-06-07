/**
 * Implements gdb registers window behavior for debugger tool-window rendering and interactions.
 *
 * @remarks
 * Exported symbols include `GdbRegistersWindow`. It coordinates live debugger data with user interactions in docked tool-window views.
 */
import {
  CellSaveArgs,
  ColumnDirective,
  ColumnMenu,
  ColumnsDirective,
  Edit,
  EditSettingsModel,
  GridComponent,
  IEditCell,
  Inject,
  QueryCellInfoEventArgs,
  Reorder,
  Resize,
} from "@syncfusion/ej2-react-grids";
import { JSX, useEffect, useId, useRef, useState } from "react";
import { gdbRegisters } from "../../common/gdb-state-types";

import { ContextMenuComponent } from "@syncfusion/ej2-react-navigations";
import { RegisterGridRow, mapRegistersToGridRows } from "../mappers/grid-data-mappers";
import { menuCopy } from "../utilities/Clipboard";
import { useGridColumnState } from "../utilities/useGridColumnState";
import "./GdbRegistersWindow.css";
import { ToolWindowContent } from "./ToolWindowContent";
import { TOOL_WINDOW_TITLES } from "./toolWindowTitles";

const REGISTERS_EDIT_SETTINGS: EditSettingsModel = {
  allowEditing: true,
  allowAdding: false,
  allowDeleting: false,
  showConfirmDialog: false,
  mode: "Batch",
};

const REGISTERS_EDIT_PARAMS: IEditCell = { params: { showClearButton: true, allowEdit: true } };
/**
 * Performs registersHexCheck as part of this module's internal workflow.
 *
 * @param e - e parameter.
 * @returns The computed result produced by this operation.
 */

function registersHexCheck(e: { element: Element; value: string }): boolean {
  const regex = /^0[x|X][0-9A-Fa-f]{1,16}$|^[0-9A-Fa-f]{1,16}$/gm;
  const m = regex.exec(e.value);
  return !!m;
}

const REGISTERS_VALIDATION_RULES = {
  required: true,
  hexFormat: [registersHexCheck, "Hex value is not valid"],
};
/**
 * Performs registersEmptyTemplate as part of this module's internal workflow.
 *
 * @returns The computed result produced by this operation.
 */

function registersEmptyTemplate(): JSX.Element {
  return (
    <div className="emptyRecordTemplate">
      <span>No register data available.</span>
    </div>
  );
}
/**
 * Performs registersQueryCellInfo as part of this module's internal workflow.
 *
 * @param args - args parameter.
 * @returns The computed result produced by this operation.
 */

function registersQueryCellInfo(args: QueryCellInfoEventArgs): void {
  if (args.column?.field === "value" && (args.data as RegisterGridRow).changed === true) {
    args.cell?.classList.add("register-changed-cell");
  }
}
/**
 * Performs registersCellSaved as part of this module's internal workflow.
 *
 * @param args - args parameter.
 * @returns The computed result produced by this operation.
 */

function registersCellSaved(args: CellSaveArgs): void {
  window.ipcToMain.commands.debugger.sendGdbCommand(
    `set $${(args.rowData as RegisterGridRow)?.name} = ${args.value}`,
  );
}

/**
 * Performs gdb registers window as part of this module's public API.
 *
 * @remarks
 * Supports debugger tool-window rendering, interaction handling, or data synchronization.
 *
 * @returns The computed result produced by this operation.
 */
export default function GdbRegistersWindow(): JSX.Element {
  const menuId = useId();
  const gridRef = useRef<GridComponent | null>(null);
  const [registerData, setRegisterData] = useState<RegisterGridRow[]>([]);
  useGridColumnState("registers", gridRef);

  useEffect(() => {
    const unsubscribe = window.ipcToMain.debuggerData.registers(
      (data: gdbRegisters[] | Map<string, gdbRegisters>) => {
        setRegisterData(mapRegistersToGridRows(data));
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <ToolWindowContent title={TOOL_WINDOW_TITLES.registers}>
      <div className="full-size flex-container">
        <GridComponent
          ref={gridRef}
          id="registers-grid"
          dataSource={registerData}
          emptyRecordTemplate={registersEmptyTemplate}
          height="100%"
          rowHeight={16}
          className="flex-item"
          queryCellInfo={registersQueryCellInfo}
          allowResizing={true}
          allowReordering={true}
          allowPaging={false}
          allowSorting={false}
          showColumnMenu={true}
          allowFiltering={false}
          editSettings={REGISTERS_EDIT_SETTINGS}
          gridLines="Both"
          cellSaved={registersCellSaved}
        >
          <ColumnsDirective>
            <ColumnDirective
              field="name"
              headerText="Register"
              width="20%"
              textAlign="Left"
              minWidth={100}
              allowEditing={false}
              isPrimaryKey={true}
              clipMode="EllipsisWithTooltip"
            />
            <ColumnDirective
              field="value"
              headerText="Value"
              width="80%"
              allowEditing={true}
              clipMode="EllipsisWithTooltip"
              edit={REGISTERS_EDIT_PARAMS}
              validationRules={REGISTERS_VALIDATION_RULES}
            />
          </ColumnsDirective>
          <Inject services={[Resize, Reorder, ColumnMenu, Edit]} />
        </GridComponent>
        <ContextMenuComponent
          id={`registers-menu-${menuId}`}
          target="#registers-grid"
          items={menuCopy}
          select={() => {
            gridRef.current?.copy();
          }}
        />
      </div>
    </ToolWindowContent>
  );
}
