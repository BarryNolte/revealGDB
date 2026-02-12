import { ContextMenuComponent } from "@syncfusion/ej2-react-navigations";
import { JSX, KeyboardEvent, useCallback, useEffect, useId, useRef } from "react";
import { GdbAny } from "../../common/gdb-common";
import { doCutCopyPaste, menuCopy, menuCutCopyPaste } from "../utilities/Clipboard";
import { CommandHistory } from "../utilities/CommandHistory";
import "./GdbCommandWindow.css";

export default function GdbCommandWindow(): JSX.Element {
  const idBase = useId();
  const outputId = `cmdOutputRow-${idBase}`;
  const inputId = `cmdInputRow-${idBase}`;
  const cmdHistoryRef = useRef<CommandHistory>(new CommandHistory());
  const outputRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const historyRef = useRef<HTMLSelectElement | null>(null);
  const shouldScrollRef = useRef(true);

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

  const hideHistory = useCallback(() => {
    if (historyRef.current) {
      historyRef.current.hidden = true;
    }
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    cmdHistoryRef.current.reset();
  }, []);

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
      </div>
      <ContextMenuComponent
        target={`#${outputId}`}
        items={menuCopy}
        select={(e) => doCutCopyPaste(e.item.text, inputRef.current!)}
      />
      <ContextMenuComponent
        target={`#${inputId}`}
        items={menuCutCopyPaste}
        select={(e) => doCutCopyPaste(e.item.text, inputRef.current!)}
      />
    </div>
  );
}
