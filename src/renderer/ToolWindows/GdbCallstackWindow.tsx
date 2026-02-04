import {
  ColumnDirective,
  ColumnMenu,
  ColumnsDirective,
  GridComponent,
  Inject,
  RecordDoubleClickEventArgs,
  Resize,
} from "@syncfusion/ej2-react-grids";
import { Component, createRef, JSX } from "react";
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

        this.gridRef.current?.autoFitColumns(
          ["active", "level", "func", "addr", "file", "fullName", "line", "from", "args", "arch"],
          0,
        );
      }
    });
  }

  private emptyMessageTemplate(): JSX.Element {
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
          height="100%"
          rowHeight={16}
          allowResizing={true}
          allowPaging={false}
          allowSorting={false}
          showColumnMenu={true}
          allowFiltering={false}
          allowSelection={true}
          selectionSettings={{ mode: "Row", cellSelectionMode: "Flow" }}
          gridLines="Both"
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
              clipMode="EllipsisWithTooltip"
            />
            <ColumnDirective
              field="func"
              headerText="Function"
              autoFit={true}
              clipMode="EllipsisWithTooltip"
            />
            <ColumnDirective
              field="addr"
              headerText="Address"
              autoFit={true}
              clipMode="EllipsisWithTooltip"
            />
            <ColumnDirective
              field="file"
              headerText="File"
              autoFit={true}
              clipMode="EllipsisWithTooltip"
            />
            <ColumnDirective
              field="fullName"
              headerText="Full Path"
              autoFit={true}
              clipMode="EllipsisWithTooltip"
            />
            <ColumnDirective
              field="line"
              headerText="Line"
              autoFit={true}
              clipMode="EllipsisWithTooltip"
            />
            <ColumnDirective
              field="from"
              headerText="From"
              autoFit={true}
              clipMode="EllipsisWithTooltip"
            />
            <ColumnDirective
              field="args"
              headerText="Arguments"
              autoFit={true}
              clipMode="EllipsisWithTooltip"
            />
            <ColumnDirective
              field="arch"
              headerText="Architecture"
              autoFit={true}
              clipMode="EllipsisWithTooltip"
            />
          </ColumnsDirective>
          <Inject services={[Resize, ColumnMenu]} />
        </GridComponent>
      </div>
    );
  }
}
