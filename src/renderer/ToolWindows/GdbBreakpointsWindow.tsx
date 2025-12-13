import {
  ColumnDirective,
  ColumnMenu,
  ColumnsDirective,
  GridComponent,
  Inject,
  Resize,
  //SearchSettingsModel,
  Toolbar,
} from "@syncfusion/ej2-react-grids";
import { Component } from "react";
import { GdbAny } from "../../common/gdb-common";
import { gdbBreakpoint } from "../../main/mi-interface/gdb-state-database/gdbStateDatabase";

import "./GdbBreakpointsWindow.css";

export default class GdbBreakPointWindow extends Component {
  private grid: GridComponent | null = null;

  override componentDidMount() {
    window.ipcToMain.dataBrkPts((data: gdbBreakpoint[]) => {
      if (!this.grid) return;

      this.grid.dataSource = [];
      data.forEach((bp) => {
        (this.grid?.dataSource as object[]).push({
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

      this.grid?.setProperties({
        dataSource: this.grid?.dataSource as object[],
      });
    });
  }

  private checkboxTemplate = (props: GdbAny) => {
    return (
      <input
        type="checkbox"
        title="Enable"
        checked={props!.enabled}
        onClick={(e: GdbAny) => {
          const attr = e.target.getAttribute("data-id");
          window.ipcToMain.sendGdbCommand(
            e.target.checked === true ? `enable ${attr}` : `disable ${attr}`,
          );
        }}
        data-id={props!.number}
      />
    );
  };

  private setGridRef = (g: GdbAny) => {
    this.grid = g;
  };

  override render() {
    return (
      <div className="full-size flex-container">
        <GridComponent
          className="flex-item"
          allowResizing={true}
          allowPaging={false}
          allowSorting={false}
          showColumnMenu={true}
          allowFiltering={false}
          //toolbar={toolbarOptions}
          //searchSettings={searchOptions}
          ref={this.setGridRef}
          gridLines="Both"
          height="100%"
        >
          <ColumnsDirective>
            <ColumnDirective
              field="enabled"
              toolTip="BP Enabled"
              headerText=""
              template={this.checkboxTemplate}
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
      </div>
    );
  }
}
