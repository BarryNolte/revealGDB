import {
  ColumnDirective,
  ColumnMenu,
  ColumnsDirective,
  GridComponent,
  Inject,
  RecordDoubleClickEventArgs,
  Resize,
} from "@syncfusion/ej2-react-grids";
import { Component, createRef } from "react";
import { gdbStackFrame } from "../../main/mi-interface/gdb-state-database/gdbStateDatabase";

import "./GdbCallstackWindow.css";
import { GdbAny } from "../../common/gdb-common";

export default class GdbCallStackWindow extends Component {
  private gridRef = createRef<GridComponent>();

  override componentDidMount() {
    window.ipcToMain.stackFrames((data: gdbStackFrame[]) => {
      if (this.gridRef.current) {
        const dataList: GdbAny[] = [];

        data.forEach((frame) => {
          dataList.push({
            active: frame.active ? "*" : "",
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

        this.gridRef.current.setProperties({
          dataSource: dataList,
        });
      }
    });
  }

  private emptyMessageTemplate(): GdbAny {
    return (
      <div className="emptyRecordTemplate">
        <span>Callstack is empty.</span>
      </div>
    );
  }

  override render() {
    return (
      <div className="full-size flex-container">
        <GridComponent
          ref={this.gridRef}
          emptyRecordTemplate={this.emptyMessageTemplate}
          allowResizing={true}
          allowPaging={false}
          allowSorting={false}
          showColumnMenu={true}
          allowFiltering={false}
          allowSelection={true}
          selectionSettings={{ mode: "Row", cellSelectionMode: "Flow" }}
          gridLines="Both"
          height="100%"
          recordDoubleClick={(e: RecordDoubleClickEventArgs) => {
            window.ipcToMain.sendGdbCommand(`frame ${e.rowIndex}`);
          }}
        >
          <ColumnsDirective>
            <ColumnDirective field="active" headerText="" width={50} showColumnMenu={false} />
            <ColumnDirective
              field="level"
              headerText="Depth"
              isPrimaryKey={true}
              textAlign="Left"
              autoFit={true}
            />
            <ColumnDirective field="func" headerText="Function" autoFit={true} />
            <ColumnDirective field="addr" headerText="Address" autoFit={true} />
            <ColumnDirective field="file" headerText="File" autoFit={true} />
            <ColumnDirective field="fullName" headerText="Full Path" autoFit={true} />
            <ColumnDirective field="line" headerText="Line" autoFit={true} />
            <ColumnDirective field="from" headerText="From" autoFit={true} />
            <ColumnDirective field="args" headerText="Arguments" autoFit={true} />
            <ColumnDirective field="arch" headerText="Architecture" autoFit={true} />
          </ColumnsDirective>
          <Inject services={[Resize, ColumnMenu]} />
        </GridComponent>
      </div>
    );
  }
}
