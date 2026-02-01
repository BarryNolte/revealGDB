import {
  ColumnDirective,
  ColumnMenu,
  ColumnsDirective,
  Edit,
  GridComponent,
  Inject,
  QueryCellInfoEventArgs,
  Resize,
  CellSaveArgs,
  EditSettingsModel,
  IEditCell,
} from "@syncfusion/ej2-react-grids";
import { Component, createRef, JSX } from "react";
import { gdbRegisters } from "../../main/mi-interface/gdb-state-database/gdbStateDatabase";

import "./GdbRegistersWindow.css";
import { GdbAny } from "../../common/gdb-common";

export default class GdbRegistersWindow extends Component {
  private gridRef = createRef<GridComponent>();

  private editSettings: EditSettingsModel = {
    allowEditing: true,
    allowAdding: false,
    allowDeleting: false,
    showConfirmDialog: false,
    mode: "Batch",
  };

  private editParams: IEditCell = {
    params: {
      showClearButton: true,
      allowEdit: true,
    },
  };

  private hexCheck = (e: { element: Element; value: string }): boolean => {
    const regex = /^0[x|X][0-9A-Fa-f]{1,8}$|^[0-9A-Fa-f]{1,8}$/gm;

    const m = regex.exec(e.value);

    if (!m) return false;

    return true;
  };

  private validationRules = {
    required: true,
    hexFormat: [this.hexCheck, "Hex value is not valid"],
  };

  private emptyMessageTemplate(): JSX.Element {
    return (
      <div className="emptyRecordTemplate">
        <span>No register data available.</span>
      </div>
    );
  }

  override componentDidMount() {
    window.ipcToMain.dataRegisters((data: gdbRegisters[]) => {
      if (this.gridRef.current) {
        const dataList: GdbAny[] = [];
        data.forEach((reg) => {
          dataList.push({
            name: reg.name,
            value: reg.value,
            changed: reg.changed,
          });
        });

        this.gridRef.current.setProperties({
          dataSource: dataList,
        });
      }
    });
  }

  // override componentWillUnmount(): void {
  //   this.gridRef?.current?.columns.forEach((item) => {
  //     console.log(`Register Columns: ${item}`);
  //   });
  // }

  private queryCellInfo = (args: QueryCellInfoEventArgs): void => {
    if (args.column?.field === "value" && (args.data as gdbRegisters).changed === true) {
      args.cell?.classList.add("register-changed-cell");
    }
  };

  private cellSaved = (args: CellSaveArgs) => {
    window.ipcToMain.sendGdbCommand(`set $${(args.rowData as gdbRegisters)?.name} = ${args.value}`);
  };

  override render(): JSX.Element {
    return (
      <div className="full-size flex-container">
        <GridComponent
          ref={this.gridRef}
          emptyRecordTemplate={this.emptyMessageTemplate}
          height="100%"
          rowHeight={16}
          className="flex-item"
          queryCellInfo={this.queryCellInfo}
          allowResizing={true}
          allowPaging={false}
          allowSorting={false}
          showColumnMenu={true}
          allowFiltering={false}
          editSettings={this.editSettings}
          gridLines="Both"
          cellSaved={this.cellSaved}
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
              allowEditing={true}
              clipMode="EllipsisWithTooltip"
              edit={this.editParams}
              validationRules={this.validationRules}
            />
          </ColumnsDirective>
          <Inject services={[Resize, ColumnMenu, Edit]} />
        </GridComponent>
      </div>
    );
  }
}
