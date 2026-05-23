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
import { GdbAny } from "../../common/gdb-common";
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

function rowDataBound(args: RowDataBoundEventArgs): void {
  const value = (args.data as GdbAny).value as string | null | undefined;
  if (!value) return;
  const lineCount = value.split("\\n").length;
  (args.row as HTMLElement).style.height = `${lineCount * 16}px`;
}

function valueAccessor(_field: string, data: GdbAny): string {
  const value = data.value as string | null | undefined;
  return `<div class="treeGrid-multiline-cell">${escapeHtml(value ?? "").replaceAll("\\n", "<br>")}</div>`;
}

type LocalsGridProps = {
  treeRef: RefObject<TreeGridComponent | null>;
  localData: GdbAny[];
  emptyMessageTemplate: () => JSX.Element;
  cellSaved: (args: CellSaveArgs) => void;
  cellEdit: (args: CellEditArgs) => void;
  menuId: string;
};

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
  const [localData, setLocalData] = useState<GdbAny[]>([]);
  useGridColumnState("locals", treeRef);

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
    if (
      args.type === "edit" &&
      args.columnName === "value" &&
      (args.rowData as GdbAny).sublocals.length > 0
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
