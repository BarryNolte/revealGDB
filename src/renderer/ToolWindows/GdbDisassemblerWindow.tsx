/**
 * Implements gdb disassembler window behavior for debugger tool-window rendering and interactions.
 *
 * @remarks
 * Exported symbols include `GdbDisassemblerWindow`. It coordinates live debugger data with user interactions in docked tool-window views.
 */
import { Tooltip } from "@syncfusion/ej2-popups";
import { ButtonComponent } from "@syncfusion/ej2-react-buttons";
import { ComboBoxComponent } from "@syncfusion/ej2-react-dropdowns";
import {
  ColumnDirective,
  ColumnsDirective,
  GridComponent,
  Group,
  GroupSettingsModel,
  Inject,
  Reorder,
  Resize,
  SelectionSettingsModel,
} from "@syncfusion/ej2-react-grids";
import { ContextMenuComponent } from "@syncfusion/ej2-react-navigations";
import { JSX, RefObject, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { gdbAsmRow, gdbFunction, gdbRegisters } from "../../common/gdb-state-types";
import { doCutCopyPaste, menuCopy, menuCutCopyPaste } from "../utilities/Clipboard";
import { DISASM_FUNCTION } from "../utilities/renderer-events";
import { useGridColumnState } from "../utilities/useGridColumnState";
import { validateValue, ValueType } from "../utilities/valueValidation";
import { renderGroupCaption, renderInstructionParts } from "./GdbDisassemblerLineModel";
import "./GdbDisassemblerWindow.css";
import { ToolWindowContent } from "./ToolWindowContent";
import { TOOL_WINDOW_TITLES } from "./toolWindowTitles";
import { buildTooltipHtml } from "./useGdbSourceWindowController";

type DisasmRowTemplateData = Pick<gdbAsmRow, "address" | "offset" | "opcodes">;

const groupOptions: GroupSettingsModel = {
  columns: ["func"],
  showDropArea: false,
  showUngroupButton: false,
  showToggleButton: false,
  captionTemplate: renderGroupCaption,
};

/** Renders a placeholder message when no disassembly data is available. */
function emptyMessageTemplate(): JSX.Element {
  return (
    <div className="emptyRecordTemplate">
      <span>No disassembly data available.</span>
    </div>
  );
}

/** Renders a single function entry in the function-name combo box dropdown. */
function itemTemplate(item: gdbFunction): JSX.Element {
  return <span className="function-item">{item.function}</span>;
}

interface DisasmControlsPanelProps {
  menuIdBase: string;
  functionNameRef: RefObject<ComboBoxComponent | null>;
  addressErrorRef: RefObject<HTMLTableCellElement | null>;
  lengthErrorRef: RefObject<HTMLTableCellElement | null>;
  startRef: RefObject<HTMLInputElement | null>;
  lengthRef: RefObject<HTMLInputElement | null>;
  functionList: gdbFunction[];
  disasmFunction: () => void;
  validateDisasmParams: () => void;
}

type DisasmControlsTableProps = Omit<DisasmControlsPanelProps, "menuIdBase">;

/** Renders the input table for selecting a function name or address range to disassemble. */
function DisasmControlsTable({
  functionNameRef,
  addressErrorRef,
  lengthErrorRef,
  startRef,
  lengthRef,
  functionList,
  disasmFunction,
  validateDisasmParams,
}: DisasmControlsTableProps): JSX.Element {
  return (
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
            <ButtonComponent
              type="button"
              onClick={() => {
                if (functionNameRef?.current) {
                  disasmFunction();
                }
              }}
            >
              Disassemble Function
            </ButtonComponent>
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
            <ButtonComponent type="button" onClick={validateDisasmParams}>
              Disassemble Address
            </ButtonComponent>
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
  );
}

/** Renders the controls panel containing the disassembly input table and its context menus. */
function DisasmControlsPanel({
  menuIdBase,
  functionNameRef,
  addressErrorRef,
  lengthErrorRef,
  startRef,
  lengthRef,
  functionList,
  disasmFunction,
  validateDisasmParams,
}: DisasmControlsPanelProps): JSX.Element {
  return (
    <div className="disasmControls disasm-flex-item">
      <DisasmControlsTable
        functionNameRef={functionNameRef}
        addressErrorRef={addressErrorRef}
        lengthErrorRef={lengthErrorRef}
        startRef={startRef}
        lengthRef={lengthRef}
        functionList={functionList}
        disasmFunction={disasmFunction}
        validateDisasmParams={validateDisasmParams}
      />
      <ContextMenuComponent
        id={`disasm-func-menu-${menuIdBase}`}
        target="#function-names"
        items={menuCutCopyPaste}
        select={(e) =>
          doCutCopyPaste(e.item.text, document.getElementById("function-names") as HTMLInputElement)
        }
      />
      <ContextMenuComponent
        id={`disasm-start-menu-${menuIdBase}`}
        target={`#asm-start`}
        items={menuCutCopyPaste}
        select={(e) => {
          if (startRef.current) {
            doCutCopyPaste(e.item.text, startRef.current);
          }
        }}
      />
      <ContextMenuComponent
        id={`disasm-length-menu-${menuIdBase}`}
        target={`#asm-length`}
        items={menuCutCopyPaste}
        select={(e) => {
          if (lengthRef.current) {
            doCutCopyPaste(e.item.text, lengthRef.current);
          }
        }}
      />
    </div>
  );
}

interface DisasmGridPanelProps {
  menuIdBase: string;
  gridRef: RefObject<GridComponent | null>;
  disasmData: gdbAsmRow[];
  selectionOptions: SelectionSettingsModel;
  instructionsTemplate: (props: gdbAsmRow) => JSX.Element;
  doCopy: () => void;
}

/** Renders the disassembly grid and its context menu. */
function DisasmGridPanel({
  menuIdBase,
  gridRef,
  disasmData,
  selectionOptions,
  instructionsTemplate,
  doCopy,
}: DisasmGridPanelProps): JSX.Element {
  return (
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
        allowReordering={true}
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
            clipMode="EllipsisWithTooltip"
            template={(props: DisasmRowTemplateData) => (
              <span className="disasmAddress">{props?.address}</span>
            )}
          />
          <ColumnDirective field="func" headerText="Function" />
          <ColumnDirective
            field="offset"
            headerText="Offset"
            clipMode="EllipsisWithTooltip"
            template={(props: DisasmRowTemplateData) => (
              <span className="disasmOffset">{props?.offset}</span>
            )}
          />
          <ColumnDirective
            field="opcodes"
            headerText="Opcodes"
            template={(props: DisasmRowTemplateData) => (
              <span className="disasmOpcodes">{props?.opcodes}</span>
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
        <Inject services={[Resize, Reorder, Group]} />
      </GridComponent>
      <ContextMenuComponent
        id={`disasm-grid-menu-${menuIdBase}`}
        target="#disassembly-grid"
        items={menuCopy}
        select={doCopy}
      />
    </div>
  );
}

/** Sends a GDB disassemble command for the function currently selected in the combo box. */
function doDisasmFunction(functionNameRef: RefObject<ComboBoxComponent | null>) {
  const func = functionNameRef?.current?.value || "";
  if (func) {
    window.ipcToMain.commands.debugger.sendGdbCommand(
      `-data-disassemble -a ${func} --opcodes bytes`,
    );
  }
}

/**
 * Validates the address and length inputs and, if both are valid, sends a GDB
 * disassemble-by-address-range command.
 */
function doValidateDisasmParams(
  startRef: RefObject<HTMLInputElement | null>,
  lengthRef: RefObject<HTMLInputElement | null>,
  addressErrorRef: RefObject<HTMLTableCellElement | null>,
  lengthErrorRef: RefObject<HTMLTableCellElement | null>,
) {
  const startInput = validateValue(startRef.current?.value);
  const lengthInput = validateValue(lengthRef.current?.value);

  if (addressErrorRef.current) {
    addressErrorRef.current.style.visibility = startInput.isValid ? "hidden" : "visible";
  }

  if (lengthErrorRef.current) {
    lengthErrorRef.current.style.visibility = lengthInput.isValid ? "hidden" : "visible";
  }

  if (!startInput.isValid || !lengthInput.isValid) {
    return;
  }

  const start =
    startInput.valueType == ValueType.DollarPrefix ? startRef.current?.value : startInput.hexValue;
  const end = startInput.decimalValue! + lengthInput.decimalValue!;

  window.ipcToMain.commands.debugger.sendGdbCommand(
    `-data-disassemble -s ${start?.trim()} -e 0x${end.toString(16)} --opcodes bytes`,
  );
}

/** Hook that manages the register-name set, hover tooltip, and related callbacks. */
function useRegisterTooltip() {
  const registerNamesRef = useRef<Set<string>>(new Set());
  const tooltipAnchorRef = useRef<HTMLDivElement | null>(null);
  const sfTipRef = useRef<Tooltip | null>(null);

  useEffect(() => {
    const anchor = document.createElement("div");
    anchor.style.cssText = "position:fixed;width:1px;height:1px;pointer-events:none;";
    document.body.appendChild(anchor);
    tooltipAnchorRef.current = anchor;
    sfTipRef.current = new Tooltip(
      {
        opensOn: "Custom",
        cssClass: "reveal-tip",
        content: "",
        enableHtmlSanitizer: true,
        enableHtmlParse: true,
        position: "RightBottom",
        offsetX: 10,
        offsetY: 10,
        animation: {
          open: { effect: "FadeIn", duration: 100, delay: 0 },
          close: { effect: "FadeOut", duration: 100, delay: 0 },
        },
      },
      anchor,
    );
    return () => {
      sfTipRef.current?.destroy();
      anchor.remove();
      sfTipRef.current = null;
      tooltipAnchorRef.current = null;
    };
  }, []);

  useEffect(
    () =>
      window.ipcToMain.debuggerData.registers((data: Map<string, gdbRegisters>) => {
        registerNamesRef.current = new Set(Array.from(data.values()).map((r) => r.name));
      }),
    [],
  );

  const onRegisterHover = useCallback((regName: string, clientX: number, clientY: number): void => {
    void window.ipcToMain.queries.debugger.evaluateExpression(`$${regName}`).then((value) => {
      if (value === undefined) return;
      const anchor = tooltipAnchorRef.current;
      const sfTip = sfTipRef.current;
      if (!anchor || !sfTip) return;
      anchor.style.left = `${clientX}px`;
      anchor.style.top = `${clientY}px`;
      const dispValue = "0x" + (Number.parseInt(value, 10) >>> 0).toString(16);
      sfTip.content = buildTooltipHtml(regName, dispValue, "register");
      sfTip.open(anchor);
    });
  }, []);

  const onRegisterLeave = useCallback((): void => {
    sfTipRef.current?.close();
  }, []);

  return { registerNamesRef, onRegisterHover, onRegisterLeave };
}

/** Hook that wires up IPC subscriptions and the DISASM_FUNCTION window event. */
function useDisasmIpcSubscriptions(
  setDisasmData: (data: gdbAsmRow[]) => void,
  setFunctionList: (data: gdbFunction[]) => void,
  addressErrorRef: RefObject<HTMLTableCellElement | null>,
  lengthErrorRef: RefObject<HTMLTableCellElement | null>,
  functionNameRef: RefObject<ComboBoxComponent | null>,
): void {
  useEffect(() => {
    const unsubDisasm = window.ipcToMain.debuggerData.disassembly((data: gdbAsmRow[]) => {
      setDisasmData(data);
    });
    const unsubFunctions = window.ipcToMain.debuggerData.functions((data: gdbFunction[]) => {
      setFunctionList(data);
    });
    if (addressErrorRef.current && lengthErrorRef.current) {
      addressErrorRef.current.style.visibility = "hidden";
      lengthErrorRef.current.style.visibility = "hidden";
    }
    /**
     * Performs handleDisasmFunction as part of this module's internal workflow.
     *
     * @param e - e parameter.
     * @returns The computed result produced by this operation.
     */
    const handleDisasmFunction = (e: Event) => {
      const func = (e as CustomEvent<string>).detail;
      if (func && functionNameRef.current) {
        functionNameRef.current.value = func;
      }
      if (func) {
        window.ipcToMain.commands.debugger.sendGdbCommand(
          `-data-disassemble -a ${func} --opcodes bytes`,
        );
      }
    };
    window.addEventListener(DISASM_FUNCTION, handleDisasmFunction);
    return () => {
      unsubDisasm();
      unsubFunctions();
      window.removeEventListener(DISASM_FUNCTION, handleDisasmFunction);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Custom hook that owns all refs, state, and callbacks for the disassembler window. */
function useDisassemblerState() {
  const menuIdBase = useId();
  const gridRef = useRef<GridComponent>(null);
  const functionNameRef = useRef<ComboBoxComponent>(null);
  const addressErrorRef = useRef<HTMLTableCellElement>(null);
  const lengthErrorRef = useRef<HTMLTableCellElement>(null);
  const startRef = useRef<HTMLInputElement>(null);
  const lengthRef = useRef<HTMLInputElement>(null);
  const { registerNamesRef, onRegisterHover, onRegisterLeave } = useRegisterTooltip();

  const [functionList, setFunctionList] = useState<gdbFunction[]>([]);
  const [disasmData, setDisasmData] = useState<gdbAsmRow[]>([]);
  useGridColumnState("disassembly", gridRef);

  const selectionOptions: SelectionSettingsModel = useMemo(
    () => ({ mode: "Both", type: "Multiple" }),
    [],
  );

  useDisasmIpcSubscriptions(
    setDisasmData,
    setFunctionList,
    addressErrorRef,
    lengthErrorRef,
    functionNameRef,
  );

  const instructionsTemplate = useCallback(
    (props: gdbAsmRow): JSX.Element =>
      renderInstructionParts(
        props.instructions,
        (functionAddress: string) => {
          window.ipcToMain.commands.debugger.sendGdbCommand(
            `-data-disassemble -a ${functionAddress} --opcodes bytes`,
          );
          if (functionNameRef.current) {
            functionNameRef.current.value = functionAddress;
          }
        },
        registerNamesRef.current,
        onRegisterHover,
        onRegisterLeave,
      ),
    [onRegisterHover, onRegisterLeave, registerNamesRef],
  );
  const doCopy = (): void => {
    gridRef.current?.copy();
  };
  /**
   * Performs disasmFunction as part of this module's internal workflow.
   *
   * @returns The computed result produced by this operation.
   */
  const disasmFunction = () => doDisasmFunction(functionNameRef);
  /**
   * Performs validateDisasmParams as part of this module's internal workflow.
   *
   * @returns The computed result produced by this operation.
   */
  const validateDisasmParams = () =>
    doValidateDisasmParams(startRef, lengthRef, addressErrorRef, lengthErrorRef);

  return {
    menuIdBase,
    gridRef,
    functionNameRef,
    addressErrorRef,
    lengthErrorRef,
    startRef,
    lengthRef,
    functionList,
    disasmData,
    selectionOptions,
    instructionsTemplate,
    doCopy,
    disasmFunction,
    validateDisasmParams,
  };
}

/**
 * Performs gdb disassembler window as part of this module's public API.
 *
 * @remarks
 * Supports debugger tool-window rendering, interaction handling, or data synchronization.
 *
 * @returns The computed result produced by this operation.
 */
export default function GdbDisassemblerWindow(): JSX.Element {
  const {
    menuIdBase,
    gridRef,
    functionNameRef,
    addressErrorRef,
    lengthErrorRef,
    startRef,
    lengthRef,
    functionList,
    disasmData,
    selectionOptions,
    instructionsTemplate,
    doCopy,
    disasmFunction,
    validateDisasmParams,
  } = useDisassemblerState();

  return (
    <ToolWindowContent title={TOOL_WINDOW_TITLES.disassembly}>
      <div className="disasm-flex-container">
        <DisasmControlsPanel
          menuIdBase={menuIdBase}
          functionNameRef={functionNameRef}
          addressErrorRef={addressErrorRef}
          lengthErrorRef={lengthErrorRef}
          startRef={startRef}
          lengthRef={lengthRef}
          functionList={functionList}
          disasmFunction={disasmFunction}
          validateDisasmParams={validateDisasmParams}
        />
        <DisasmGridPanel
          menuIdBase={menuIdBase}
          gridRef={gridRef}
          disasmData={disasmData}
          selectionOptions={selectionOptions}
          instructionsTemplate={instructionsTemplate}
          doCopy={doCopy}
        />
      </div>
    </ToolWindowContent>
  );
}
