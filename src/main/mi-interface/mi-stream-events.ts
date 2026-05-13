/**
 * Named constants for GDB/MI stream event names emitted by the MI interface layer.
 *
 * @remarks
 * Centralising these literals avoids duplication across handlers and prevents
 * typo-related bugs when wiring emitters to listeners.
 */

export const LOG_STREAM = "log-stream";
export const CONSOLE_STREAM = "console-stream";
export const ERROR_STREAM = "error-stream";
export const DEBUG_STREAM = "debug-stream";
export const HTML_STREAM = "html-stream";
