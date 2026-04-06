/**
 * Provides hex editor keymap behavior for hex editor rendering, navigation, and input handling.
 *
 * @remarks
 * Exported symbols include `KeyAction`, `resolveKeyAction`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
export type KeyAction =
  | { type: "move"; delta: number; preventDefault?: boolean }
  | { type: "cancel" }
  | { type: "input"; value: string }
  | { type: "ignore" };

/**
 * Performs resolve key action as part of this module's public API.
 *
 * @remarks
 * Contributes to hex editor navigation, rendering synchronization, or edit workflows.
 *
 * @param key - Value for `key` consumed by this operation.
 * @param validChars - Value for `validChars` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
export function resolveKeyAction(key: string, validChars: RegExp): KeyAction {
  switch (key) {
    case "ArrowUp":
      return { type: "move", delta: -16 };
    case "ArrowDown":
      return { type: "move", delta: 16 };
    case "ArrowLeft":
      return { type: "move", delta: -1 };
    case "ArrowRight":
      return { type: "move", delta: 1, preventDefault: true };
    case "Enter":
    case "Tab":
      return { type: "move", delta: 1, preventDefault: true };
    case "Escape":
      return { type: "cancel" };
    default:
      break;
  }

  if (validChars.test(key)) {
    return { type: "input", value: key };
  }

  return { type: "ignore" };
}
