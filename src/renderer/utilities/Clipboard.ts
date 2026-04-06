/**
 * Provides clipboard renderer utilities for formatting, state shaping, and shared view logic.
 *
 * @remarks
 * Exported symbols include `menuCopy`, `menuCutCopyPaste`, `sendTextToClipboard`, `doCutCopyPaste`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
export const menuCopy = [{ text: "Copy" }];
export const menuCutCopyPaste = [{ text: "Cut" }, { text: "Copy" }, { text: "Paste" }];

/**
 * Performs send text to clipboard as part of this module's public API.
 *
 * @param text - Value for `text` consumed by this operation.
 */
export function sendTextToClipboard(text: string): void {
  navigator.clipboard.writeText(text).catch((err) => {
    console.error("Failed to copy text: ", err);
  });
}

/**
 * Performs do cut copy paste as part of this module's public API.
 *
 * @param command - Debugger command text or command descriptor to execute.
 * @param element - Value for `element` consumed by this operation.
 */
export function doCutCopyPaste(command: string, element: HTMLInputElement): void {
  const selection = window.getSelection();
  const selectedText = selection?.toString() ?? "";
  switch (command) {
    case "Copy":
      {
        sendTextToClipboard(selectedText);
      }
      break;
    case "Cut":
      {
        // Copy to clipboard and remove selected text
        sendTextToClipboard(selectedText);
        const start = element.selectionStart ?? element.value.length;
        const end = element.selectionEnd ?? element.value.length;
        element.value = element.value.slice(0, start) + element.value.slice(end);
        element.setSelectionRange(start, start);
        element.focus();
      }
      break;
    case "Paste":
      {
        // Read from clipboard and insert at cursor position
        navigator.clipboard
          .readText()
          .then((text) => {
            const start = element.selectionStart ?? element.value.length;
            const end = element.selectionEnd ?? element.value.length;
            element.value = element.value.slice(0, start) + text + element.value.slice(end);
            const newPos = start + text.length;
            element.setSelectionRange(newPos, newPos);
            element.focus();
          })
          .catch((err) => {
            console.error("Failed to read text from clipboard: ", err);
          });
      }
      break;
  }
}
