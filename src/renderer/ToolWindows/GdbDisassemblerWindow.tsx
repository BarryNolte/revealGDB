/**
 * GDB Disassembler window component.
 *
 * Displays disassembled machine code with:
 * - Memory addresses and instruction offsets
 * - Hex opcodes
 * - Disassembled assembly instructions with syntax highlighting
 * - Function boundaries and names
 * - Current PC (program counter) indicator
 *
 * Features:
 * - Function selector dropdown for quick navigation
 * - Address range input for custom disassembly
 * - Grouped by function
 * - Color-coded instruction tokens (mnemonics, registers, addresses)
 * - Context menu for copy operations
 */

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
import { JSX, useEffect, useId, useMemo, useRef, useState } from "react";
import { GdbAny } from "../../common/gdb-common";
import {
  gdbAsmRow,
  gdbFunction,
} from "../../main/mi-interface/gdb-state-database/gdbStateDatabase";
import { doCutCopyPaste, menuCopy, menuCutCopyPaste } from "../utilities/Clipboard";
import { validateValue, ValueType } from "../utilities/valueValidation";
import { renderGroupCaption, renderInstructionParts } from "./GdbDisassemblerLineModel";
import "./GdbDisassemblerWindow.css";
import { ToolWindowContent } from "./ToolWindowContent";
import { TOOL_WINDOW_TITLES } from "./toolWindowTitles";

/**
 * Disassembler window component.
 * Provides address/function selection controls and disassembly grid.
 */
export default function GdbDisassemblerWindow(): JSX.Element {
  // Refs for grid and form controls
  const menuIdBase = useId();
  const gridRef = useRef<GridComponent>(null);
  const functionNameRef = useRef<ComboBoxComponent>(null);
  const addressErrorRef = useRef<HTMLTableCellElement>(null);
  const lengthErrorRef = useRef<HTMLTableCellElement>(null);
  const startRef = useRef<HTMLInputElement>(null);
  const lengthRef = useRef<HTMLInputElement>(null);

  // State for disassembly data and function list
  const [functionList, setFunctionList] = useState<gdbFunction[]>([]);
  const [disasmData, setDisasmData] = useState<gdbAsmRow[]>([]);

  /** Grid selection settings: allow multiple row/cell selection */
  const selectionOptions: SelectionSettingsModel = useMemo(
    () => ({
      mode: "Both",
      type: "Multiple",
    }),
    [],
  );

  /**
   * Subscribe to disassembly and function list updates on mount.
   * Also initializes error message visibility.
   */
  useEffect(() => {
    window.ipcToMain.debuggerData.disassembly((data: gdbAsmRow[]) => {
      setDisasmData(data);
    });

    window.ipcToMain.debuggerData.functions((data: gdbFunction[]) => {
      setFunctionList(data);
    });

    if (addressErrorRef.current && lengthErrorRef.current) {
      addressErrorRef.current.style.visibility = "hidden";
      lengthErrorRef.current.style.visibility = "hidden";
    }
  }, []);

  /**
   * Template function for rendering disassembled instructions.
   * Applies syntax highlighting based on token type (instruction, address, register, etc.).
   */
  const instructionsTemplate = (props: gdbAsmRow): JSX.Element => {
    return renderInstructionParts(props.instructions, (functionAddress: string) => {
      window.ipcToMain.commands.debugger.sendGdbCommand(
        `-data-disassemble -a ${functionAddress} --opcodes bytes`,
      );
      if (functionNameRef.current) {
        functionNameRef.current.value = functionAddress;
      }
    });
  };

  function emptyMessageTemplate(): JSX.Element {
    return (
      <div className="emptyRecordTemplate">
        <span>No disassembly data available.</span>
      </div>
    );
  }

  // Custom caption template function
  const groupOptions: GroupSettingsModel = {
    columns: ["func"],
    showDropArea: false,
    showUngroupButton: false,
    showToggleButton: false,
    captionTemplate: renderGroupCaption,
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
      window.ipcToMain.commands.debugger.sendGdbCommand(command);
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

    window.ipcToMain.commands.debugger.sendGdbCommand(
      `-data-disassemble -s ${start?.trim()} -e ${end.toString(16)} --opcodes bytes`,
    );
  }

  return (
    <ToolWindowContent title={TOOL_WINDOW_TITLES.disassembly}>
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
                    //TODO: Change this so it doesn't try to disassemble on every change (only on selection)
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
                template={(props: GdbAny) => (
                  <span className="disasmAddress">{props!.address}</span>
                )}
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
                template={(props: GdbAny) => (
                  <span className="disasmOpcodes">{props!.opcodes}</span>
                )}
              />
              <ColumnDirective
                field="instruction"
                headerText="Instructions"
                width={500}
                clipMode="EllipsisWithTooltip"
                template={instructionsTemplate}
              />
            </ColumnsDirective>
            <Inject services={[Resize, Group]} />
          </GridComponent>
          <ContextMenuComponent
            id={`disasm-grid-menu-${menuIdBase}`}
            target="#disassembly-grid"
            items={menuCopy}
            select={doCopy}
          />
          <ContextMenuComponent
            id={`disasm-func-menu-${menuIdBase}`}
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
          id={`disasm-start-menu-${menuIdBase}`}
          target={`#asm-start`}
          items={menuCutCopyPaste}
          select={(e) => doCutCopyPaste(e.item.text, startRef.current!)}
        />
        <ContextMenuComponent
          id={`disasm-length-menu-${menuIdBase}`}
          target={`#asm-length`}
          items={menuCutCopyPaste}
          select={(e) => doCutCopyPaste(e.item.text, lengthRef.current!)}
        />
      </div>
    </ToolWindowContent>
  );
}
