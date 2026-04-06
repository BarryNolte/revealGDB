/**
 * Provides editor entry form behavior for hex editor rendering, navigation, and input handling.
 *
 * @remarks
 * This file primarily contains internal declarations and implementation details. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { useRef } from "react";
import { DataViewEnum, TextViewEnum } from "./common";
import "./editor-entry-form.css";

interface EditorEntryProps {
  datalength: number;
  dataCallback: (radix: DataViewEnum) => void;
  textCallback: (text: TextViewEnum) => void;
}

/**
 * Performs editor entry as part of this module's internal workflow.
 *
 * @remarks
 * Contributes to hex editor navigation, rendering synchronization, or edit workflows.
 *
 * @param param1 - Value for `param1` consumed by this operation.
 */
const EditorEntry = ({ datalength, dataCallback, textCallback }: EditorEntryProps) => {
  const radixRef = useRef<HTMLSelectElement>(null);
  const textRef = useRef<HTMLSelectElement>(null);

  /**
   * Sets radix on current state.
   *
   * @remarks
   * Contributes to hex editor navigation, rendering synchronization, or edit workflows.
   */
  const setRadix = (): void => {
    if (dataCallback) {
      const selectedRadix: DataViewEnum =
        parseInt(radixRef.current?.value || "") || DataViewEnum.Byte1;
      dataCallback(selectedRadix);
    }
  };

  /**
   * Sets text on current state.
   *
   * @remarks
   * Contributes to hex editor navigation, rendering synchronization, or edit workflows.
   */
  const setText = (): void => {
    if (textCallback) {
      const text: TextViewEnum = parseInt(textRef.current?.value || "") || TextViewEnum.ascii;
      textCallback(text);
    }
  };

  const placeholder = "0x" + datalength.toString(16).toUpperCase() + " bytes";

  return (
    <div className="editor-entry">
      <input id="memoryAddress" type="text" placeholder="Enter Address..." />
      <select
        id="memoryDataSizeView"
        onChange={setRadix}
        ref={radixRef}
        title="radix"
        defaultValue={DataViewEnum.Byte1}
      >
        <option value={DataViewEnum.Byte1}>Hexadecimal</option>
        <option value={DataViewEnum.Byte2}>Hex 16bit</option>
        <option value={DataViewEnum.Byte4}>Hex 32bit</option>
        <option value={DataViewEnum.Float32}>Float 16bit</option>
        <option value={DataViewEnum.Float64}>Float 32bit</option>
      </select>
      <select
        id="memoryTextView"
        onChange={setText}
        ref={textRef}
        title="textView"
        defaultValue={TextViewEnum.ascii}
      >
        <option value={TextViewEnum.none}>none</option>
        <option value={TextViewEnum.ascii}>ASCII</option>
        <option value={TextViewEnum.unicode}>UNICODE</option>
      </select>
      <div>
        Data Length:
        <input
          id="memoryLength"
          type="text"
          placeholder={placeholder}
          required
          minLength={4}
          maxLength={8}
          size={10}
        />
        <button type="button">Refresh...</button>
      </div>
    </div>
  );
};

export default EditorEntry;
