/**
 * Implements gdb callstack window behavior for debugger tool-window rendering and interactions.
 *
 * @remarks
 * Exported symbols include `GdbCallStackWindow`. It coordinates live debugger data with user interactions in docked tool-window views.
 */
import {
  ColumnDirective,
  ColumnMenu,
  ColumnsDirective,
  GridComponent,
  Inject,
  RecordDoubleClickEventArgs,
  Reorder,
  Resize,
  SelectionSettingsModel,
} from "@syncfusion/ej2-react-grids";
import { JSX, useEffect, useId, useRef, useState } from "react";
import { gdbStackFrame } from "../../common/gdb-state-types";

import { ContextMenuComponent } from "@syncfusion/ej2-react-navigations";
import { CallstackGridRow, mapStackFramesToGridRows } from "../mappers/grid-data-mappers";
import { menuCopy } from "../utilities/Clipboard";
import { useGridColumnState } from "../utilities/useGridColumnState";
import "./GdbCallstackWindow.css";
import { ToolWindowContent } from "./ToolWindowContent";
import { TOOL_WINDOW_TITLES } from "./toolWindowTitles";

const CALLSTACK_SELECTION_OPTIONS: SelectionSettingsModel = { mode: "Both", type: "Multiple" };
/**
 * Performs callstackEmptyTemplate as part of this module's internal workflow.
 *
 * @returns The computed result produced by this operation.
 */

function callstackEmptyTemplate(): JSX.Element {
  return (
    <div className="emptyRecordTemplate">
      <span>Callstack is empty.</span>
    </div>
  );
}
/**
 * Performs handleCallstackDoubleClick as part of this module's internal workflow.
 *
 * @param e - e parameter.
 * @returns The computed result produced by this operation.
 */

function handleCallstackDoubleClick(e: RecordDoubleClickEventArgs): void {
  const row = e.rowData as CallstackGridRow | undefined;
  if (!row?.level) {
    return;
  }

  window.ipcToMain.commands.debugger.sendGdbCommand({
    kind: "select-stack-frame",
    frameLevel: row.level,
  });
}

/**
 * Performs gdb call stack window as part of this module's public API.
 *
 * @remarks
 * Supports debugger tool-window rendering, interaction handling, or data synchronization.
 *
 * @returns The computed result produced by this operation.
 */
export default function GdbCallStackWindow(): JSX.Element {
  const menuId = useId();
  const gridRef = useRef<GridComponent | null>(null);
  const [stackData, setStackData] = useState<CallstackGridRow[]>([]);
  useGridColumnState("callstack", gridRef);

  /**
   * Subscribe to stack frame updates from GDB.
   * Transforms GDB stack data into grid-compatible format.
   */
  useEffect(() => {
    const unsubscribe = window.ipcToMain.debuggerData.stackFrames((data: gdbStackFrame[]) => {
      setStackData(mapStackFramesToGridRows(data));
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <ToolWindowContent title={TOOL_WINDOW_TITLES.callstack}>
      <div className="full-size flex-container">
        <GridComponent
          ref={gridRef}
          id="callstack-grid"
          dataSource={stackData}
          emptyRecordTemplate={callstackEmptyTemplate}
          height="100%"
          rowHeight={16}
          allowResizing={true}
          allowReordering={true}
          allowPaging={false}
          allowSorting={false}
          showColumnMenu={true}
          allowFiltering={false}
          allowSelection={true}
          selectionSettings={CALLSTACK_SELECTION_OPTIONS}
          gridLines="Both"
          recordDoubleClick={handleCallstackDoubleClick}
        >
          <ColumnsDirective>
            <ColumnDirective field="active" headerText="" width={50} showColumnMenu={false} />
            <ColumnDirective
              field="level"
              headerText="Depth"
              isPrimaryKey={true}
              textAlign="Left"
              clipMode="EllipsisWithTooltip"
            />
            <ColumnDirective field="func" headerText="Function" clipMode="EllipsisWithTooltip" />
            <ColumnDirective field="addr" headerText="Address" clipMode="EllipsisWithTooltip" />
            <ColumnDirective field="file" headerText="File" clipMode="EllipsisWithTooltip" />
            <ColumnDirective
              field="fullName"
              headerText="Full Path"
              clipMode="EllipsisWithTooltip"
            />
            <ColumnDirective field="line" headerText="Line" clipMode="EllipsisWithTooltip" />
            <ColumnDirective field="from" headerText="From" clipMode="EllipsisWithTooltip" />
            <ColumnDirective field="args" headerText="Arguments" clipMode="EllipsisWithTooltip" />
            <ColumnDirective
              field="arch"
              headerText="Architecture"
              clipMode="EllipsisWithTooltip"
            />
          </ColumnsDirective>
          <Inject services={[Resize, Reorder, ColumnMenu]} />
        </GridComponent>
        <ContextMenuComponent
          id={`callstack-menu-${menuId}`}
          target="#callstack-grid"
          items={menuCopy}
          select={() => {
            gridRef.current?.copy();
          }}
        />
      </div>
    </ToolWindowContent>
  );
}
