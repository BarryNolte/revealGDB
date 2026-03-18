export type KeyAction =
  | { type: "move"; delta: number; preventDefault?: boolean }
  | { type: "cancel" }
  | { type: "input"; value: string }
  | { type: "ignore" };

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
