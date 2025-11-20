import {
  ColumnDirective,
  ColumnMenu,
  ColumnsDirective,
  GridComponent,
  Inject,
  Resize,
  SearchSettingsModel,
  Toolbar,
  ToolbarItems,
} from "@syncfusion/ej2-react-grids";
import React from "react";
import { GdbAny } from "../../common/gdb-common";
import { gdbBreakpoint } from "../../main/mi-interface/gdb-state-database/gdbStateDatabase";

import "./GdbBreakpointsWindow.css";

function GdbBreakPointWindow() {
  let grid: GridComponent | null;
  window.ipcToMain.dataBrkPts(async (data: gdbBreakpoint[]) => {
    grid!.dataSource = [];
    data.forEach((bp) => {
      (grid?.dataSource as object[]).push({
        number: bp.number,
        type: bp.type,
        disp: bp.disp,
        enabled: bp.enabled === "y" ? true : false,
        addr: bp.addr,
        func: bp.func,
        file: bp.file.replace(/^.*[\\/]/, ""),
        fullName: bp.fullname,
        line: bp.line,
        tg: bp.tg.slice(1, -1),
        times: bp.times,
        orgloc: bp.orgloc,
      });
    });

    grid?.setProperties({
      dataSource: grid?.dataSource as object[],
    });
  });

  const toolbarOptions: ToolbarItems[] = ["Search"];
  const searchOptions: SearchSettingsModel = {
    fields: ["func", "type", "addr", "file", "fullName"],
    ignoreCase: true,
    key: "",
    operator: "contains",
  };

  const checkboxTemplate = (props: GdbAny) => {
    //console.log(JSON.stringify(props, null, 2));
    return (
      <input
        type="checkbox"
        title="Enable"
        checked={props!.enabled}
        onClick={(e: GdbAny) => {
          const attr = e.target.getAttribute("data-id");
          console.log(`Click: --> ${attr} --> ${e.target.checked}`);
          window.ipcToMain.sendGdbCommand(
            e.target.checked === true ? `enable ${attr}` : `disable ${attr}`,
          );
        }}
        data-id={props!.number} // Add a data attribute to identify the row
      />
    );
  };

  return (
    <GridComponent
      allowResizing={true}
      allowPaging={false}
      allowSorting={false}
      showColumnMenu={true}
      allowFiltering={false}
      toolbar={toolbarOptions}
      searchSettings={searchOptions}
      ref={(g: GdbAny) => (grid = g)}
      height="100%"
    >
      <ColumnsDirective>
        <ColumnDirective
          field="enabled"
          toolTip="BP Enabled"
          headerText=""
          template={checkboxTemplate}
          textAlign="Left"
          showColumnMenu={false}
          width="55px"
        />
        <ColumnDirective
          field="number"
          headerText="#"
          isPrimaryKey={true}
          textAlign="Left"
          showColumnMenu={false}
          width="35px"
        />
        <ColumnDirective field="addr" headerText="Address" autoFit={true} />
        <ColumnDirective field="func" headerText="Function" autoFit={true} />
        <ColumnDirective field="file" headerText="File" autoFit={true} />
        <ColumnDirective field="line" headerText="Line" autoFit={true} width="35px" />
        <ColumnDirective field="times" headerText="Times" autoFit={true} />
        <ColumnDirective field="fullName" headerText="Full Path" autoFit={true} />
        <ColumnDirective field="tg" headerText="Thread Group" autoFit={true} />
        <ColumnDirective field="orgloc" headerText="Original Location" autoFit={true} />
        <ColumnDirective field="disp" headerText="Display" autoFit={true} />
        <ColumnDirective field="type" headerText="Type" autoFit={true} />
      </ColumnsDirective>
      <Inject services={[Resize, ColumnMenu, Toolbar]} />
    </GridComponent>
  );
}

export default GdbBreakPointWindow;
