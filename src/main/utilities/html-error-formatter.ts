/**
 * Provides HTML formatting utilities for styled error messages emitted to the HTML_STREAM.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Formats a file read error as a styled HTML error box suitable for HTML_STREAM emission.
 *
 * @param filePath - The full path of the file that could not be read.
 * @param error - The caught exception.
 * @returns An HTML string containing the styled error box.
 */
export function formatFileReadError(filePath: string, error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return [
    `<div style="border: 2px solid #800000; border-radius: 4px; background-color: #fff0f0;`,
    `     padding: 0; margin: 4px 0; font-family: monospace; max-width: 800px; overflow: hidden;">`,
    `  <div style="background-color: #800000; color: #ffffff; font-weight: bold; font-size: 1.1em; padding: 1px 8px;">`,
    `    &#9888; Source File Read Error`,
    `  </div>`,
    `  <div style="color: #800000; padding: 4px 8px;">`,
    `    <div><span style="font-weight: bold;">Path:&nbsp;</span>${escapeHtml(filePath)}</div>`,
    `    <div style="margin-top: 3px;"><span style="font-weight: bold;">Error:</span>&nbsp;${escapeHtml(message)}</div>`,
    `  </div>`,
    `</div>`,
  ].join("\n");
}
