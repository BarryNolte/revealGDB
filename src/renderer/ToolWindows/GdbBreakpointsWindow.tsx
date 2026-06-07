/**
 * Implements gdb breakpoints window behavior for debugger tool-window rendering and interactions.
 *
 * @remarks
 * Exported symbols include `GdbBreakPointWindow`. It coordinates live debugger data with user interactions in docked tool-window views.
 */
import { ButtonComponent, CheckBoxComponent } from "@syncfusion/ej2-react-buttons";
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
  RecordDoubleClickEventArgs,
  Reorder,
  Resize,
  SelectionSettingsModel,
} from "@syncfusion/ej2-react-grids";
import {
  JSX,
  MouseEvent as ReactMouseEvent,
  RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { gdbBreakpoint } from "../../common/gdb-state-types";
import imgDelete from "../icons/icons8-delete-48.png";
import { BreakpointGridRow, mapBreakpointsToGridRows } from "../mappers/grid-data-mappers";
import { useGridColumnState } from "../utilities/useGridColumnState";
import "./GdbBreakpointsWindow.css";
import { ToolWindowContent } from "./ToolWindowContent";
import { TOOL_WINDOW_TITLES } from "./toolWindowTitles";

const SELECTION_OPTIONS: SelectionSettingsModel = { mode: "Both", type: "Multiple" };
const CONTEXT_MENU_ITEMS: ContextMenuItem[] = ["Copy", "Delete"];
const EDITING = { allowDeleting: true };
/**
 * Performs emptyMessageTemplate as part of this module's internal workflow.
 *
 * @returns The computed result produced by this operation.
 */

function emptyMessageTemplate(): JSX.Element {
  return (
    <div className="emptyRecordTemplate">
      <span>There are no breakpoints.</span>
    </div>
  );
}
/**
 * Performs BreakpointActionCell as part of this module's internal workflow.
 *
 * @param props - props parameter.
 * @returns The computed result produced by this operation.
 */

function BreakpointActionCell(props: BreakpointGridRow): JSX.Element {
  return (
    <div className="bp-delete-container">
      <ButtonComponent
        className="bp-delete"
        name="delete"
        onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
          const attr = e.currentTarget.getAttribute("data-id");
          window.ipcToMain.commands.debugger.sendGdbCommand(`d ${attr}`);
        }}
        data-id={props?.number}
      >
        <img className="bp-delete-img" src={imgDelete} alt="Delete Breakpoint"></img>
      </ButtonComponent>
      <CheckBoxComponent
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
}
/**
 * Performs onAction as part of this module's internal workflow.
 *
 * @param args - args parameter.
 * @returns The computed result produced by this operation.
 */

function onAction(args: NotifyArgs): void {
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
}
/**
 * Performs handleRecordDoubleClick as part of this module's internal workflow.
 *
 * @param e - e parameter.
 * @returns The computed result produced by this operation.
 */

function handleRecordDoubleClick(e: RecordDoubleClickEventArgs): void {
  const row = e.rowData as BreakpointGridRow;
  if (row?.fullName && row?.line) {
    void window.ipcToMain.queries.debugger.showSourceAt(row.fullName, row.line);
  }
}
/**
 * Performs useBreakpointData as part of this module's internal workflow.
 *
 * @param gridRef - gridRef parameter.
 * @returns The computed result produced by this operation.
 */

function useBreakpointData(gridRef: RefObject<GridComponent | null>): {
  breakpointData: BreakpointGridRow[];
  onGridCreated: () => void;
} {
  const [breakpointData, setBreakpointData] = useState<BreakpointGridRow[]>([]);
  // Tracks the latest data so the created handler can access it without a stale closure
  const latestDataRef = useRef<BreakpointGridRow[]>([]);

  useEffect(() => {
    const unsubscribe = window.ipcToMain.debuggerData.breakpoints(
      (data: Map<string, gdbBreakpoint>) => {
        const rows = mapBreakpointsToGridRows(data);
        latestDataRef.current = rows;
        setBreakpointData(rows);
      },
    );
    return () => {
      unsubscribe();
    };
  }, []);

  // When data becomes empty, explicitly set the Syncfusion DataManager to []
  // and call dataBind() to force a re-render of the row area.
  // This runs after React's commit phase, guaranteeing componentDidUpdate has
  // already fired, so the assignment overrides any in-flight async dataBind.
  // Note: refresh() is intentionally NOT used here — it only repaints UI chrome
  // (header/filter bar) and does not re-process data.
  useEffect(() => {
    if (breakpointData.length !== 0) return;
    const grid = gridRef.current;
    if (!grid) return;
    grid.dataSource = [];
    grid.dataBind();
  }, [breakpointData, gridRef]);

  // Handle the initialization race: if IPC messages arrive while Syncfusion is
  // still running componentDidMount, the empty-array update can be dropped
  // before the grid's data pipeline is ready.  The created event fires once
  // initialization is complete, at which point we enforce the current state.
  const onGridCreated = useCallback(() => {
    if (latestDataRef.current.length !== 0) return;
    const grid = gridRef.current;
    if (!grid) return;
    grid.dataSource = [];
    grid.dataBind();
  }, [gridRef]);

  return { breakpointData, onGridCreated };
}
/**
 * Performs breakpointColumnDefinitions as part of this module's internal workflow.
 *
 * @returns The computed result produced by this operation.
 */

function breakpointColumnDefinitions(): JSX.Element {
  return (
    <ColumnsDirective>
      <ColumnDirective
        field="enabled"
        toolTip="BP Enabled"
        headerText=""
        allowEditing={true}
        template={BreakpointActionCell}
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
      <ColumnDirective field="line" headerText="Line" width="35px" clipMode="EllipsisWithTooltip" />
      <ColumnDirective field="times" headerText="Times" clipMode="EllipsisWithTooltip" />
      <ColumnDirective field="installed" headerText="Installed" clipMode="EllipsisWithTooltip" />
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
  );
}

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
  const { breakpointData, onGridCreated } = useBreakpointData(gridRef);
  useGridColumnState("breakpoints", gridRef);

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
          contextMenuItems={CONTEXT_MENU_ITEMS}
          selectionSettings={SELECTION_OPTIONS}
          editSettings={EDITING}
          ref={gridRef}
          gridLines="Both"
          actionBegin={onAction}
          recordDoubleClick={handleRecordDoubleClick}
          created={onGridCreated}
        >
          {breakpointColumnDefinitions()}
          <Inject services={[Resize, Reorder, ColumnMenu, ContextMenu]} />
        </GridComponent>
      </div>
    </ToolWindowContent>
  );
}
