/**
 * @file HexEditor.tsx
 * @description Main hex editor component that coordinates three synchronized view panels.
 * Manages the centralized event handler and layout for offset, hex data, and text views.
 */

import HexTextView from "./view-text";
import HexDataView from "./view-data";
import HexOffsetView from "./view-offset";
import { MouseKeyboardHandler } from "./MouseKeyboardHandler";
import "./HexEditor.css";
import { type JSX } from "react";

/** Props for the HexEditor component */
interface HexEditorProps {
  /** Starting memory offset for display (e.g., 0x40000) */
  offset: number;
  /** Binary data source to display (Uint8Array) */
  datasource: Uint8Array;
}

/**
 * HexEditor - Main component that renders three synchronized hex editor views.
 *
 * Architecture:
 * - Creates a single MouseKeyboardHandler instance shared by all views
 * - Renders three synchronized column views in a flex container:
 *   1. HexOffsetView: Memory addresses (sticky left)
 *   2. HexDataView: Hexadecimal byte values
 *   3. HexTextView: ASCII/Unicode character representation
 *
 * Event Flow:
 * - Mouse events from any view propagate to the centralized MouseKeyboardHandler
 * - Handler validates input, manages UI state, and invokes dataChangeCallback on edits
 * - All views re-render from the same data source (Uint8Array) on each update
 *
 * @param {HexEditorProps} props - Component props
 * @returns {JSX.Element} Flex container with three synchronized view columns
 */
export default function HexEditor({ offset, datasource }: HexEditorProps): JSX.Element {
  // Centralized event handler for all mouse and keyboard interactions
  const mouseKeyboardHandler = new MouseKeyboardHandler(datasource.length, (index, value) => {
    console.debug(`Data changed at index ${index} to value ${value}`);
    // TODO: Implement data persistence (update datasource, trigger save, etc.)
  });

  return (
    <div>
      {/* Flex container holds three synchronized view columns */}
      <div className="he-flex-container">
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
