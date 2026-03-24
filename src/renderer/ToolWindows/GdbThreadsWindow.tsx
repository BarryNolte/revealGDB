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
import {
  gdbThread,
  gdbThreadGroup,
} from "../../main/mi-interface/gdb-state-database/gdbStateDatabase";
import { menuCopy } from "../utilities/Clipboard";
import "./GdbThreadsWindow.css";
import { ToolWindowContent } from "./ToolWindowContent";
import { TOOL_WINDOW_TITLES } from "./toolWindowTitles";

/**
 * Threads window component.
 * Renders a Syncfusion grid with thread data grouped by process.
 */
export default function GdbThreadsWindow(): JSX.Element {
  const menuId = useId();
  const gridRef = useRef<GridComponent | null>(null);
  const [threadData, setThreadData] = useState<GdbAny[]>([]);

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
    const unsubscribe = window.ipcToMain.dataThreads((data: GdbAny) => {
      const threadList: GdbAny[] = [];

      const groups = data.grp;
      const threads = data.th;

      groups.forEach((group: gdbThreadGroup) => {
        threads.forEach((thread: gdbThread) => {
          threadList.push({
            groupId: group.gid,
            active: thread.active,
            id: thread.id,
            targetId: thread.targetId,
            details: thread.details,
            name: thread.name,
            state: thread.state,
            frame: `${thread.frame.func}:${thread.frame.line}`,
          });
        });
      });

      setThreadData(threadList);
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
