/**
 * Implements gdb breakpoints window behavior for debugger tool-window rendering and interactions.
 *
 * @remarks
 * Exported symbols include `GdbBreakPointWindow`. It coordinates live debugger data with user interactions in docked tool-window views.
 */
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
  Reorder,
  Resize,
  SelectionSettingsModel,
} from "@syncfusion/ej2-react-grids";
import {
  JSX,
  MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { gdbBreakpoint } from "../../main/mi-interface/gdb-state-database/gdbStateDatabase";

import imgDelete from "../icons/icons8-delete-48.png";
import { BreakpointGridRow, mapBreakpointsToGridRows } from "../mappers/grid-data-mappers";
import { useGridColumnState } from "../utilities/useGridColumnState";
import "./GdbBreakpointsWindow.css";
import { ToolWindowContent } from "./ToolWindowContent";
import { TOOL_WINDOW_TITLES } from "./toolWindowTitles";

/**
 * Performs gdb break point window as part of this module's public API.
 *
 * @remarks
 * Supports debugger tool-window rendering, interaction handling, or data synchronization.
 *
 * @returns The computed result produced by this operation.
 */
export default function GdbBreakPointWindow(): JSX.Element {
  const gridRef = useRef<GridComponent | null>(null);
  const [breakpointData, setBreakpointData] = useState<BreakpointGridRow[]>([]);
  useGridColumnState("breakpoints", gridRef);

  /** Grid selection settings: allow multiple row/cell selection */
  const selectionOptions: SelectionSettingsModel = useMemo(
    () => ({
      mode: "Both",
      type: "Multiple",
    }),
    [],
  );

  /**
   * Subscribe to breakpoint data updates from GDB.
   * Transforms GDB breakpoint data into grid-compatible format.
   */
  useEffect(() => {
    const unsubscribe = window.ipcToMain.debuggerData.breakpoints(
      (data: Map<string, gdbBreakpoint>) => {
        setBreakpointData(mapBreakpointsToGridRows(data));
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  /**
   * Force a full grid refresh when data becomes empty to work around Syncfusion's
   * CRUD delta-update path skipping row removal when the incoming dataset is [].
   */
  useEffect(() => {
    if (breakpointData.length === 0) {
      setTimeout(() => {
        gridRef.current?.refresh();
      }, 100);
    }
  }, [breakpointData]);

  const emptyMessageTemplate = useCallback((): JSX.Element => {
    return (
      <div className="emptyRecordTemplate">
        <span>There are no breakpoints.</span>
      </div>
    );
  }, []);

  const checkboxTemplate = useCallback((props: BreakpointGridRow) => {
    return (
      <div className="bp-delete-container">
        <button
          type="button"
          className="bp-delete"
          name="delete"
          onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
            const attr = e.currentTarget.getAttribute("data-id");
            window.ipcToMain.commands.debugger.sendGdbCommand(`d ${attr}`);
          }}
          data-id={props?.number}
        >
          <img className="bp-delete-img" src={imgDelete} alt="Delete Breakpoint"></img>
        </button>
        <input
          type="checkbox"
          className="bp-enable"
          title="Enable"
          checked={Boolean(props?.enabled)}
          onClick={(e: ReactMouseEvent<HTMLInputElement>) => {
            const attr = e.currentTarget.getAttribute("data-id");
            window.ipcToMain.commands.debugger.sendGdbCommand(
              e.currentTarget.checked === true ? `enable ${attr}` : `disable ${attr}`,
            );
          }}
          data-id={props?.number}
        />
      </div>
    );
  }, []);

  const onAction = useCallback((args: NotifyArgs) => {
    switch (args.requestType) {
      case "delete":
        {
          const delArgs: DeleteEventArgs = args;
          const rows = (delArgs.data ?? []) as BreakpointGridRow[];
          rows.forEach((bp) => {
            window.ipcToMain.commands.debugger.sendGdbCommand(`d ${bp.number}`);
          });
        }
        break;
    }
  }, []);

  const contextMenuItems: ContextMenuItem[] = useMemo(() => ["Copy", "Delete"], []);
  const editing = useMemo(() => ({ allowDeleting: true }), []);

  return (
    <ToolWindowContent title={TOOL_WINDOW_TITLES.breakpoints}>
      <div className="full-size flex-container">
        <GridComponent
          className="flex-item"
          id="breakpoints-grid"
          dataSource={breakpointData}
          emptyRecordTemplate={emptyMessageTemplate}
          height="100%"
          rowHeight={16}
          allowResizing={true}
          allowReordering={true}
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
            <ColumnDirective
              field="fullName"
              headerText="Full Path"
              clipMode="EllipsisWithTooltip"
            />
            <ColumnDirective field="tg" headerText="Thread Group" clipMode="EllipsisWithTooltip" />
            <ColumnDirective
              field="orgloc"
              headerText="Original Location"
              clipMode="EllipsisWithTooltip"
            />
            <ColumnDirective field="disp" headerText="Display" clipMode="EllipsisWithTooltip" />
            <ColumnDirective field="type" headerText="Type" clipMode="EllipsisWithTooltip" />
          </ColumnsDirective>
          <Inject services={[Resize, Reorder, ColumnMenu, ContextMenu]} />
        </GridComponent>
      </div>
    </ToolWindowContent>
  );
}
