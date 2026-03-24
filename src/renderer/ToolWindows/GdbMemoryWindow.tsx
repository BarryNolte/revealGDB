/**
 * GDB Memory window component.
 *
 * Provides a hex editor interface for viewing and editing process memory:
 * - Enter start address (hex, decimal, or register like $pc)
 * - Specify length to read
 * - View memory in hex, offset, and ASCII/text columns
 * - Edit memory values directly
 *
 * Features:
 * - Flexible address format support (0x1234, 1234, $sp)
 * - Input validation for addresses and lengths
 * - Integrated HexEditor component with synchronized views
 * - Memory modification via GDB commands
 */

import { createRef, JSX, useEffect, useState } from "react";
import { GdbAny } from "../../common/gdb-common";
import HexEditor from "../Components/HexEditor/HexEditor";
import "../Components/HexEditor/HexEditor.css";
import { validateValue, ValueType } from "../utilities/valueValidation";
import "./GdbMemoryWindow.css";
import { ToolWindowContent } from "./ToolWindowContent";
import { TOOL_WINDOW_TITLES } from "./toolWindowTitles";

/**
 * Memory window component.
 * Provides address input controls and hex editor for memory inspection.
 */
export default function GdbMemoryWindow(): JSX.Element {
  // Refs for form controls
  const startRef = createRef<HTMLInputElement>();
  const lengthRef = createRef<HTMLInputElement>();
  const startErrorRef = createRef<HTMLTableCellElement>();
  const lengthErrorRef = createRef<HTMLTableCellElement>();

  // State for memory data
  const [address, setAddress] = useState<string>("");
  const [length, setLength] = useState<string>("");
  const [datasource, setDatasource] = useState<Uint8Array>(new Uint8Array(0));

  useEffect(() => {
    window.ipcToMain.dataMemory((data: GdbAny) => {
      //console.log("Received memory data:", data.toString());
      setDatasource(data.data);
      setAddress(data.begin);
      const begin = parseInt(data.begin, 16);
      const end = parseInt(data.end, 16);
      setLength("0x" + (end - begin).toString(16));
    });

    if (startErrorRef.current && lengthErrorRef.current) {
      startErrorRef.current.style.visibility = "hidden";
      lengthErrorRef.current.style.visibility = "hidden";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ToolWindowContent title={TOOL_WINDOW_TITLES.memory}>
      <div>
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
        <HexEditor
          datasource={datasource}
          offset={parseInt(address, 16) || 0}
          changeCallback={(index: number, value: number) => {
            // console.log(`Data changed at index ${index} to value ${value}`);
            // console.log(`${parseInt(address, 16) || 0}:${value}`);
            const addr = parseInt(address, 16) + index;
            window.ipcToMain.sendGdbCommand(
              `set {char}${addr.toString(16)} = ${value.toString(16)}`,
            );
          }}
        ></HexEditor>
      </div>
    </ToolWindowContent>
  );

  function validateMemoryParams() {
    const startInput = validateValue(startRef.current?.value);
    const lengthInput = validateValue(lengthRef.current?.value);

    if (startInput.isValid) {
      if (startErrorRef.current) {
        startErrorRef.current.style.visibility = "hidden";
      }
    } else {
      if (startErrorRef.current) {
        startErrorRef.current.style.visibility = "visible";
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

    window.ipcToMain.sendGdbCommand(
      `-data-read-memory-bytes ${start?.trim()} ${lengthInput.decimalValue?.toString().trim()}`,
    );
  }
}
