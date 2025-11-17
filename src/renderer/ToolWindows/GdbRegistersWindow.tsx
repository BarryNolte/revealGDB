import {
  ColumnDirective,
  ColumnMenu,
  ColumnsDirective,
  Edit,
  GridComponent,
  Group,
  Inject,
  QueryCellInfoEventArgs,
  Resize,
  SearchSettingsModel,
  Sort,
  Toolbar,
  ToolbarItems,
} from "@syncfusion/ej2-react-grids";
import React from "react";
import { gdbRegisters } from "../../main/mi-interface/gdb-state-database/gdbStateDatabase";
import { GdbAny } from "../../common/gdb-common";

import "./GdbRegisterWindow.css";

function GdbRegistersWindow() {
  let grid: GridComponent | null;
  window.ipcToMain.dataRegisters((data: gdbRegisters[]) => {
    grid!.dataSource = [];
    data.forEach((reg) => {
      ((grid as GridComponent).dataSource as object[]).push({
        name: reg.name,
        value: reg.value,
        changed: reg.changed,
      });
    });

    (grid as GridComponent).setProperties({
      dataSource: (grid as GridComponent).dataSource as object[],
    });
  });

  function queryCellInfo(args: QueryCellInfoEventArgs): void {
    if (args.column?.field === "value" && (args.data as gdbRegisters).changed === true) {
      args.cell?.classList.add("register-changed-cell");
    }
  }

  const editSettings = {
    allowEditing: true,
    allowAdding: false,
    allowDeleting: false,
  };
  const stringParams = {
    params: {
      showClearButton: true,
    },
  };

  const toolbarOptions: ToolbarItems[] = ["Search"];
  const searchOptions: SearchSettingsModel = {
    fields: ["name", "value"],
    ignoreCase: true,
    key: "",
    operator: "contains",
  };

  return (
    <GridComponent
      queryCellInfo={queryCellInfo}
      allowResizing={true}
      allowPaging={false}
      allowSorting={true}
      showColumnMenu={true}
      allowFiltering={false}
      editSettings={editSettings}
      toolbar={toolbarOptions}
      searchSettings={searchOptions}
      ref={(g: GdbAny) => (grid = g)}
      height="100%"
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
        />
        <ColumnDirective field="value" headerText="Value" width="80%" edit={stringParams} />
      </ColumnsDirective>
      <Inject services={[Resize, Sort, Group, ColumnMenu, Edit, Toolbar]} />
    </GridComponent>
  );
}

export default GdbRegistersWindow;
