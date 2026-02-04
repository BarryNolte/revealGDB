import {
  ColumnDirective,
  ColumnMenu,
  ColumnsDirective,
  GridComponent,
  Group,
  GroupSettingsModel,
  Inject,
  Resize,
  SelectionSettingsModel,
} from "@syncfusion/ej2-react-grids";
import { Component, createRef, JSX } from "react";
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

        this.gridRef.current?.autoFitColumns(
          ["active", "id", "details", "frame", "state", "name", "targetId"],
          0,
        );
      }
    });
  }

  private emptyMessageTemplate(): JSX.Element {
    return (
      <div className="emptyRecordTemplate">
        <span>No thread data available.</span>
      </div>
    );
  }

  override render(): JSX.Element {
    return (
      <div className="full-size flex-container">
        <GridComponent
          ref={this.gridRef}
          emptyRecordTemplate={this.emptyMessageTemplate}
          height="100%"
          rowHeight={16}
          className="flex-item"
          allowResizing={true}
          allowPaging={false}
          allowGrouping={true}
          showColumnMenu={true}
          allowFiltering={false}
          groupSettings={this.groupOptions}
          selectionSettings={this.selectionOptions}
          gridLines="Both"
        >
          <ColumnsDirective>
            <ColumnDirective
              field="active"
              headerText="Active"
              isPrimaryKey={true}
              textAlign="Left"
              autoFit={true}
              clipMode="EllipsisWithTooltip"
            />
            <ColumnDirective
              field="groupId"
              headerText="Group Id"
              autoFit={true}
              clipMode="EllipsisWithTooltip"
            />
            <ColumnDirective
              field="id"
              headerText="Id"
              autoFit={true}
              clipMode="EllipsisWithTooltip"
            />
            <ColumnDirective
              field="details"
              headerText="Details"
              autoFit={true}
              clipMode="EllipsisWithTooltip"
            />
            <ColumnDirective
              field="frame"
              headerText="Frame"
              autoFit={true}
              clipMode="EllipsisWithTooltip"
            />
            <ColumnDirective
              field="state"
              headerText="State"
              autoFit={true}
              clipMode="EllipsisWithTooltip"
            />
            <ColumnDirective
              field="name"
              headerText="Name"
              autoFit={true}
              clipMode="EllipsisWithTooltip"
            />
            <ColumnDirective
              field="targetId"
              headerText="Target Id"
              autoFit={true}
              clipMode="EllipsisWithTooltip"
            />
          </ColumnsDirective>
          <Inject services={[Resize, ColumnMenu, Group]} />
        </GridComponent>
      </div>
    );
  }
}
