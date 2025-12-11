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
  //SearchSettingsModel,
  Sort,
  Toolbar,
} from "@syncfusion/ej2-react-grids";
import { Component } from "react";
import { GdbAny } from "../../common/gdb-common";
import { gdbRegisters } from "../../main/mi-interface/gdb-state-database/gdbStateDatabase";

import "./GdbRegisterWindow.css";

export default class GdbRegistersWindow extends Component {
  private grid: GridComponent | null = null;

  private editSettings = {
    allowEditing: true,
    allowAdding: false,
    allowDeleting: false,
  };
  private stringParams = {
    params: {
      showClearButton: true,
    },
  };

  override componentDidMount() {
    window.ipcToMain.dataRegisters((data: gdbRegisters[]) => {
      if (this.grid) {
        this.grid.dataSource = [];
        data.forEach((reg) => {
          ((this.grid as GridComponent).dataSource as object[]).push({
            name: reg.name,
            value: reg.value,
            changed: reg.changed,
          });
        });

        (this.grid as GridComponent).setProperties({
          dataSource: (this.grid as GridComponent).dataSource as object[],
        });
      }
    });
  }

  override componentWillUnmount(): void {
    this.grid?.columns.forEach((item) => {
      console.log(`Register Columns: ${item}`);
    });
  }

  private queryCellInfo = (args: QueryCellInfoEventArgs): void => {
    if (args.column?.field === "value" && (args.data as gdbRegisters).changed === true) {
      args.cell?.classList.add("register-changed-cell");
    }
  };

  private setGridRef = (g: GdbAny) => {
    this.grid = g;
  };

  override render() {
    return (
      <div className="full-size flex-container">
        <GridComponent
          className="flex-item"
          queryCellInfo={this.queryCellInfo}
          allowResizing={true}
          allowPaging={false}
          allowSorting={false}
          showColumnMenu={true}
          allowFiltering={false}
          editSettings={this.editSettings}
          //toolbar={toolbarOptions}
          //searchSettings={searchOptions}
          ref={this.setGridRef}
          gridLines="Both"
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
            <ColumnDirective
              field="value"
              headerText="Value"
              width="80%"
              edit={this.stringParams}
            />
          </ColumnsDirective>
          <Inject services={[Resize, Sort, Group, ColumnMenu, Edit, Toolbar]} />
        </GridComponent>
      </div>
    );
  }
}
