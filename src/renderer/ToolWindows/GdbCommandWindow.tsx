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
import { JSX, KeyboardEvent, useCallback, useEffect, useId, useRef } from "react";
import { GdbAny } from "../../common/gdb-common";
import { doCutCopyPaste, menuCopy, menuCutCopyPaste } from "../utilities/Clipboard";
import { CommandHistory } from "../utilities/CommandHistory";
import "./GdbCommandWindow.css";

/**
 * GDB command window component.
 * Provides interactive command input and color-coded output display.
 */
export default function GdbCommandWindow(): JSX.Element {
  const idBase = useId();
  const outputId = `cmdOutput-${idBase}`;
  const inputId = `cmdInput-${idBase}`;
  const outputMenuId = `cmdOutputMenu-${idBase}-menu`;
  const inputMenuId = `cmdInputMenu-${idBase}-menu`;

  // Refs for managing state and DOM elements
  const cmdHistoryRef = useRef<CommandHistory>(new CommandHistory());
  const outputRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const historyRef = useRef<HTMLSelectElement | null>(null);
  const shouldScrollRef = useRef(true);

  /**
   * Appends a message to the output area with type-specific styling.
   * @param message - The text to display
   * @param type - CSS class for styling (rowConsole, rowLog, rowError, rowDebug)
   */
  const appendMessage = useCallback((message: string, type: string): void => {
    const sp = document.createElement("span");
    sp.classList.add("defaultRow");
    const br = document.createElement("br");
    outputRef.current?.appendChild(sp);

    if (message === "") {
      message = "\u00A0";
    }

    sp.classList.add(type);

    sp.appendChild(document.createTextNode(message));
    outputRef.current?.appendChild(br);
    if (shouldScrollRef.current) {
      br.scrollIntoView();
      if (outputRef.current) {
        outputRef.current.scrollLeft = 0;
      }
    }
  }, []);

  /**
   * Sends the current command to GDB and adds it to history.
   * Clears the input field and persists history to settings.
   */
  const sendCommand = useCallback(() => {
    if (inputRef.current) {
      window.ipcToMain.sendGdbCommand(inputRef.current.value);
      cmdHistoryRef.current.add(inputRef.current.value);
      inputRef.current.value = "";
    }

    window.ipcToMain.notifyMain({
      command: "save-cmd-history",
      data: cmdHistoryRef.current.commandHistory,
    });
  }, []);

  /**
   * Hides the history dropdown and resets navigation state.
   */
  const hideHistory = useCallback(() => {
    if (historyRef.current) {
      historyRef.current.hidden = true;
    }
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    cmdHistoryRef.current.reset();
  }, []);

  /**
   * Shows the history dropdown populated with all previous commands.
   * Selects the most recent command by default.
   */
  const showHistory = useCallback(() => {
    if (historyRef.current) {
      historyRef.current.options.length = 0;

      for (const item of cmdHistoryRef.current.commandHistory) {
        const option = document.createElement("option");
        option.text = item;
        historyRef.current.add(option);
      }

      historyRef.current.hidden = false;
      historyRef.current.options.selectedIndex = historyRef.current.options.length - 1;
      historyRef.current.scrollIntoView(false);
    }
  }, []);

  /**
   * Load command history and subscribe to message channels on mount.
   * Sets up listeners for console, log, error, and debug messages from GDB.
   */
  useEffect(() => {
    window.ipcToMain.getSettings().then((gdb: GdbAny) => {
      cmdHistoryRef.current.clearHistory();
      gdb.command.history.forEach((cmd: string) => {
        cmdHistoryRef.current.add(cmd);
      });
    });

    const unsubscribeNotify = window.ipcToMain.notifyRender((msg: GdbAny): void => {
      switch (msg?.command) {
        case "command-entry":
          {
            if (inputRef.current) {
              inputRef.current.focus();
            }
          }
          break;
      }
    });

    const unsubscribeConsole = window.ipcToMain.consoleMessage((message: string) => {
      appendMessage(message, "rowConsole");
    });

    const unsubscribeLog = window.ipcToMain.logMessage((message: string) => {
      appendMessage(message, "rowLog");
    });

    const unsubscribeError = window.ipcToMain.errorMessage((message: string) => {
      appendMessage(message, "rowError");
    });

    const unsubscribeDebug = window.ipcToMain.debugMessage((message: string) => {
      appendMessage(message, "rowDebug");
    });

    const historyElement = historyRef.current;
    if (historyElement) {
      historyElement.ondblclick = (_e: Event) => {
        if (historyRef.current) {
          historyRef.current.hidden = true;

          if (inputRef.current) {
            const selIdx = historyRef.current.selectedIndex;
            inputRef.current.value = historyRef.current.options[selIdx].value;
            inputRef.current.focus();
          }
        }
      };
    }

    return () => {
      unsubscribeNotify();
      unsubscribeConsole();
      unsubscribeLog();
      unsubscribeError();
      unsubscribeDebug();
      if (historyElement) {
        historyElement.ondblclick = null;
      }
    };
  }, [appendMessage]);

  const onSelectKeydownHandler = useCallback((args: KeyboardEvent<HTMLSelectElement>) => {
    switch (args.key) {
      case "Escape":
        {
          if (historyRef.current) {
            historyRef.current.hidden = true;
          }
        }
        break;
      case "Enter":
        {
          if (historyRef.current) {
            historyRef.current.hidden = true;
          }

          if (inputRef.current) {
            inputRef.current.value = args.currentTarget.value;
            inputRef.current.focus();
          }
        }
        break;
    }
    args.stopPropagation();
  }, []);

  const onInputKeyupHandler = useCallback((args: KeyboardEvent<HTMLInputElement>) => {
    switch (args.key) {
      case "ArrowUp":
        {
          historyRef.current?.focus();
        }
        break;
    }
  }, []);

  const onInputKeydownHandler = useCallback(
    (args: KeyboardEvent<HTMLInputElement>) => {
      switch (args.key) {
        case "ArrowUp":
          {
            showHistory();
          }
          break;
        case "Escape":
          {
            hideHistory();
          }
          break;
        case "Enter":
          {
            sendCommand();
          }
          break;
      }
    },
    [hideHistory, sendCommand, showHistory],
  );

  const onScrollHandler = useCallback(() => {
    const cr = outputRef.current?.getBoundingClientRect();

    const scrollHeight = outputRef.current?.scrollHeight ?? 0;
    const scrollTop = outputRef.current?.scrollTop ?? 0;
    const crHeight = cr?.height ?? 0;

    if (scrollHeight - scrollTop - crHeight > crHeight * 0.2) {
      shouldScrollRef.current = false;
    } else {
      shouldScrollRef.current = true;
    }
  }, []);

  const onShowHistory = useCallback(() => {
    if (historyRef.current?.hidden === false) {
      hideHistory();
    } else {
      showHistory();
    }
  }, [hideHistory, showHistory]);

  const onSendCommand = useCallback(() => {
    sendCommand();
  }, [sendCommand]);

  const onClearWindow = useCallback(() => {
    if (outputRef.current) {
      outputRef.current.innerHTML = "";
    }
  }, []);

  return (
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
  );
}
