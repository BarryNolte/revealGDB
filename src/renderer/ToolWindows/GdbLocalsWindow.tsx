import {
  Grid,
  ColumnMenu as GridColumnMenu,
  Edit as GridEdit,
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
  Resize,
  TreeGridComponent,
} from "@syncfusion/ej2-react-treegrid";
import { JSX, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { GdbAny } from "../../common/gdb-common";
import { menuCopy } from "../utilities/Clipboard";
import "./GdbLocalsWindow.css";
import { ToolWindowContent } from "./ToolWindowContent";
import { TOOL_WINDOW_TITLES } from "./toolWindowTitles";

// TreeGrid wraps an internal Grid instance, so inject matching Grid modules too.
Grid.Inject(GridResize, GridColumnMenu, GridEdit);

/**
 * Locals window component.
 * Renders a Syncfusion tree grid with hierarchical local variable data from GDB.
 */
export default function GdbLocalsWindow(): JSX.Element {
  const menuId = useId();
  const treeRef = useRef<TreeGridComponent | null>(null);
  const [localData, setLocalData] = useState<GdbAny[]>([]);

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

      treeRef.current?.autoFitColumns(["name", "value"]);
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

  const rowDataBound = (args: RowDataBoundEventArgs) => {
    console.log(args);
    const arrRow = (args.data as GdbAny).value.split("\\n").length || 0;
    (args.row as HTMLElement).style.height = `${arrRow * 16}px`;
  };

  const valueAccessor = (field: string, data: GdbAny): string => {
    //const value = data[field];
    console.log("Value accessor called with field:", field, "data:", data);
    return `<div class="treeGrid-multiline-cell">${data.value.replaceAll("\\n", "<br>") || ""}</div>`;
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
        <Inject services={[Resize, ColumnMenu, Edit]} />
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
