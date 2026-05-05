/**
 * Implements gdb memory window behavior for debugger tool-window rendering and interactions.
 *
 * @remarks
 * Exported symbols include `GdbMemoryWindow`. It coordinates live debugger data with user interactions in docked tool-window views.
 */
import { JSX, RefObject, useEffect, useRef, useState } from "react";
import { GdbAny } from "../../common/gdb-common";
import HexEditor from "../Components/HexEditor/HexEditor";
import { validateValue, ValueType } from "../utilities/valueValidation";
import { ToolWindowContent } from "./ToolWindowContent";
import { TOOL_WINDOW_TITLES } from "./toolWindowTitles";
import "./GdbMemoryWindow.css";
import "../Components/HexEditor/HexEditor.css";

interface MemoryFormProps {
  address: string;
  length: string;
}

function updateErrorVisibility(
  ref: RefObject<HTMLTableCellElement | null>,
  isValid: boolean,
): void {
  if (ref.current) {
    ref.current.style.visibility = isValid ? "hidden" : "visible";
  }
}

function MemoryForm({ address, length }: MemoryFormProps): JSX.Element {
  const startRef = useRef<HTMLInputElement>(null);
  const lengthRef = useRef<HTMLInputElement>(null);
  const startErrorRef = useRef<HTMLTableCellElement>(null);
  const lengthErrorRef = useRef<HTMLTableCellElement>(null);

  function validateMemoryParams() {
    const startInput = validateValue(startRef.current?.value);
    const lengthInput = validateValue(lengthRef.current?.value);

    updateErrorVisibility(startErrorRef, startInput.isValid);
    updateErrorVisibility(lengthErrorRef, lengthInput.isValid);

    if (!startInput.isValid || !lengthInput.isValid) {
      return;
    }

    const start =
      startInput.valueType == ValueType.DollarPrefix
        ? startRef.current?.value
        : startInput.hexValue;

    window.ipcToMain.commands.debugger.sendGdbCommand(
      `-data-read-memory-bytes ${start?.trim()} ${lengthInput.decimalValue?.toString().trim()}`,
    );
  }

  return (
    <div className="memoryControls">
      <table className="memoryControlTable">
        <thead>
          <tr>
            <td className="memoryTitle">Start:</td>
            <td className="memoryTitle">Length:</td>
            <td></td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <input
                ref={startRef}
                type="text"
                placeholder="Memory Address"
                defaultValue={address}
                maxLength={50}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    validateMemoryParams();
                  }
                }}
              />
            </td>
            <td>
              <input
                ref={lengthRef}
                type="text"
                placeholder="Length"
                defaultValue={length}
                maxLength={50}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    validateMemoryParams();
                  }
                }}
              />
            </td>
            <td>
              <input type="button" value="Refresh Data" onClick={validateMemoryParams} />
            </td>
          </tr>
          <tr>
            <td ref={startErrorRef}>
              <span className="validateError">Start is invalid hex</span>
            </td>
            <td ref={lengthErrorRef}>
              <span className="validateError">Length is invalid hex</span>
            </td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/**
 * Performs gdb memory window as part of this module's public API.
 *
 * @remarks
 * Supports debugger tool-window rendering, interaction handling, or data synchronization.
 *
 * @returns The computed result produced by this operation.
 */
export default function GdbMemoryWindow(): JSX.Element {
  // State for memory data
  const [address, setAddress] = useState<string>("");
  const [length, setLength] = useState<string>("");
  const [datasource, setDatasource] = useState<Uint8Array>(new Uint8Array(0));

  useEffect(() => {
    const unsubscribe = window.ipcToMain.debuggerData.memory((data: GdbAny) => {
      //console.log("Received memory data:", data.toString());
      setDatasource(data.data);
      setAddress(data.begin);
      const begin = parseInt(data.begin, 16);
      const end = parseInt(data.end, 16);
      setLength("0x" + (end - begin).toString(16));
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <ToolWindowContent title={TOOL_WINDOW_TITLES.memory}>
      <div>
        <MemoryForm address={address} length={length} />
        <HexEditor
          datasource={datasource}
          offset={parseInt(address, 16) || 0}
          changeCallback={(index: number, value: number) => {
            // console.log(`Data changed at index ${index} to value ${value}`);
            // console.log(`${parseInt(address, 16) || 0}:${value}`);
            const addr = parseInt(address, 16) + index;
            window.ipcToMain.commands.debugger.sendGdbCommand(
              `set {char}0x${addr.toString(16)} = 0x${value.toString(16)}`,
            );
          }}
        ></HexEditor>
      </div>
    </ToolWindowContent>
  );
}
