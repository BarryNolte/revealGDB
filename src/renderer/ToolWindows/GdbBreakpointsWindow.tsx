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
  SelectionSettingsModel,
} from "@syncfusion/ej2-react-grids";
import { JSX, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GdbAny } from "../../common/gdb-common";
import { gdbBreakpoint } from "../../main/mi-interface/gdb-state-database/gdbStateDatabase";

import imgUrl from "../icons/icons8-delete-48.png";
import "./GdbBreakpointsWindow.css";

export default function GdbBreakPointWindow(): JSX.Element {
  const gridRef = useRef<GridComponent | null>(null);
  const [breakpointData, setBreakpointData] = useState<GdbAny[]>([]);

  const selectionOptions: SelectionSettingsModel = useMemo(
    () => ({
      mode: "Both",
      type: "Multiple",
    }),
    [],
  );
  useEffect(() => {
    const unsubscribe = window.ipcToMain.dataBrkPts((data: Map<string, gdbBreakpoint>) => {
      const grid = gridRef.current;
      if (!grid) {
        return;
      }

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

      setBreakpointData(dataList);

      grid.autoFitColumns(
        [
          "number",
          "addr",
          "func",
          "file",
          "line",
          "times",
          "installed",
          "fullName",
          "tg",
          "orgloc",
          "type",
          "disp",
        ],
        0,
      );
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const emptyMessageTemplate = useCallback((): GdbAny => {
    return (
      <div className="emptyRecordTemplate">
        <span>There are no breakpoints.</span>
      </div>
    );
  }, []);

  const checkboxTemplate = useCallback((props: GdbAny) => {
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
  }, []);

  const onAction = useCallback((args: NotifyArgs) => {
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
  }, []);

  const contextMenuItems: ContextMenuItem[] = useMemo(() => ["Copy", "Delete"], []);
  const editing = useMemo(() => ({ allowDeleting: true }), []);

  return (
    <div className="full-size flex-container">
      <GridComponent
        className="flex-item"
        id="breakpoints-grid"
        dataSource={breakpointData}
        emptyRecordTemplate={emptyMessageTemplate}
        height="100%"
        rowHeight={16}
        allowResizing={true}
        allowPaging={false}
        allowSorting={false}
        showColumnMenu={true}
        allowFiltering={false}
        contextMenuItems={contextMenuItems}
        selectionSettings={selectionOptions}
        editSettings={editing}
        ref={gridRef}
        gridLines="Both"
        actionBegin={onAction}
      >
        <ColumnsDirective>
          <ColumnDirective
            field="enabled"
            toolTip="BP Enabled"
            headerText=""
            allowEditing={true}
            template={checkboxTemplate}
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
            clipMode="EllipsisWithTooltip"
          />
          <ColumnDirective field="addr" headerText="Address" clipMode="EllipsisWithTooltip" />
          <ColumnDirective field="func" headerText="Function" clipMode="EllipsisWithTooltip" />
          <ColumnDirective field="file" headerText="File" clipMode="EllipsisWithTooltip" />
          <ColumnDirective
            field="line"
            headerText="Line"
            width="35px"
            clipMode="EllipsisWithTooltip"
          />
          <ColumnDirective field="times" headerText="Times" clipMode="EllipsisWithTooltip" />
          <ColumnDirective
            field="installed"
            headerText="Installed"
            clipMode="EllipsisWithTooltip"
          />
          <ColumnDirective field="fullName" headerText="Full Path" clipMode="EllipsisWithTooltip" />
          <ColumnDirective field="tg" headerText="Thread Group" clipMode="EllipsisWithTooltip" />
          <ColumnDirective
            field="orgloc"
            headerText="Original Location"
            clipMode="EllipsisWithTooltip"
          />
          <ColumnDirective field="disp" headerText="Display" clipMode="EllipsisWithTooltip" />
          <ColumnDirective field="type" headerText="Type" clipMode="EllipsisWithTooltip" />
        </ColumnsDirective>
        <Inject services={[Resize, ColumnMenu, ContextMenu]} />
      </GridComponent>
    </div>
  );
}
