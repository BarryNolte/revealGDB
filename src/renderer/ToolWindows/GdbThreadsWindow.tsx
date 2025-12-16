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
} from "@syncfusion/ej2-react-grids";
import { Component, createRef } from "react";
import { GdbAny } from "../../common/gdb-common";
import {
  gdbThread,
  gdbThreadGroup,
} from "../../main/mi-interface/gdb-state-database/gdbStateDatabase";

import "./GdbThreadsWindow.css";

export default class GdbThreadsWindow extends Component {
  private gridRef = createRef<GridComponent>();

  private selectionOptions: SelectionSettingsModel = {
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
  private groupOptions: GroupSettingsModel = {
    columns: ["groupId"],
    showDropArea: false,
  };

  override componentDidMount() {
    window.ipcToMain.dataThreads((data: GdbAny) => {
      if (this.gridRef.current) {
        this.gridRef.current.dataSource = [];

        const groups = data.grp;
        const threads = data.th;

        groups.forEach((group: gdbThreadGroup) => {
          threads.forEach((thread: gdbThread) => {
            ((this.gridRef.current as GridComponent).dataSource as object[]).push({
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

        this.gridRef.current.setProperties({
          dataSource: this.gridRef.current.dataSource as object[],
        });
      }
    });
  }

  private emptyMessageTemplate(): GdbAny {
    return (
      <div className="emptyRecordTemplate">
        <span>No thread data available.</span>
      </div>
    );
  }

  override render() {
    return (
      <div className="full-size flex-container">
        <GridComponent
          ref={this.gridRef}
          emptyRecordTemplate={this.emptyMessageTemplate}
          className="flex-item"
          allowResizing={true}
          allowPaging={false}
          //allowSorting={false}
          allowGrouping={true}
          showColumnMenu={true}
          allowFiltering={false}
          // toolbar={toolbarOptions}
          // searchSettings={searchOptions}
          groupSettings={this.groupOptions}
          selectionSettings={this.selectionOptions}
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
}
