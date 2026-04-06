/**
 * Implements gdb locals window behavior for debugger tool-window rendering and interactions.
 *
 * @remarks
 * Exported symbols include `GdbLocalsWindow`. It coordinates live debugger data with user interactions in docked tool-window views.
 */
import {
  Grid,
  ColumnMenu as GridColumnMenu,
  Edit as GridEdit,
  Reorder as GridReorder,
  Resize as GridResize,
  RowDataBoundEventArgs,
} from "@syncfusion/ej2-grids";
import {
  CellEditArgs,
  CellSaveArgs,
  IEditCell,
  SelectionSettingsModel,
} from "@syncfusion/ej2-react-grids";
import { ContextMenuComponent } from "@syncfusion/ej2-react-navigations";
import {
  ColumnDirective,
  ColumnMenu,
  ColumnsDirective,
  Edit,
  EditSettingsModel,
  Inject,
  Reorder,
  Resize,
  TreeGridComponent,
} from "@syncfusion/ej2-react-treegrid";
import { JSX, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { GdbAny } from "../../common/gdb-common";
import { menuCopy } from "../utilities/Clipboard";
import { useGridColumnState } from "../utilities/useGridColumnState";
import "./GdbLocalsWindow.css";
import { ToolWindowContent } from "./ToolWindowContent";
import { TOOL_WINDOW_TITLES } from "./toolWindowTitles";

// TreeGrid wraps an internal Grid instance, so inject matching Grid modules too.
Grid.Inject(GridResize, GridReorder, GridColumnMenu, GridEdit);

/**
 * Performs gdb locals window as part of this module's public API.
 *
 * @remarks
 * Supports debugger tool-window rendering, interaction handling, or data synchronization.
 *
 * @returns The computed result produced by this operation.
 */
export default function GdbLocalsWindow(): JSX.Element {
  const menuId = useId();
  const treeRef = useRef<TreeGridComponent | null>(null);
  const [localData, setLocalData] = useState<GdbAny[]>([]);
  useGridColumnState("locals", treeRef);

  /** Edit settings: enable cell editing in batch mode */
  const editSettings: EditSettingsModel = useMemo(
    () => ({
      allowEditing: true,
      allowAdding: false,
      allowDeleting: false,
      showConfirmDialog: false,
      mode: "Batch",
    }),
    [],
  );

  const editParams: IEditCell = useMemo(
    () => ({
      params: {
        showClearButton: true,
        allowEdit: true,
      },
    }),
    [],
  );

  const selectionOptions: SelectionSettingsModel = useMemo(
    () => ({
      mode: "Both",
      type: "Multiple",
    }),
    [],
  );

  useEffect(() => {
    const unsubscribe = window.ipcToMain.debuggerData.locals((data: GdbAny) => {
      setLocalData(data ? data : []);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const emptyMessageTemplate = useCallback((): JSX.Element => {
    return (
      <div className="emptyRecordTemplate">
        <span>Locals is empty.</span>
      </div>
    );
  }, []);

  const cellSaved = useCallback((args: CellSaveArgs) => {
    window.ipcToMain.commands.debugger.sendGdbCommand(
      `set var ${(args.rowData as GdbAny).fullpath} = ${args.value}`,
    );
  }, []);

  const cellEdit = useCallback((args: CellEditArgs) => {
    if (args.type === "edit") {
      if (args.columnName === "value" && (args.rowData as GdbAny).sublocals.length > 0) {
        args.cancel = true;
      }
    }
  }, []);

  /**
   * Performs row data bound as part of this module's internal workflow.
   *
   * @remarks
   * Supports debugger tool-window rendering, interaction handling, or data synchronization.
   *
   * @param args - Configuration values that control how this operation executes.
   */
  const rowDataBound = (args: RowDataBoundEventArgs) => {
    const value = (args.data as GdbAny).value as string | null | undefined;
    if (!value) return;
    const lineCount = value.split("\\n").length;
    (args.row as HTMLElement).style.height = `${lineCount * 16}px`;
  };

  /**
   * Performs value accessor as part of this module's internal workflow.
   *
   * @remarks
   * Supports debugger tool-window rendering, interaction handling, or data synchronization.
   *
   * @param _field - Value for `_field` consumed by this operation.
   * @param data - Structured payload consumed by this operation.
   * @returns The resulting string value produced by this operation.
   */
  const valueAccessor = (_field: string, data: GdbAny): string => {
    const value = data.value as string | null | undefined;
    return `<div class="treeGrid-multiline-cell">${(value ?? "").replaceAll("\\n", "<br>")}</div>`;
  };

  const content = (
    <div className="full-size flex-container">
      <TreeGridComponent
        ref={treeRef}
        id="locals-grid"
        dataSource={localData}
        emptyRecordTemplate={emptyMessageTemplate}
        treeColumnIndex={0}
        childMapping="sublocals"
        height="100%"
        rowHeight={16}
        allowResizing={true}
        allowReordering={true}
        showColumnMenu={true}
        allowSelection={true}
        editSettings={editSettings}
        selectionSettings={selectionOptions}
        gridLines="Both"
        cellSaved={cellSaved}
        cellEdit={cellEdit}
        rowDataBound={rowDataBound}
      >
        <ColumnsDirective>
          <ColumnDirective
            field="name"
            headerText="Name"
            width="85"
            allowEditing={false}
            clipMode="EllipsisWithTooltip"
            isPrimaryKey={true}
          ></ColumnDirective>
          <ColumnDirective
            field="value"
            headerText="Value"
            allowEditing={true}
            clipMode="EllipsisWithTooltip"
            edit={editParams}
            disableHtmlEncode={false}
            valueAccessor={valueAccessor}
          ></ColumnDirective>
          <ColumnDirective
            field="fullpath"
            headerText="Full Path"
            allowEditing={false}
            clipMode="EllipsisWithTooltip"
            visible={false}
          ></ColumnDirective>
        </ColumnsDirective>
        <Inject services={[Resize, Reorder, ColumnMenu, Edit]} />
      </TreeGridComponent>
      <ContextMenuComponent
        id={`locals-menu-${menuId}`}
        target="#locals-grid"
        items={menuCopy}
        select={() => {
          treeRef.current?.copy();
        }}
      />
    </div>
  );

  return <ToolWindowContent title={TOOL_WINDOW_TITLES.locals}>{content}</ToolWindowContent>;
}
