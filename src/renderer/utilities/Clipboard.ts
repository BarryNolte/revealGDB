/**
 * Clipboard utilities for text operations.
 *
 * Provides helper functions for cut, copy, and paste operations using the
 * Clipboard API. Used by various components to handle text selection and
 * transfer operations in input fields and text areas.
 */

/**
 * Predefined context menu items for clipboard operations.
 */
export const menuCopy = [{ text: "Copy" }];
export const menuCutCopyPaste = [{ text: "Cut" }, { text: "Copy" }, { text: "Paste" }];

/**
 * Writes text to the system clipboard.
 *
 * @param text - The text string to copy to clipboard
 */
export function sendTextToClipboard(text: string): void {
  navigator.clipboard.writeText(text).catch((err) => {
    console.error("Failed to copy text: ", err);
  });
}

/**
 * Handles cut, copy, and paste operations on an input element.
 *
 * This function implements clipboard operations while properly managing
 * text selection and cursor position in the input element.
 *
 * @param command - The operation to perform: "Cut", "Copy", or "Paste"
 * @param element - The HTML input element to operate on
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
