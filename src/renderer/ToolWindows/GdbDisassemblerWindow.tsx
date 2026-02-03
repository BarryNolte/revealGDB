import { createRef, JSX, useEffect } from "react";
import parse from "html-react-parser"; // npm install html-react-parser
import { gdbAsmRow } from "../../main/mi-interface/gdb-state-database/gdbStateDatabase";
import "./GdbDisassemblerWindow.css";
import {
  ColumnDirective,
  ColumnsDirective,
  GridComponent,
  Group,
  GroupSettingsModel,
  Inject,
  Resize,
  SelectionSettingsModel,
} from "@syncfusion/ej2-react-grids";
import { GdbAny } from "../../common/gdb-common";

function GdbDisassemblerWindow(): JSX.Element {
  const gridRef = createRef<GridComponent>();

  useEffect(() => {
    window.ipcToMain.dataDisasm((data: gdbAsmRow[]) => {
      if (gridRef.current) {
        gridRef.current.dataSource = data;
      }
    });

    if (gridRef.current) {
      gridRef.current.autoFitColumns(["address", "offset", "opcodes"], 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const instructionsTemplate = (props: gdbAsmRow): JSX.Element => {
    console.log("RAW         : " + props!.instruction);
    const instrs = props!.instruction.split("\\t");
    const classNames: string[] = ["instruction", "op1", "op2", "op3", "op4"];
    const dispInstrs: JSX.Element[] = [];
    instrs.forEach((instr, idx) => {
      const inst = instr
        .replaceAll(/<(.*?)>/gm, '<span class="disasmPointerTo">&lt;$1&gt;</span>')
        .replaceAll(/(0x[0-9A-Fa-f]{8})/gm, '<span classname="disasmImm32">$1</span>');
      console.log("INSTRUCTIONS: " + inst);
      dispInstrs.push(<td className={classNames[idx] || ""}>{parse(inst)}</td>);
    });
    return (
      <table>
        <tbody>
          <tr>{dispInstrs}</tr>
        </tbody>
      </table>
    );
  };

  function emptyMessageTemplate(): JSX.Element {
    return (
      <div className="emptyRecordTemplate">
        <span>No disassembly data available.</span>
      </div>
    );
  }

  // Custom caption template function
  const groupCaptionTemplate = (props: {
    field?: string;
    groupKey?: string;
    key?: string;
    count?: string;
  }): JSX.Element => {
    return (
      <div className="e-groupcaption">
        <strong>{props!.groupKey}:&nbsp;&nbsp;&nbsp;&nbsp;</strong>
        <span className="disasm-function-group-header">({props!.count} lines)</span>
      </div>
    );
  };

  const groupOptions: GroupSettingsModel = {
    columns: ["func"],
    showDropArea: false,
    captionTemplate: groupCaptionTemplate,
  };

  const selectionOptions: SelectionSettingsModel = {
    mode: "Row",
    type: "Single",
  };

  return (
    <div className="full-size flex-container">
      <GridComponent
        ref={gridRef}
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
        gridLines="None"
      >
        <ColumnsDirective>
          <ColumnDirective
            field="address"
            headerText="Address"
            isPrimaryKey={true}
            textAlign="Left"
            autoFit={true}
            template={(props: GdbAny) => <span className="disasmAddress">{props!.address}</span>}
          />
          <ColumnDirective field="func" headerText="Function" autoFit={true} />
          <ColumnDirective
            field="offset"
            headerText="Offset"
            autoFit={true}
            template={(props: GdbAny) => <span className="disasmOffset">{props!.offset}</span>}
          />
          <ColumnDirective field="opcodes" headerText="Opcodes" autoFit={true} />
          <ColumnDirective
            field="instruction"
            headerText="Instructions"
            autoFit={true}
            template={instructionsTemplate}
          />
        </ColumnsDirective>
        <Inject services={[Resize, Group]} />
      </GridComponent>
    </div>
  );
}

export default GdbDisassemblerWindow;
