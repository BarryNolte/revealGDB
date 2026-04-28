/**
 * Implements use gdb command controller behavior for debugger tool-window rendering and interactions.
 *
 * @remarks
 * Exported symbols include `useGdbCommandController`. It coordinates live debugger data with user interactions in docked tool-window views.
 */
import { KeyboardEvent, useCallback, useEffect, useRef } from "react";
import { GdbAny } from "../../common/gdb-common";
import { CommandHistory } from "../utilities/CommandHistory";

/**
 * Creates and returns the `useGdbCommandController` hook API used by renderer components.
 *
 * @remarks
 * Encapsulates stateful React logic and returns values/callbacks consumed by UI components. Supports debugger tool-window rendering, interaction handling, or data synchronization.
 */
export function useGdbCommandController() {
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

    if (!shouldScrollRef.current) return;

    br.scrollIntoView();
    if (outputRef.current) {
      outputRef.current.scrollLeft = 0;
    }
  }, []);

  const appendHtmlMessage = useCallback((html: string): void => {
    const div = document.createElement("div");
    div.innerHTML = html;
    outputRef.current?.appendChild(div);

    if (!shouldScrollRef.current) return;

    div.scrollIntoView();
    if (outputRef.current) {
      outputRef.current.scrollLeft = 0;
    }
  }, []);

  const sendCommand = useCallback(() => {
    if (!inputRef.current) {
      return;
    }

    window.ipcToMain.commands.debugger.sendGdbCommand(inputRef.current.value);
    cmdHistoryRef.current.add(inputRef.current.value);
    inputRef.current.value = "";

    window.ipcToMain.commands.app.notifyMain({
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
    if (!historyRef.current) return;

    historyRef.current.options.length = 0;

    for (const item of cmdHistoryRef.current.commandHistory) {
      const option = document.createElement("option");
      option.text = item;
      historyRef.current.add(option);
    }

    historyRef.current.hidden = false;
    historyRef.current.options.selectedIndex = historyRef.current.options.length - 1;
    historyRef.current.scrollIntoView(false);
  }, []);

  useEffect(() => {
    window.ipcToMain.queries.app.getSettings().then((gdb: GdbAny) => {
      cmdHistoryRef.current.clearHistory();
      gdb.command.history.forEach((cmd: string) => {
        cmdHistoryRef.current.add(cmd);
      });
    });

    const unsubscribeNotify = window.ipcToMain.notifications.render((msg: GdbAny): void => {
      switch (msg?.command) {
        case "command-entry":
          if (inputRef.current) {
            inputRef.current.focus();
          }
          break;
      }
    });

    const unsubscribeConsole = window.ipcToMain.messages.console((message: string) => {
      appendMessage(message, "rowConsole");
    });

    const unsubscribeLog = window.ipcToMain.messages.log((message: string) => {
      appendMessage(message, "rowLog");
    });

    const unsubscribeError = window.ipcToMain.messages.error((message: string) => {
      appendMessage(message, "rowError");
    });

    const unsubscribeDebug = window.ipcToMain.messages.debug((message: string) => {
      appendMessage(message, "rowDebug");
    });

    const unsubscribeHtml = window.ipcToMain.messages.html((html: string) => {
      appendHtmlMessage(html);
    });

    const historyElement = historyRef.current;
    if (historyElement) {
      historyElement.ondblclick = (_e: Event) => {
        if (!historyRef.current) return;
        historyRef.current.hidden = true;

        if (!inputRef.current) return;
        const selIdx = historyRef.current.selectedIndex;
        inputRef.current.value = historyRef.current.options[selIdx].value;
        inputRef.current.focus();
      };
    }

    return () => {
      unsubscribeNotify();
      unsubscribeConsole();
      unsubscribeLog();
      unsubscribeError();
      unsubscribeDebug();
      unsubscribeHtml();
      if (historyElement) {
        historyElement.ondblclick = null;
      }
    };
  }, [appendMessage, appendHtmlMessage]);

  const onSelectKeydownHandler = useCallback((args: KeyboardEvent<HTMLSelectElement>) => {
    switch (args.key) {
      case "Escape":
        if (historyRef.current) {
          historyRef.current.hidden = true;
        }
        break;
      case "Enter":
        if (historyRef.current) {
          historyRef.current.hidden = true;
        }
        if (inputRef.current) {
          inputRef.current.value = args.currentTarget.value;
          inputRef.current.focus();
        }
        break;
    }
    args.stopPropagation();
  }, []);

  const onInputKeyupHandler = useCallback((args: KeyboardEvent<HTMLInputElement>) => {
    switch (args.key) {
      case "ArrowUp":
        historyRef.current?.focus();
        break;
    }
  }, []);

  const onInputKeydownHandler = useCallback(
    (args: KeyboardEvent<HTMLInputElement>) => {
      switch (args.key) {
        case "ArrowUp":
          showHistory();
          break;
        case "Escape":
          hideHistory();
          break;
        case "Enter":
          sendCommand();
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

  return {
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
  };
}
