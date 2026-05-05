/**
 * Shared HexEditor types to break the circular dependency between HexEditor.tsx and MouseKeyboardHandler.ts.
 */

/** Callback signature for data change notifications */
export type ArrayChangeCallback = (index: number, value: number) => void;
