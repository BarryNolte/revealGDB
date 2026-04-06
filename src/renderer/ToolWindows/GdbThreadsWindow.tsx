/**
 * Implements gdb threads window behavior for debugger tool-window rendering and interactions.
 *
 * @remarks
 * Exported symbols include `GdbThreadsWindow`. It coordinates live debugger data with user interactions in docked tool-window views.
 */
import {
  ColumnDirective,
  ColumnMenu,
  ColumnsDirective,
  GridComponent,
  Group,
  GroupSettingsModel,
  Inject,
  Resize,
  SelectionSettingsModel,
} from "@syncfusion/ej2-react-grids";
import { ContextMenuComponent } from "@syncfusion/ej2-react-navigations";
import { JSX, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { GdbAny } from "../../common/gdb-common";
import { ThreadGridRow, mapThreadDataToGridRows } from "../mappers/grid-data-mappers";
import { menuCopy } from "../utilities/Clipboard";
import "./GdbThreadsWindow.css";
import { ToolWindowContent } from "./ToolWindowContent";
import { TOOL_WINDOW_TITLES } from "./toolWindowTitles";

/**
 * Performs gdb threads window as part of this module's public API.
 *
 * @remarks
 * Supports debugger tool-window rendering, interaction handling, or data synchronization.
 *
 * @returns The computed result produced by this operation.
 */
export default function GdbThreadsWindow(): JSX.Element {
  const menuId = useId();
  const gridRef = useRef<GridComponent | null>(null);
  const [threadData, setThreadData] = useState<ThreadGridRow[]>([]);

  /** Grid selection settings: allow multiple row/cell selection */
  const selectionOptions: SelectionSettingsModel = useMemo(
    () => ({
      mode: "Both",
      type: "Multiple",
    }),
    [],
  );

  /** Group settings: group by thread group ID */
  const groupOptions: GroupSettingsModel = useMemo(
    () => ({
      columns: ["groupId"],
      showDropArea: false,
    }),
    [],
  );

  useEffect(() => {
    const unsubscribe = window.ipcToMain.debuggerData.threads((data: GdbAny) => {
      setThreadData(mapThreadDataToGridRows(data.th, data.grp));
    });

    return () => {
      unsubscribe();
    };
  }, []);

  /**
   * Auto-fit columns after data updates.
   * Runs after React has updated the grid with new thread data.
   */
  useEffect(() => {
    // Only auto-fit columns when there's data to fit
    if (threadData.length > 0) {
      gridRef?.current?.autoFitColumns(
        ["active", "id", "details", "frame", "state", "name", "targetId"],
        0,
      );
    }
  }, [threadData]);

  const emptyMessageTemplate = useCallback((): JSX.Element => {
    return (
      <div className="emptyRecordTemplate">
        <span>No thread data available.</span>
      </div>
    );
  }, []);

  return (
    <ToolWindowContent title={TOOL_WINDOW_TITLES.threads}>
      <div className="full-size flex-container">
        <GridComponent
          ref={gridRef}
          id="threads-grid"
          dataSource={threadData}
          emptyRecordTemplate={emptyMessageTemplate}
          height="100%"
          rowHeight={16}
          className="flex-item"
          allowResizing={true}
          allowPaging={false}
          allowGrouping={true}
          showColumnMenu={true}
          allowFiltering={false}
          groupSettings={groupOptions}
          selectionSettings={selectionOptions}
          gridLines="Both"
        >
          <ColumnsDirective>
            <ColumnDirective
              field="active"
              headerText="Active"
              isPrimaryKey={true}
              textAlign="Left"
              autoFit={true}
              clipMode="EllipsisWithTooltip"
            />
            <ColumnDirective
              field="groupId"
              headerText="Group Id"
              autoFit={true}
              clipMode="EllipsisWithTooltip"
            />
            <ColumnDirective
              field="id"
              headerText="Id"
              autoFit={true}
              clipMode="EllipsisWithTooltip"
            />
            <ColumnDirective
              field="details"
              headerText="Details"
              autoFit={true}
              clipMode="EllipsisWithTooltip"
            />
            <ColumnDirective
              field="frame"
              headerText="Frame"
              autoFit={true}
              clipMode="EllipsisWithTooltip"
            />
            <ColumnDirective
              field="state"
              headerText="State"
              autoFit={true}
              clipMode="EllipsisWithTooltip"
            />
            <ColumnDirective
              field="name"
              headerText="Name"
              autoFit={true}
              clipMode="EllipsisWithTooltip"
            />
            <ColumnDirective
              field="targetId"
              headerText="Target Id"
              autoFit={true}
              clipMode="EllipsisWithTooltip"
            />
          </ColumnsDirective>
          <Inject services={[Resize, ColumnMenu, Group]} />
        </GridComponent>
        <ContextMenuComponent
          id={`threads-menu-${menuId}`}
          target="#threads-grid"
          items={menuCopy}
          select={() => {
            gridRef.current?.copy();
          }}
        />
      </div>
    </ToolWindowContent>
  );
}
