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
import { ToolWindowErrorBoundary } from "../Errors/ToolWindowErrorBoundary";
import { menuCopy } from "../utilities/Clipboard";
import "./GdbLocalsWindow.css";

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
    const unsubscribe = window.ipcToMain.dataLocals((data: GdbAny) => {
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
    window.ipcToMain.sendGdbCommand(`set var ${(args.rowData as GdbAny).fullpath} = ${args.value}`);
  }, []);

  const cellEdit = useCallback((args: CellEditArgs) => {
    if (args.type === "edit") {
      if (args.columnName === "value" && (args.rowData as GdbAny).sublocals.length > 0) {
        args.cancel = true;
      }
    }
  }, []);

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

  return <ToolWindowErrorBoundary title="Locals">{content}</ToolWindowErrorBoundary>;
}
