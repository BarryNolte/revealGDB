/**
 * Provides hex editor behavior for hex editor rendering, navigation, and input handling.
 *
 * @remarks
 * Exported symbols include `ArrayChangeCallback`, `HexEditor`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { createRef, JSX, useEffect } from "react";
import "./HexEditor.css";
import { MouseKeyboardHandler } from "./MouseKeyboardHandler";
import HexDataView from "./view-data";
import HexOffsetView from "./view-offset";
import HexTextView from "./view-text";

/** Callback signature for data change notifications */
export type ArrayChangeCallback = (index: number, value: number) => void;

/** Props for the HexEditor component */
export interface HexEditorProps {
  /** Starting memory offset for display (e.g., 0x40000) */
  offset: number;
  /** Binary data source to display (Uint8Array) */
  datasource: Uint8Array;
  /** Callback for data change notifications */
  changeCallback?: ArrayChangeCallback;
}

/**
 * Performs hex editor as part of this module's public API.
 *
 * @remarks
 * Contributes to hex editor navigation, rendering synchronization, or edit workflows.
 *
 * @param param1 - Value for `param1` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
export default function HexEditor({
  offset,
  datasource,
  changeCallback,
}: HexEditorProps): JSX.Element {
  const hexEditorRef = createRef<HTMLDivElement>();

  // Centralized event handler for all mouse and keyboard interactions
  const mouseKeyboardHandler = new MouseKeyboardHandler(datasource.length, changeCallback);

  useEffect(() => {
    if (hexEditorRef.current) {
      const changedElements: HTMLCollection =
        hexEditorRef.current.getElementsByClassName("he-data-changed");

      Array.from(changedElements).forEach((element) => {
        element.classList.remove("he-data-changed");
      });
    }
  }, [datasource, hexEditorRef]);

  return (
    <div data-testid="hex-editor">
      {/* Flex container holds three synchronized view columns */}
      <div ref={hexEditorRef} className="he-flex-container" data-testid="hex-editor-container">
        {/* Left column: Memory offsets (sticky) */}
        <HexOffsetView
          offset={offset}
          datasource={datasource}
          mouseCallback={(t, v) => mouseKeyboardHandler.handleMouseEvent(t, v)}
        />
        {/* Middle column: Hexadecimal byte values */}
        <HexDataView
          datasource={datasource}
          mouseCallback={(t, v) => mouseKeyboardHandler.handleMouseEvent(t, v)}
        />
        {/* Right column: ASCII/Unicode text representation */}
        <HexTextView
          datasource={datasource}
          mouseCallback={(t, v) => mouseKeyboardHandler.handleMouseEvent(t, v)}
        />
      </div>
    </div>
  );
}
