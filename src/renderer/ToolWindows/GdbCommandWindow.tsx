/**
 * GDB Command window component.
 *
 * Provides an interactive command-line interface for sending GDB MI commands.
 * Features include:
 * - Command input with history navigation (Up/Down arrows)
 * - Command history dropdown (Ctrl+H)
 * - Color-coded output (console, log, error, debug)
 * - Auto-scroll to latest output
 * - Context menu for copy/paste operations
 *
 * The window maintains a command history (up to 100 commands) that persists
 * across sessions via the main process settings.
 */

import { ContextMenuComponent } from "@syncfusion/ej2-react-navigations";
import { JSX, useId } from "react";
import { doCutCopyPaste, menuCopy, menuCutCopyPaste } from "../utilities/Clipboard";
import "./GdbCommandWindow.css";
import { ToolWindowContent } from "./ToolWindowContent";
import { TOOL_WINDOW_TITLES } from "./toolWindowTitles";
import { useGdbCommandController } from "./useGdbCommandController";

/**
 * GDB command window component.
 * Provides interactive command input and color-coded output display.
 */
export default function GdbCommandWindow(): JSX.Element {
  const idBase = useId();
  const outputId = `cmdOutput-${idBase}`;
  const inputId = `cmdInput-${idBase}`;
  const outputMenuId = `cmdOutputMenu-${idBase}`;
  const inputMenuId = `cmdInputMenu-${idBase}`;

  const {
    outputRef,
    inputRef,
    historyRef,
    onSelectKeydownHandler,
    onInputKeyupHandler,
    onInputKeydownHandler,
    onScrollHandler,
    onShowHistory,
    onSendCommand,
    onClearWindow,
  } = useGdbCommandController();

  return (
    <ToolWindowContent title={TOOL_WINDOW_TITLES.command}>
      <div className={"commandWindow full-size"} data-testid="gdb-command-window">
        <div
          className={"outputRow"}
          id={outputId}
          ref={outputRef}
          onScroll={onScrollHandler}
          data-testid="gdb-command-output"
        />
        <div className={"historyRow"}>
          <select
            className={"historySelect"}
            ref={historyRef}
            title={"Command History"}
            size={15}
            hidden={true}
            onKeyDown={onSelectKeydownHandler}
            data-testid="gdb-command-history"
          />
        </div>
        <div className="inputContainer">
          <input
            className={"inputRow"}
            id={inputId}
            ref={inputRef}
            type="text"
            spellCheck={false}
            placeholder={"Type your command here..."}
            onKeyDown={onInputKeydownHandler}
            onKeyUp={onInputKeyupHandler}
            data-testid="gdb-command-input"
          />
          <button
            className="commandButton commandButtonSend"
            title="Send Command"
            type="button"
            onClick={onSendCommand}
            data-testid="gdb-command-send"
          />
          <button
            className="commandButton commandButtonHistory"
            title="History"
            type="button"
            onClick={onShowHistory}
            data-testid="gdb-command-show-history"
          />
          <button
            className="commandButton commandButtonClear"
            title="Clear Command Window"
            type="button"
            onClick={onClearWindow}
            data-testid="gdb-command-clear"
          />
        </div>
        <ContextMenuComponent
          id={outputMenuId}
          target={`#${outputId}`}
          items={menuCopy}
          select={(e) => doCutCopyPaste(e.item.text, inputRef.current!)}
        />
        <ContextMenuComponent
          id={inputMenuId}
          target={`#${inputId}`}
          items={menuCutCopyPaste}
          select={(e) => doCutCopyPaste(e.item.text, inputRef.current!)}
        />
      </div>
    </ToolWindowContent>
  );
}
