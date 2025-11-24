import {
  ColumnDirective,
  ColumnMenu,
  ColumnsDirective,
  GridComponent,
  Inject,
  Resize,
  //SearchSettingsModel,
  Toolbar,
  //ToolbarItems,
} from "@syncfusion/ej2-react-grids";
import React from "react";
import { GdbAny } from "../../common/gdb-common";
import { gdbStackFrame } from "../../main/mi-interface/gdb-state-database/gdbStateDatabase";

import "./GdbCallstackWindow.css";

function GdbCallStackWindow() {
  let grid: GridComponent | null;
  window.ipcToMain.stackFrames(async (data: gdbStackFrame[]) => {
    grid!.dataSource = [];
    data.forEach((frame) => {
      ((grid as GridComponent).dataSource as object[]).push({
        level: frame.level,
        func: frame.func,
        addr: frame.addr,
        args: frame.args,
        file: frame.file,
        fullName: frame.fullName,
        line: frame.line,
        from: frame.from,
        arch: frame.arch,
      });
    });

    (grid as GridComponent).setProperties({
      dataSource: (grid as GridComponent).dataSource as object[],
    });
  });

  // const toolbarOptions: ToolbarItems[] = ["Search"];
  // const searchOptions: SearchSettingsModel = {
  //   fields: ["func", "addr", "file", "fullName"],
  //   ignoreCase: true,
  //   key: "",
  //   operator: "contains",
  // };

  return (
    <div className="full-size flex-container">
      <GridComponent
        allowResizing={true}
        allowPaging={false}
        allowSorting={false}
        showColumnMenu={true}
        allowFiltering={false}
        //toolbar={toolbarOptions}
        //searchSettings={searchOptions}
        ref={(g: GdbAny) => (grid = g)}
        gridLines="Both"
        height="100%"
      >
        <ColumnsDirective>
          <ColumnDirective
            field="level"
            headerText="Depth"
            isPrimaryKey={true}
            textAlign="Left"
            autoFit={true}
          />
          <ColumnDirective field="func" headerText="Function" autoFit={true} />
          <ColumnDirective field="addr" headerText="Address" autoFit={true} />
          <ColumnDirective field="args" headerText="Arguments" autoFit={true} />
          <ColumnDirective field="file" headerText="File" autoFit={true} />
          <ColumnDirective field="fullName" headerText="Full Path" autoFit={true} />
          <ColumnDirective field="line" headerText="Line" autoFit={true} />
          <ColumnDirective field="from" headerText="From" autoFit={true} />
          <ColumnDirective field="arch" headerText="Architecture" autoFit={true} />
        </ColumnsDirective>
        <Inject services={[Resize, ColumnMenu, Toolbar]} />
      </GridComponent>
    </div>
  );
}

export default GdbCallStackWindow;
