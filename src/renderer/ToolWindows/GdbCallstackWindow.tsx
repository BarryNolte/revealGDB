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
import { JSX, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { gdbStackFrame } from "../../main/mi-interface/gdb-state-database/gdbStateDatabase";

import { ContextMenuComponent } from "@syncfusion/ej2-react-navigations";
import { CallstackGridRow, mapStackFramesToGridRows } from "../mappers/grid-data-mappers";
import { menuCopy } from "../utilities/Clipboard";
import { useGridColumnState } from "../utilities/useGridColumnState";
import "./GdbCallstackWindow.css";
import { ToolWindowContent } from "./ToolWindowContent";
import { TOOL_WINDOW_TITLES } from "./toolWindowTitles";

/**
 * Call stack window component.
 * Renders a Syncfusion grid with stack frame data from GDB.
 */
export default function GdbCallStackWindow(): JSX.Element {
  const menuId = useId();
  const gridRef = useRef<GridComponent | null>(null);
  const [stackData, setStackData] = useState<CallstackGridRow[]>([]);
  useGridColumnState("callstack", gridRef);

  /** Grid selection settings: allow multiple row/cell selection */
  const selectionOptions: SelectionSettingsModel = useMemo(
    () => ({
      mode: "Both",
      type: "Multiple",
    }),
    [],
  );

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

  /**
   * Template for empty grid state.
   * Displays a friendly message when no stack frames are available.
   */
  const emptyMessageTemplate = useCallback((): JSX.Element => {
    return (
      <div className="emptyRecordTemplate">
        <span>Callstack is empty.</span>
      </div>
    );
  }, []);

  /**
   * Handles double-click on stack frame row.
   * Navigates to the corresponding source location in the source window.
   */
  const handleRecordDoubleClick = useCallback((e: RecordDoubleClickEventArgs) => {
    window.ipcToMain.commands.debugger.sendGdbCommand(`frame ${e.rowIndex}`);
  }, []);

  return (
    <ToolWindowContent title={TOOL_WINDOW_TITLES.callstack}>
      <div className="full-size flex-container">
        <GridComponent
          ref={gridRef}
          id="callstack-grid"
          dataSource={stackData}
          emptyRecordTemplate={emptyMessageTemplate}
          height="100%"
          rowHeight={16}
          allowResizing={true}
          allowReordering={true}
          allowPaging={false}
          allowSorting={false}
          showColumnMenu={true}
          allowFiltering={false}
          allowSelection={true}
          selectionSettings={selectionOptions}
          gridLines="Both"
          recordDoubleClick={handleRecordDoubleClick}
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
