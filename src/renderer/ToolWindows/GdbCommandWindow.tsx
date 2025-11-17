import { KeyboardEvent, useRef } from "react";

import { CommandHistory } from "../utilities/CommandHistory";
import "./GdbCommandWindow.css";
import { GdbAny } from "../../common/gdb-common";

function GdbCommandWindow() {
  const cmdHistory: CommandHistory = new CommandHistory();

  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<HTMLSelectElement>(null);

  let shouldScroll = true;

  window.ipcToMain.getSettings().then((gdb: GdbAny) => {
    cmdHistory.clearHistory();
    gdb.command.history.forEach((cmd: string) => {
      cmdHistory.add(cmd);
    });
  });

  const onSelectKeydownHandler = (args: KeyboardEvent<HTMLSelectElement>) => {
    switch (args.key) {
      case "Escape":
        {
          args.currentTarget.hidden = true;
        }
        break;
      case "Enter":
        {
          args.currentTarget.hidden = true;
          if (inputRef.current) {
            inputRef.current.value = args.currentTarget.value;
            inputRef.current.focus();
          }
        }
        break;
    }
  };

  const onInputKeydownHandler = (args: KeyboardEvent<HTMLInputElement>) => {
    switch (args.key) {
      case "ArrowUp":
        {
          if (historyRef.current) {
            historyRef.current.options.length = 0;

            for (const item of cmdHistory.commandHistory) {
              const option = document.createElement("option");
              option.text = item;
              historyRef.current.add(option);
            }

            historyRef.current.hidden = false;
            historyRef.current.focus();
            historyRef.current.options.selectedIndex = historyRef.current.options.length - 1;
            historyRef.current.scrollIntoView(false);
          }
        }
        break;
      case "Escape":
        {
          if (historyRef.current) {
            historyRef.current.hidden = true;
          }
          inputRef.current!.value = "";
          cmdHistory.reset();
        }
        break;
      case "Enter":
        {
          if (inputRef.current) {
            window.ipcToMain.sendGdbCommand(inputRef.current.value);
            cmdHistory.add(inputRef.current.value);
            inputRef.current.value = "";
          }

          window.ipcToMain.notifyMain({
            command: "save-cmd-history",
            data: cmdHistory.commandHistory,
          });
        }
        break;
    }
  };

  function onScrollHandler(/*e: Event*/) {
    const cr = outputRef.current?.getBoundingClientRect();

    const scrollHeight = outputRef.current?.scrollHeight ?? 0;
    const scrollTop = outputRef.current?.scrollTop ?? 0;
    const crHeight = cr?.height ?? 0;

    if (scrollHeight - scrollTop - crHeight > crHeight * 0.2) {
      shouldScroll = false;
    } else {
      shouldScroll = true;
    }
  }

  window.ipcToMain.notifyRender((msg: GdbAny) => {
    if (msg?.command === "command-entry") {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  });

  window.ipcToMain.consoleMessage((message: string) => {
    appendMessage(message, "rowConsole");
  });

  window.ipcToMain.logMessage((message: string) => {
    appendMessage(message, "rowLog");
  });

  window.ipcToMain.errorMessage((message: string) => {
    appendMessage(message, "rowError");
  });

  function appendMessage(message: string, type: string): void {
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
    if (shouldScroll) {
      br.scrollIntoView();
      if (outputRef.current) {
        outputRef.current.scrollLeft = 0;
      }
    }
  }

  return (
    <div className={"commandWindow"}>
      <div className={"outputRow"} ref={outputRef} onScroll={onScrollHandler} />
      <select
        className={"historyRow"}
        ref={historyRef}
        title={"Command History"}
        size={15}
        hidden={true}
        onKeyDown={onSelectKeydownHandler}
      />
      <input
        className={"inputRow"}
        ref={inputRef}
        type="text"
        placeholder={"Type your command here..."}
        onKeyDown={onInputKeydownHandler}
      />
    </div>
  );
}

export default GdbCommandWindow;
