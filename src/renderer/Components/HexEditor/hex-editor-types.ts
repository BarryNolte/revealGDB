/**
 * Shared HexEditor types to break the circular dependency between HexEditor.tsx and MouseKeyboardHandler.ts.
 */

import type { JSX } from "react";
import type { MouseCallback } from "./MouseKeyboardHandler";

/** Callback signature for data change notifications */
export type ArrayChangeCallback = (index: number, value: number) => void;

/** Props for the HexDataView header component */
export interface HexDataViewHeaderProps {
  /** Header content for the hex data view */
  header: JSX.Element;
  /** Callback for mouse/keyboard events */
  mouseCallback: MouseCallback;
}
