import {
  ColumnDirective,
  ColumnMenu,
  ColumnsDirective,
  GridComponent,
  Inject,
  RecordDoubleClickEventArgs,
  Resize,
  SelectionSettingsModel,
} from "@syncfusion/ej2-react-grids";
import { JSX, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { gdbStackFrame } from "../../main/mi-interface/gdb-state-database/gdbStateDatabase";

import { ContextMenuComponent } from "@syncfusion/ej2-react-navigations";
import { GdbAny } from "../../common/gdb-common";
import { menuCopy } from "../utilities/Clipboard";
import "./GdbCallstackWindow.css";

/**
 * Call stack window component.
 * Renders a Syncfusion grid with stack frame data from GDB.
 */
export default function GdbCallStackWindow(): JSX.Element {
  const menuId = useId();
  const gridRef = useRef<GridComponent | null>(null);
  const [stackData, setStackData] = useState<gdbStackFrame[]>([]);

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
    const unsubscribe = window.ipcToMain.stackFrames((data: gdbStackFrame[]) => {
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

      setStackData(dataList);

      // Directly update grid's dataSource to ensure it clears properly
      // const grid = gridRef.current;
      // if (grid) {
      //   grid.dataSource = dataList;
      //   grid.refresh(); // Must call refresh() to update internal currentViewData
      // }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  /**
   * Auto-fit columns after data updates.
   * Runs after React has updated the grid with new stack frame data.
   */
  useEffect(() => {
    // const grid = gridRef.current;
    // if (!grid) {
    //   return;
    // }

    // Only auto-fit columns when there's data to fit
    //if (stackData.length > 0) {
    gridRef?.current?.autoFitColumns(
      ["active", "level", "func", "addr", "file", "fullName", "line", "from", "args", "arch"],
      0,
    );
    //}
  }, [stackData]);

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
    window.ipcToMain.sendGdbCommand(`frame ${e.rowIndex}`);
  }, []);

  return (
    <div className="full-size flex-container">
      <GridComponent
        ref={gridRef}
        id="callstack-grid"
        dataSource={stackData}
        emptyRecordTemplate={emptyMessageTemplate}
        height="100%"
        rowHeight={16}
        allowResizing={true}
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
      <ContextMenuComponent
        id={`callstack-menu-${menuId}`}
        target="#callstack-grid"
        items={menuCopy}
        select={() => {
          gridRef.current?.copy();
        }}
      />
    </div>
  );
}
