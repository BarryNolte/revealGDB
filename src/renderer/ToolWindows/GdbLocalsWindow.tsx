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
import { JSX, RefObject, useCallback, useEffect, useId, useRef, useState } from "react";
import type { ILocal } from "../../common/local-view";
import { menuCopy } from "../utilities/Clipboard";
import { useGridColumnState } from "../utilities/useGridColumnState";
import { escapeHtml } from "./gdb-value-formatter";
import "./GdbLocalsWindow.css";
import { ToolWindowContent } from "./ToolWindowContent";
import { TOOL_WINDOW_TITLES } from "./toolWindowTitles";

// TreeGrid wraps an internal Grid instance, so inject matching Grid modules too.
Grid.Inject(GridResize, GridReorder, GridColumnMenu, GridEdit);

/** Edit settings: enable cell editing in batch mode */
const EDIT_SETTINGS: EditSettingsModel = {
  allowEditing: true,
  allowAdding: false,
  allowDeleting: false,
  showConfirmDialog: false,
  mode: "Batch",
};

const EDIT_PARAMS: IEditCell = {
  params: {
    showClearButton: true,
    allowEdit: true,
  },
};

const SELECTION_OPTIONS: SelectionSettingsModel = {
  mode: "Both",
  type: "Multiple",
};
/**
 * Performs rowDataBound as part of this module's internal workflow.
 *
 * @param args - args parameter.
 * @returns The computed result produced by this operation.
 */

function rowDataBound(args: RowDataBoundEventArgs): void {
  const value = (args.data as ILocal).value as string | null | undefined;
  if (!value) return;
  const lineCount = value.split("\\n").length;
  (args.row as HTMLElement).style.height = `${lineCount * 16}px`;
}
/**
 * Performs valueAccessor as part of this module's internal workflow.
 *
 * @param _field - _field parameter.
 * @param data - data parameter.
 * @returns The computed result produced by this operation.
 */

function valueAccessor(_field: string, data: object): string {
  const local = data as ILocal;
  const value = local.value as string | null | undefined;
  return `<div class="treeGrid-multiline-cell">${escapeHtml(value ?? "").replaceAll("\\n", "<br>")}</div>`;
}

type LocalsGridProps = {
  treeRef: RefObject<TreeGridComponent | null>;
  localData: ILocal[];
  emptyMessageTemplate: () => JSX.Element;
  cellSaved: (args: CellSaveArgs) => void;
  cellEdit: (args: CellEditArgs) => void;
  menuId: string;
};
/**
 * Performs LocalsGrid as part of this module's internal workflow.
 *
 * @param {
  treeRef - {
  treeRef parameter.
 * @param localData - localData parameter.
 * @param emptyMessageTemplate - emptyMessageTemplate parameter.
 * @param cellSaved - cellSaved parameter.
 * @param cellEdit - cellEdit parameter.
 * @param menuId - menuId parameter.
 * @param } - } parameter.
 * @returns The computed result produced by this operation.
 */

function LocalsGrid({
  treeRef,
  localData,
  emptyMessageTemplate,
  cellSaved,
  cellEdit,
  menuId,
}: LocalsGridProps): JSX.Element {
  return (
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
        editSettings={EDIT_SETTINGS}
        selectionSettings={SELECTION_OPTIONS}
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
            edit={EDIT_PARAMS}
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
}

export default function GdbLocalsWindow(): JSX.Element {
  const menuId = useId();
  const treeRef = useRef<TreeGridComponent | null>(null);
  const [localData, setLocalData] = useState<ILocal[]>([]);
  useGridColumnState("locals", treeRef);

  useEffect(() => {
    const unsubscribe = window.ipcToMain.debuggerData.locals((data: ILocal[] | undefined) => {
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
      `set var ${(args.rowData as ILocal).fullpath} = ${args.value}`,
    );
  }, []);

  const cellEdit = useCallback((args: CellEditArgs) => {
    if (
      args.type === "edit" &&
      args.columnName === "value" &&
      (args.rowData as ILocal).sublocals.length > 0
    ) {
      args.cancel = true;
    }
  }, []);

  return (
    <ToolWindowContent title={TOOL_WINDOW_TITLES.locals}>
      <LocalsGrid
        treeRef={treeRef}
        localData={localData}
        emptyMessageTemplate={emptyMessageTemplate}
        cellSaved={cellSaved}
        cellEdit={cellEdit}
        menuId={menuId}
      />
    </ToolWindowContent>
  );
}
