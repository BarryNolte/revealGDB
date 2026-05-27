import { KeyboardEvent, useCallback, useEffect, useRef } from "react";
import { GdbAny } from "../../common/gdb-common";
import { CommandHistory } from "../utilities/CommandHistory";

function appendGdbMessage(
  outputRef: { current: HTMLDivElement | null },
  shouldScrollRef: { current: boolean },
  message: string,
  type: string,
): void {
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
}

function appendGdbHtmlMessage(
  outputRef: { current: HTMLDivElement | null },
  shouldScrollRef: { current: boolean },
  html: string,
): void {
  const div = document.createElement("div");
  div.innerHTML = html;
  outputRef.current?.appendChild(div);

  if (!shouldScrollRef.current) return;

  div.scrollIntoView();
  if (outputRef.current) {
    outputRef.current.scrollLeft = 0;
  }
}

function useGdbCommandHistory(
  cmdHistoryRef: { current: CommandHistory },
  inputRef: { current: HTMLInputElement | null },
  historyRef: { current: HTMLSelectElement | null },
) {
  const sendCommand = useCallback(() => {
    if (!inputRef.current) return;
    window.ipcToMain.commands.debugger.sendGdbCommand(inputRef.current.value);
    cmdHistoryRef.current.add(inputRef.current.value);
    inputRef.current.value = "";
    window.ipcToMain.commands.app.notifyMain({
      command: "save-cmd-history",
      data: cmdHistoryRef.current.commandHistory,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hideHistory = useCallback(() => {
    if (historyRef.current) historyRef.current.hidden = true;
    if (inputRef.current) inputRef.current.value = "";
    cmdHistoryRef.current.reset();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { sendCommand, hideHistory, showHistory };
}

function useGdbSubscriptions(
  outputRef: { current: HTMLDivElement | null },
  shouldScrollRef: { current: boolean },
  inputRef: { current: HTMLInputElement | null },
  historyRef: { current: HTMLSelectElement | null },
  cmdHistoryRef: { current: CommandHistory },
): void {
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
          if (inputRef.current) inputRef.current.focus();
          break;
      }
    });

    const unsubscribeConsole = window.ipcToMain.messages.console((message: string) => {
      appendGdbMessage(outputRef, shouldScrollRef, message, "rowConsole");
    });
    const unsubscribeLog = window.ipcToMain.messages.log((message: string) => {
      appendGdbMessage(outputRef, shouldScrollRef, message, "rowLog");
    });
    const unsubscribeError = window.ipcToMain.messages.error((message: string) => {
      appendGdbMessage(outputRef, shouldScrollRef, message, "rowError");
    });
    const unsubscribeDebug = window.ipcToMain.messages.debug((message: string) => {
      appendGdbMessage(outputRef, shouldScrollRef, message, "rowDebug");
    });
    const unsubscribeHtml = window.ipcToMain.messages.html((html: string) => {
      appendGdbHtmlMessage(outputRef, shouldScrollRef, html);
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
      if (historyElement) historyElement.ondblclick = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

function useGdbKeyboardHandlers(
  inputRef: { current: HTMLInputElement | null },
  historyRef: { current: HTMLSelectElement | null },
  sendCommand: () => void,
  hideHistory: () => void,
  showHistory: () => void,
) {
  const onSelectKeydownHandler = useCallback((args: KeyboardEvent<HTMLSelectElement>) => {
    switch (args.key) {
      case "Escape":
        if (historyRef.current) historyRef.current.hidden = true;
        inputRef.current?.focus();
        break;
      case "Enter":
        if (historyRef.current) historyRef.current.hidden = true;
        if (inputRef.current) {
          inputRef.current.value = args.currentTarget.value;
          inputRef.current.focus();
        }
        break;
    }
    args.stopPropagation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onInputKeyupHandler = useCallback((args: KeyboardEvent<HTMLInputElement>) => {
    switch (args.key) {
      case "ArrowUp":
        historyRef.current?.focus();
        break;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  return { onSelectKeydownHandler, onInputKeyupHandler, onInputKeydownHandler };
}

export function useGdbCommandController() {
  const cmdHistoryRef = useRef<CommandHistory>(new CommandHistory());
  const outputRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const historyRef = useRef<HTMLSelectElement | null>(null);
  const shouldScrollRef = useRef(true);

  const { sendCommand, hideHistory, showHistory } = useGdbCommandHistory(
    cmdHistoryRef,
    inputRef,
    historyRef,
  );
  useGdbSubscriptions(outputRef, shouldScrollRef, inputRef, historyRef, cmdHistoryRef);
  const { onSelectKeydownHandler, onInputKeyupHandler, onInputKeydownHandler } =
    useGdbKeyboardHandlers(inputRef, historyRef, sendCommand, hideHistory, showHistory);

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

  const onSendCommand = useCallback(() => sendCommand(), [sendCommand]);

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
