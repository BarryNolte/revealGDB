import { ComboBoxComponent } from "@syncfusion/ej2-react-dropdowns";
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
import { ContextMenuComponent } from "@syncfusion/ej2-react-navigations";
import React, { JSX, useEffect, useMemo, useRef, useState } from "react";
import { GdbAny } from "../../common/gdb-common";
import {
  DisasmToken,
  gdbAsmRow,
  gdbFunction,
} from "../../main/mi-interface/gdb-state-database/gdbStateDatabase";
import { doCutCopyPaste, menuCopy, menuCutCopyPaste } from "../utilities/Clipboard";
import "./GdbDisassemblerWindow.css";
import { validateValue, ValueType } from "../utilities/valueValidation";

export default function GdbDisassemblerWindow(): JSX.Element {
  const gridRef = useRef<GridComponent>(null);
  const functionNameRef = useRef<ComboBoxComponent>(null);
  //const pendingDataRef = useRef<gdbAsmRow[] | null>(null);
  const addressErrorRef = useRef<HTMLTableCellElement>(null);
  const lengthErrorRef = useRef<HTMLTableCellElement>(null);
  const startRef = useRef<HTMLInputElement>(null);
  const lengthRef = useRef<HTMLInputElement>(null);
  const [functionList, setFunctionList] = useState<gdbFunction[]>([]);
  const [disasmData, setDisasmData] = useState<gdbAsmRow[]>([]);

  const selectionOptions: SelectionSettingsModel = useMemo(
    () => ({
      mode: "Both",
      type: "Multiple",
    }),
    [],
  );

  useEffect(() => {
    window.ipcToMain.dataDisasm((data: gdbAsmRow[]) => {
      setDisasmData(data);
    });

    window.ipcToMain.dataFunctions((data: gdbFunction[]) => {
      setFunctionList(data);
    });

    if (addressErrorRef.current && lengthErrorRef.current) {
      addressErrorRef.current.style.visibility = "hidden";
      lengthErrorRef.current.style.visibility = "hidden";
    }
  }, []);

  // const onGridCreated = (): void => {
  //   if (gridRef.current) {
  //     gridRef.current.autoFitColumns(["address", "offset", "opcodes", "instruction"], 0);
  //     if (pendingDataRef.current) {
  //       setDisasmData(pendingDataRef.current);
  //       pendingDataRef.current = null;
  //     }
  //   }
  // };

  const instructionsTemplate = (props: gdbAsmRow): JSX.Element => {
    console.log("Rendering instruction template for:", props);
    const instParts: JSX.Element[] = [];

    props.instructions.forEach((token: DisasmToken) => {
      switch (token.type) {
        case "instruction":
          instParts.push(<span className="disasmInstruction">{token.value}</span>);
          break;
        case "address":
          instParts.push(<span className="disasmOpAddress">{token.value}&nbsp;</span>);
          break;
        case "function":
          instParts.push(
            <span
              className="disasmFunction"
              onClick={(e: React.MouseEvent<HTMLSpanElement>) => {
                const value = e.currentTarget.textContent?.trim().slice(1, -1) || "";
                window.ipcToMain.sendGdbCommand(`-data-disassemble -a ${value} --opcodes bytes`);
                if (functionNameRef.current) {
                  functionNameRef.current.value = value;
                }
              }}
            >
              {token.value}&nbsp;
            </span>,
          );
          break;
        case "leftparen":
        case "rightparen":
          instParts.push(<span className="disasmParen">{token.value}&nbsp;</span>);
          break;
        case "text":
        default:
          instParts.push(<span className="disasmText">{token.value}&nbsp;</span>);
          break;
      }
    });
    return <div>{instParts}</div>;
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
    const functionName = props.groupKey?.replace(/.*-/, "") || "Unknown Function";
    return (
      <div className="e-groupcaption disasm-function-group-header">
        <strong>{functionName}:&nbsp;&nbsp;&nbsp;&nbsp;</strong>
        <span>({props!.count} lines)</span>
      </div>
    );
  };

  const groupOptions: GroupSettingsModel = {
    columns: ["func"],
    showDropArea: false,
    showUngroupButton: false,
    showToggleButton: false,
    captionTemplate: groupCaptionTemplate,
  };

  const itemTemplate = (item: gdbFunction): JSX.Element => {
    return <span className="function-item">{item.function}</span>;
  };

  const doCopy = (): void => {
    gridRef.current?.copy();
  };

  function disasmFunction() {
    const func = functionNameRef?.current?.value || "";
    if (func) {
      const command = `-data-disassemble -a ${func} --opcodes bytes`;
      window.ipcToMain.sendGdbCommand(command);
    }
  }

  function validateDisasmParams() {
    const startInput = validateValue(startRef.current?.value);
    const lengthInput = validateValue(lengthRef.current?.value);

    if (startInput.isValid) {
      if (addressErrorRef.current) {
        addressErrorRef.current.style.visibility = "hidden";
      }
    } else {
      if (addressErrorRef.current) {
        addressErrorRef.current.style.visibility = "visible";
      }
    }

    if (lengthInput.isValid) {
      if (lengthErrorRef.current) {
        lengthErrorRef.current.style.visibility = "hidden";
      }
    } else {
      if (lengthErrorRef.current) {
        lengthErrorRef.current.style.visibility = "visible";
      }
    }

    if (!startInput.isValid || !lengthInput.isValid) {
      return;
    }

    const start =
      startInput.valueType == ValueType.DollarPrefix
        ? startRef.current?.value
        : startInput.hexValue;
    const end = startInput.decimalValue! + lengthInput.decimalValue!;

    window.ipcToMain.sendGdbCommand(
      `-data-disassemble -s ${start?.trim()} -e ${end.toString(16)} --opcodes bytes`,
    );
  }

  return (
    <div className="disasm-flex-container">
      <div className="disasmControls disasm-flex-item">
        <table className="disasmControlTable">
          <tbody>
            <tr>
              <td className="disasmTitle">Function Name:</td>
              <td colSpan={3}>
                <ComboBoxComponent
                  ref={functionNameRef}
                  id="function-names"
                  autofill={true}
                  dataSource={functionList}
                  allowFiltering={true}
                  popupHeight={400}
                  fields={{ value: "function" }}
                  itemTemplate={itemTemplate}
                  onChange={disasmFunction}
                ></ComboBoxComponent>
              </td>
              <td>
                <button
                  type="button"
                  onClick={() => {
                    if (functionNameRef?.current) {
                      disasmFunction();
                    }
                  }}
                >
                  Disassemble Function
                </button>
              </td>
            </tr>
            <tr>
              <td className="disasmTitle">Address:</td>
              <td>
                <input id="asm-start" ref={startRef} type="text" placeholder="Address" />
              </td>
              <td className="disasmTitle"> --&gt; </td>
              <td>
                <input id="asm-length" ref={lengthRef} type="text" placeholder="Length" />
              </td>
              <td>
                <button type="button" onClick={validateDisasmParams}>
                  Disassemble Address
                </button>
              </td>
            </tr>
            <tr>
              <td></td>
              <td ref={addressErrorRef}>
                <span className="validateError">Address is invalide hex</span>
              </td>
              <td></td>
              <td ref={lengthErrorRef}>
                <span className="validateError">Length is invalid hex</span>
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="full-size disasm-flex-item">
        <GridComponent
          ref={gridRef}
          id={"disassembly-grid"}
          dataSource={disasmData}
          emptyRecordTemplate={emptyMessageTemplate}
          height="100%"
          width="100%"
          rowHeight={16}
          className="full-size"
          allowResizing={true}
          allowPaging={false}
          allowGrouping={true}
          showColumnMenu={true}
          allowFiltering={false}
          groupSettings={groupOptions}
          selectionSettings={selectionOptions}
          gridLines="Vertical"
          //created={onGridCreated}
        >
          <ColumnsDirective>
            <ColumnDirective
              field="address"
              headerText="Address"
              isPrimaryKey={true}
              enableGroupByFormat={true}
              textAlign="Left"
              autoFit={true}
              clipMode="EllipsisWithTooltip"
              template={(props: GdbAny) => <span className="disasmAddress">{props!.address}</span>}
            />
            <ColumnDirective field="func" headerText="Function" autoFit={true} />
            <ColumnDirective
              field="offset"
              headerText="Offset"
              autoFit={true}
              clipMode="EllipsisWithTooltip"
              template={(props: GdbAny) => <span className="disasmOffset">{props!.offset}</span>}
            />
            <ColumnDirective
              field="opcodes"
              headerText="Opcodes"
              autoFit={true}
              template={(props: GdbAny) => <span className="disasmOpcodes">{props!.opcodes}</span>}
            />
            <ColumnDirective
              field="instruction"
              headerText="Instructions"
              width={500}
              clipMode="EllipsisWithTooltip"
              template={instructionsTemplate}
            />
            <ColumnDirective
              field="func"
              headerText="Function"
              visible={false}
              allowSorting={false}
            />
          </ColumnsDirective>
          <Inject services={[Resize, Group]} />
        </GridComponent>
        <ContextMenuComponent target="#disassembly-grid" items={menuCopy} select={doCopy} />
        <ContextMenuComponent
          target="#function-names"
          items={menuCutCopyPaste}
          select={(e) =>
            doCutCopyPaste(
              e.item.text,
              document.getElementById("function-names") as HTMLInputElement,
            )
          }
        />
      </div>
      <ContextMenuComponent
        target={`#asm-start`}
        items={menuCutCopyPaste}
        select={(e) => doCutCopyPaste(e.item.text, startRef.current!)}
      />
      <ContextMenuComponent
        target={`#asm-length`}
        items={menuCutCopyPaste}
        select={(e) => doCutCopyPaste(e.item.text, lengthRef.current!)}
      />
    </div>
  );
}
