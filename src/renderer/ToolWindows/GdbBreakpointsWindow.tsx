import {
  ColumnDirective,
  ColumnMenu,
  ColumnsDirective,
  ContextMenu,
  ContextMenuItem,
  DeleteEventArgs,
  GridComponent,
  Inject,
  NotifyArgs,
  Resize,
} from "@syncfusion/ej2-react-grids";
import { Component, createRef } from "react";
import { GdbAny } from "../../common/gdb-common";
import { gdbBreakpoint } from "../../main/mi-interface/gdb-state-database/gdbStateDatabase";

import "./GdbBreakpointsWindow.css";
import imgUrl from "../icons/icons8-delete-48.png";

export default class GdbBreakPointWindow extends Component {
  private gridRef = createRef<GridComponent>();

  override componentDidMount() {
    window.ipcToMain.dataBrkPts((data: gdbBreakpoint[]) => {
      if (this.gridRef.current) {
        const dataList: GdbAny[] = [];
        data.forEach((bp) => {
          dataList.push({
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
            installed: bp.installed || "--",
            orgloc: bp.orgloc,
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
        <span>There are no breakpoints.</span>
      </div>
    );
  }

  private checkboxTemplate = (props: GdbAny) => {
    return (
      <div className="bp-delete-container">
        <button
          type="button"
          className="bp-delete"
          name="delete"
          onClick={(e: GdbAny) => {
            const attr = e.currentTarget.getAttribute("data-id");
            window.ipcToMain.sendGdbCommand(`d ${attr}`);
          }}
          data-id={props!.number}
        >
          <img className="bp-delete-img" src={imgUrl} alt="Delete Breakpoint"></img>
        </button>
        <input
          type="checkbox"
          className="bp-enable"
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
      </div>
    );
  };

  private onAction(args: NotifyArgs) {
    switch (args.requestType) {
      case "delete":
        {
          const delArgs: DeleteEventArgs = args;
          delArgs.data?.forEach((bp: GdbAny) => {
            window.ipcToMain.sendGdbCommand(`d ${bp.number}`);
          });
        }
        break;
    }
  }

  contextMenuItems: ContextMenuItem[] = ["Copy", "Delete"];
  editing = { allowDeleting: true };

  override render() {
    return (
      <div className="full-size flex-container">
        <GridComponent
          className="flex-item"
          emptyRecordTemplate={this.emptyMessageTemplate}
          allowResizing={true}
          allowPaging={false}
          allowSorting={false}
          showColumnMenu={true}
          allowFiltering={false}
          contextMenuItems={this.contextMenuItems}
          editSettings={this.editing}
          ref={this.gridRef}
          gridLines="Both"
          actionBegin={this.onAction}
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
            <ColumnDirective field="installed" headerText="Installed" autoFit={true} />
            <ColumnDirective field="fullName" headerText="Full Path" autoFit={true} />
            <ColumnDirective field="tg" headerText="Thread Group" autoFit={true} />
            <ColumnDirective field="orgloc" headerText="Original Location" autoFit={true} />
            <ColumnDirective field="disp" headerText="Display" autoFit={true} />
            <ColumnDirective field="type" headerText="Type" autoFit={true} />
          </ColumnsDirective>
          <Inject services={[Resize, ColumnMenu, ContextMenu]} />
        </GridComponent>
      </div>
    );
  }
}
