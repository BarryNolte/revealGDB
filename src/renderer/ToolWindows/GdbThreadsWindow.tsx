import {
  ColumnDirective,
  ColumnMenu,
  ColumnsDirective,
  GridComponent,
  Group,
  GroupSettingsModel,
  Inject,
  Resize,
  //SearchSettingsModel,
  SelectionSettingsModel,
  //Toolbar,
  //ToolbarItems,
} from "@syncfusion/ej2-react-grids";
import React from "react";
import { GdbAny } from "../../common/gdb-common";
import {
  gdbThread,
  gdbThreadGroup,
} from "../../main/mi-interface/gdb-state-database/gdbStateDatabase";

import "./GdbThreadsWindow.css";

function GdbThreadsWindow() {
  let grid: GridComponent | null;
  window.ipcToMain.dataThreads(async (data: GdbAny) => {
    grid!.dataSource = [];

    const groups = data.grp;
    const threads = data.th;

    groups.forEach((group: gdbThreadGroup) => {
      //console.log(`GroupID: ${group.gid}`);

      threads.forEach((thread: gdbThread) => {
        // console.log(`  ${JSON.stringify(thread)}`)
        ((grid as GridComponent).dataSource as object[]).push({
          groupId: group.gid,
          active: thread.active,
          id: thread.id,
          targetId: thread.targetId,
          details: thread.details,
          name: thread.name,
          state: thread.state,
          frame: `${thread.frame.func}:${thread.frame.line}`,
        });
      });
    });

    grid?.setProperties({
      dataSource: grid?.dataSource as object[],
    });
  });

  const selectionOptions: SelectionSettingsModel = {
    mode: "Row",
    type: "Single",
  };
  // const toolbarOptions: ToolbarItems[] = ["Search"];
  // const searchOptions: SearchSettingsModel = {
  //   fields: ["frame", "addr", "file", "fullName", "groupId", "id", "name"],
  //   ignoreCase: true,
  //   key: "",
  //   operator: "contains",
  // };
  const groupOptions: GroupSettingsModel = {
    columns: ["groupId"],
    showDropArea: false,
  };

  return (
    <div className="full-size flex-container">
      <GridComponent
        className="flex-item"
        allowResizing={true}
        allowPaging={false}
        //allowSorting={false}
        allowGrouping={true}
        showColumnMenu={true}
        allowFiltering={false}
        // toolbar={toolbarOptions}
        // searchSettings={searchOptions}
        groupSettings={groupOptions}
        selectionSettings={selectionOptions}
        ref={(g: GdbAny) => (grid = g)}
        gridLines="Both"
        height="100%"
      >
        <ColumnsDirective>
          <ColumnDirective
            field="active"
            headerText="Active"
            isPrimaryKey={true}
            textAlign="Left"
            autoFit={true}
          />
          <ColumnDirective field="groupId" headerText="Group Id" autoFit={true} />
          <ColumnDirective field="id" headerText="Id" autoFit={true} />
          <ColumnDirective field="details" headerText="Details" autoFit={true} />
          <ColumnDirective field="frame" headerText="Frame" autoFit={true} />
          <ColumnDirective field="state" headerText="State" autoFit={true} />
          <ColumnDirective field="name" headerText="Name" autoFit={true} />
          <ColumnDirective field="targetId" headerText="Target Id" autoFit={true} />
        </ColumnsDirective>
        <Inject services={[Resize, ColumnMenu, Group]} />
      </GridComponent>
    </div>
  );
}

export default GdbThreadsWindow;
