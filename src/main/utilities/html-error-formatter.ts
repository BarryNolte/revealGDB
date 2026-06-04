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

export function formatGeneralError(error: string, info: string, info2?: string): string {
  return [
    `<div style="border: 2px solid #800000; border-radius: 4px; background-color: #fff0f0;`,
    `     padding: 0; margin: 4px 0; font-family: monospace; max-width: 800px; overflow: hidden;">`,
    `  <div style="background-color: #800000; color: #ffffff; font-weight: bold; font-size: 1.1em; padding: 1px 8px;">`,
    `    &#9888; ${escapeHtml(error)}`,
    `  </div>`,
    `  <div style="color: #800000; padding: 4px 8px;">`,
    `    <div style="margin-top: 3px;"><span style="font-weight: bold;">Error:</span>&nbsp;${escapeHtml(error)}</div>`,
    `    <div><span style="font-weight: bold;">${escapeHtml(info)}</span></div>`,
    `    <div><span style="font-weight: bold;">${escapeHtml(info2 || "")}</span></div>`,
    `    <div style="margin-top: 3px;"><span style="font-weight: bold;">What to do:</span>&nbsp;<button onclick="window.ipcToMain?.commands?.app?.notifyMain({command:'open-external',data:'https://github.com/BarryNolte/revealGDB/issues'})" style="cursor: pointer; padding: 4px 8px; border-radius: 3px; border: 1px solid #800000; background-color: #ffffff; color: #800000; font-weight: bold;">Report this issue</button></div>`,
    `  </div>`,
    `</div>`,
  ].join("\n");
}
