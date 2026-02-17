export const menuCopy = [{ text: "Copy" }];
export const menuCutCopyPaste = [{ text: "Cut" }, { text: "Copy" }, { text: "Paste" }];

export function sendTextToClipboard(text: string): void {
  navigator.clipboard.writeText(text).catch((err) => {
    console.error("Failed to copy text: ", err);
  });
}

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
        sendTextToClipboard(selectedText);
        // Remove the selected text from the input element
        const start = element.selectionStart ?? element.value.length;
        const end = element.selectionEnd ?? element.value.length;
        element.value = element.value.slice(0, start) + element.value.slice(end);
        element.setSelectionRange(start, start);
        element.focus();
      }
      break;
    case "Paste":
      {
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
