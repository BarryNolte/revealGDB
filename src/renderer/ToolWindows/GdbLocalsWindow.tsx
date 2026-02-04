import { createRef, Component, JSX } from "react";
import { GdbAny } from "../../common/gdb-common";
import {
  ColumnDirective,
  ColumnMenu,
  ColumnsDirective,
  EditSettingsModel,
  Inject,
  Resize,
  TreeGridComponent,
  Edit,
} from "@syncfusion/ej2-react-treegrid";
import { CellEditArgs, CellSaveArgs, IEditCell } from "@syncfusion/ej2-react-grids";
import "./GdbLocalsWindow.css";

export default class GdbLocalsWindow extends Component {
  private treeRef = createRef<TreeGridComponent>();

  private editSettings: EditSettingsModel = {
    allowEditing: true,
    allowAdding: false,
    allowDeleting: false,
    showConfirmDialog: false,
    mode: "Batch",
  };

  private editParams: IEditCell = {
    params: {
      showClearButton: true,
      allowEdit: true,
    },
  };

  override componentDidMount() {
    window.ipcToMain.dataLocals((data: GdbAny) => {
      this.treeRef.current?.setProperties({
        dataSource: data as object[],
      });
    });

    this.treeRef.current?.autoFitColumns(["name", "value"]);
  }

  private emptyMessageTemplate(): JSX.Element {
    return (
      <div className="emptyRecordTemplate">
        <span>Locals is empty.</span>
      </div>
    );
  }

  private cellSaved = (args: CellSaveArgs) => {
    window.ipcToMain.sendGdbCommand(`set var ${(args.rowData as GdbAny).fullpath} = ${args.value}`);
  };

  override render(): JSX.Element {
    return (
      <div className="full-size flex-container">
        <TreeGridComponent
          ref={this.treeRef}
          emptyRecordTemplate={this.emptyMessageTemplate}
          treeColumnIndex={0}
          childMapping="sublocals"
          height="100%"
          rowHeight={16}
          allowResizing={true}
          showColumnMenu={true}
          allowSelection={true}
          editSettings={this.editSettings}
          selectionSettings={{ type: "Single", mode: "Row" }}
          gridLines="Both"
          cellSaved={this.cellSaved}
          cellEdit={(args: CellEditArgs) => {
            if (args.type === "edit") {
              if (args.columnName === "value" && (args.rowData as GdbAny).sublocals.length > 0) {
                args.cancel = true;
              }
            }
          }}
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
              edit={this.editParams}
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
      </div>
    );
  }
}
