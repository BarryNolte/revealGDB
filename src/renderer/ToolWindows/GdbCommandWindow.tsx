/**
 * Implements gdb command window behavior for debugger tool-window rendering and interactions.
 *
 * @remarks
 * Exported symbols include `GdbCommandWindow`. It coordinates live debugger data with user interactions in docked tool-window views.
 */
import { ContextMenuComponent } from "@syncfusion/ej2-react-navigations";
import { JSX, useId } from "react";
import { doCutCopyPaste, menuCopy, menuCutCopyPaste } from "../utilities/Clipboard";
import "./GdbCommandWindow.css";
import { ToolWindowContent } from "./ToolWindowContent";
import { TOOL_WINDOW_TITLES } from "./toolWindowTitles";
import { useGdbCommandController } from "./useGdbCommandController";

/**
 * Performs gdb command window as part of this module's public API.
 *
 * @remarks
 * Supports debugger tool-window rendering, interaction handling, or data synchronization.
 *
 * @returns The computed result produced by this operation.
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
