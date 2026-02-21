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
  Resize,
} from "@syncfusion/ej2-react-grids";
import { JSX, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { gdbRegisters } from "../../main/mi-interface/gdb-state-database/gdbStateDatabase";

import { ContextMenuComponent } from "@syncfusion/ej2-react-navigations";
import { GdbAny } from "../../common/gdb-common";
import { menuCopy } from "../utilities/Clipboard";
import "./GdbRegistersWindow.css";

/**
 * Registers window component.
 * Renders a Syncfusion grid with CPU register data from GDB.
 */
export default function GdbRegistersWindow(): JSX.Element {
  const menuId = useId();
  const gridRef = useRef<GridComponent | null>(null);
  const [registerData, setRegisterData] = useState<gdbRegisters[]>([]);

  /** Edit settings: enable cell editing in batch mode */
  const editSettings: EditSettingsModel = useMemo(
    () => ({
      allowEditing: true,
      allowAdding: false,
      allowDeleting: false,
      showConfirmDialog: false,
      mode: "Batch",
    }),
    [],
  );

  const editParams: IEditCell = useMemo(
    () => ({
      params: {
        showClearButton: true,
        allowEdit: true,
      },
    }),
    [],
  );

  /**
   * Custom validation function for hexadecimal values.
   * Accepts 1-8 hex digits with or without 0x prefix.
   */
  const hexCheck = useCallback((e: { element: Element; value: string }): boolean => {
    const regex = /^0[x|X][0-9A-Fa-f]{1,8}$|^[0-9A-Fa-f]{1,8}$/gm;

    const m = regex.exec(e.value);

    if (!m) return false;

    return true;
  }, []);

  const validationRules = useMemo(
    () => ({
      required: true,
      hexFormat: [hexCheck, "Hex value is not valid"],
    }),
    [hexCheck],
  );

  useEffect(() => {
    const unsubscribe = window.ipcToMain.dataRegisters((data: gdbRegisters[]) => {
      const grid = gridRef.current;
      if (!grid) {
        return;
      }

      const dataList: GdbAny[] = [];
      data.forEach((reg) => {
        dataList.push({
          name: reg.name,
          value: reg.value,
          changed: reg.changed,
        });
      });

      setRegisterData(dataList as gdbRegisters[]);
      // grid.setProperties({
      //   dataSource: dataList,
      // });

      grid.autoFitColumns(["name", "value"], 0);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const emptyMessageTemplate = useCallback((): JSX.Element => {
    return (
      <div className="emptyRecordTemplate">
        <span>No register data available.</span>
      </div>
    );
  }, []);

  const queryCellInfo = useCallback((args: QueryCellInfoEventArgs): void => {
    if (args.column?.field === "value" && (args.data as gdbRegisters).changed === true) {
      args.cell?.classList.add("register-changed-cell");
    }
  }, []);

  const cellSaved = useCallback((args: CellSaveArgs) => {
    window.ipcToMain.sendGdbCommand(`set $${(args.rowData as gdbRegisters)?.name} = ${args.value}`);
  }, []);

  return (
    <div className="full-size flex-container">
      <GridComponent
        ref={gridRef}
        id="registers-grid"
        dataSource={registerData}
        emptyRecordTemplate={emptyMessageTemplate}
        height="100%"
        rowHeight={16}
        className="flex-item"
        queryCellInfo={queryCellInfo}
        allowResizing={true}
        allowPaging={false}
        allowSorting={false}
        showColumnMenu={true}
        allowFiltering={false}
        editSettings={editSettings}
        gridLines="Both"
        cellSaved={cellSaved}
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
            edit={editParams}
            validationRules={validationRules}
          />
        </ColumnsDirective>
        <Inject services={[Resize, ColumnMenu, Edit]} />
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
  );
}
