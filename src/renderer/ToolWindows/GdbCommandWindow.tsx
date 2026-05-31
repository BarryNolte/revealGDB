/**
 * Implements gdb command window behavior for debugger tool-window rendering and interactions.
 *
 * @remarks
 * Exported symbols include `GdbCommandWindow`. It coordinates live debugger data with user interactions in docked tool-window views.
 */
import { ContextMenuComponent } from "@syncfusion/ej2-react-navigations";
import { JSX, KeyboardEventHandler, RefObject, useId } from "react";
import { DangerousCommandDialog } from "../Dialogs/DangerousCommandDialog";
import { doCutCopyPaste, menuCopyAll, menuCutCopyPaste } from "../utilities/Clipboard";
import "./GdbCommandWindow.css";
import { ToolWindowContent } from "./ToolWindowContent";
import { TOOL_WINDOW_TITLES } from "./toolWindowTitles";
import { useGdbCommandController } from "./useGdbCommandController";

type CommandInputBarProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  onKeyDown: KeyboardEventHandler<HTMLInputElement>;
  onKeyUp: KeyboardEventHandler<HTMLInputElement>;
  onSendCommand: () => void;
  onShowHistory: () => void;
  onClearWindow: () => void;
};

function CommandInputBar(props: CommandInputBarProps): JSX.Element {
  const { inputRef, onKeyDown, onKeyUp, onSendCommand, onShowHistory, onClearWindow } = props;
  const outputMenuId = useId();
  const inputMenuId = useId();

  return (
    <>
      <div className="inputContainer">
        <input
          className={"inputRow"}
          ref={inputRef}
          type="text"
          spellCheck={false}
          placeholder={"Type your command here..."}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          data-cmd-input="1"
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
        target="[data-cmd-output]"
        items={menuCopyAll}
        select={(e) => doCutCopyPaste(e.item.text, inputRef.current!)}
      />
      <ContextMenuComponent
        id={inputMenuId}
        target="[data-cmd-input]"
        items={menuCutCopyPaste}
        select={(e) => doCutCopyPaste(e.item.text, inputRef.current!)}
      />
    </>
  );
}

/**
 * Performs gdb command window as part of this module's public API.
 *
 * @remarks
 * Supports debugger tool-window rendering, interaction handling, or data synchronization.
 *
 * @returns The computed result produced by this operation.
 */
export default function GdbCommandWindow(): JSX.Element {
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
    dangerousPrompt,
    onDangerousCommandResponse,
  } = useGdbCommandController();

  return (
    <>
      <ToolWindowContent title={TOOL_WINDOW_TITLES.command}>
        <div className={"commandWindow full-size"} data-testid="gdb-command-window">
          <div
            className={"outputRow"}
            ref={outputRef}
            onScroll={onScrollHandler}
            data-cmd-output="1"
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
          <CommandInputBar
            inputRef={inputRef}
            onKeyDown={onInputKeydownHandler}
            onKeyUp={onInputKeyupHandler}
            onSendCommand={onSendCommand}
            onShowHistory={onShowHistory}
            onClearWindow={onClearWindow}
          />
        </div>
      </ToolWindowContent>
      {dangerousPrompt && (
        <DangerousCommandDialog
          commandText={dangerousPrompt.commandText}
          reason={dangerousPrompt.reason}
          onResponse={onDangerousCommandResponse}
        />
      )}
    </>
  );
}
