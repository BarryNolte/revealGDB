/**
 * Implements useGdbCommandController for revealGDB.
 *
 * @remarks
 * Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import type { DangerousCommandResponse, NotifyRenderMessage } from "../../common/ipc-contracts";
import type { GdbSettings } from "../../common/settings-types";
import { CommandHistory } from "../utilities/CommandHistory";

const MAX_OUTPUT_ROWS = 2000;
const EVICT_BATCH = 200;
/**
 * Performs scheduleScroll as part of this module's internal workflow.
 *
 * @param outputRef - outputRef parameter.
 * @param pendingScrollRef - pendingScrollRef parameter.
 * @returns The computed result produced by this operation.
 */

function scheduleScroll(
  outputRef: { current: HTMLDivElement | null },
  pendingScrollRef: { current: boolean },
): void {
  if (pendingScrollRef.current) return;
  pendingScrollRef.current = true;
  requestAnimationFrame(() => {
    pendingScrollRef.current = false;
    if (!outputRef.current) return;
    outputRef.current.scrollTop = outputRef.current.scrollHeight;
    outputRef.current.scrollLeft = 0;
  });
}
/**
 * Performs evictRows as part of this module's internal workflow.
 *
 * @param outputRef - outputRef parameter.
 * @param rowCountRef - rowCountRef parameter.
 * @returns The computed result produced by this operation.
 */

function evictRows(
  outputRef: { current: HTMLDivElement | null },
  rowCountRef: { current: number },
): void {
  const el = outputRef.current;
  if (!el) return;
  let toRemove = EVICT_BATCH;
  while (toRemove > 0 && el.firstChild) {
    el.removeChild(el.firstChild);
    toRemove--;
  }
  rowCountRef.current = Math.max(0, rowCountRef.current - EVICT_BATCH);
}
/**
 * Performs appendGdbMessage as part of this module's internal workflow.
 *
 * @param outputRef - outputRef parameter.
 * @param shouldScrollRef - shouldScrollRef parameter.
 * @param pendingScrollRef - pendingScrollRef parameter.
 * @param rowCountRef - rowCountRef parameter.
 * @param message - message parameter.
 * @param type - type parameter.
 * @returns The computed result produced by this operation.
 */

function appendGdbMessage(
  outputRef: { current: HTMLDivElement | null },
  shouldScrollRef: { current: boolean },
  pendingScrollRef: { current: boolean },
  rowCountRef: { current: number },
  message: string,
  type: string,
): void {
  if (!outputRef.current) return;

  const sp = document.createElement("span");
  sp.className = `defaultRow ${type}`;
  sp.textContent = message === "" ? "\u00A0" : message;

  const br = document.createElement("br");
  const frag = document.createDocumentFragment();
  frag.appendChild(sp);
  frag.appendChild(br);
  outputRef.current.appendChild(frag);
  rowCountRef.current++;
  if (rowCountRef.current > MAX_OUTPUT_ROWS + EVICT_BATCH) {
    evictRows(outputRef, rowCountRef);
  }

  if (!shouldScrollRef.current) return;
  scheduleScroll(outputRef, pendingScrollRef);
}
/**
 * Performs appendGdbHtmlMessage as part of this module's internal workflow.
 *
 * @param outputRef - outputRef parameter.
 * @param shouldScrollRef - shouldScrollRef parameter.
 * @param pendingScrollRef - pendingScrollRef parameter.
 * @param rowCountRef - rowCountRef parameter.
 * @param html - html parameter.
 * @returns The computed result produced by this operation.
 */

function appendGdbHtmlMessage(
  outputRef: { current: HTMLDivElement | null },
  shouldScrollRef: { current: boolean },
  pendingScrollRef: { current: boolean },
  rowCountRef: { current: number },
  html: string,
): void {
  if (!outputRef.current) return;
  const div = document.createElement("div");
  div.innerHTML = html;
  outputRef.current.appendChild(div);
  rowCountRef.current++;
  if (rowCountRef.current > MAX_OUTPUT_ROWS + EVICT_BATCH) {
    evictRows(outputRef, rowCountRef);
  }

  if (!shouldScrollRef.current) return;
  scheduleScroll(outputRef, pendingScrollRef);
}
/**
 * Performs useGdbCommandHistory as part of this module's internal workflow.
 *
 * @param cmdHistoryRef - cmdHistoryRef parameter.
 * @param inputRef - inputRef parameter.
 * @param historyRef - historyRef parameter.
 * @returns The computed result produced by this operation.
 */

function useGdbCommandHistory(
  cmdHistoryRef: { current: CommandHistory },
  inputRef: { current: HTMLInputElement | null },
  historyRef: { current: HTMLSelectElement | null },
) {
  const sendCommand = useCallback(() => {
    if (!inputRef.current) return;
    void window.ipcToMain.commands.debugger.sendGdbCommand(inputRef.current.value);
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

type AppendRefs = {
  outputRef: { current: HTMLDivElement | null };
  shouldScrollRef: { current: boolean };
  pendingScrollRef: { current: boolean };
  rowCountRef: { current: number };
};
/**
 * Performs subscribeMessageChannels as part of this module's internal workflow.
 *
 * @param refs - refs parameter.
 * @returns The computed result produced by this operation.
 */

function subscribeMessageChannels(refs: AppendRefs): () => void {
  const { outputRef, shouldScrollRef, pendingScrollRef, rowCountRef } = refs;
  const unsubscribeConsole = window.ipcToMain.messages.console((message: string) => {
    appendGdbMessage(
      outputRef,
      shouldScrollRef,
      pendingScrollRef,
      rowCountRef,
      message,
      "rowConsole",
    );
  });
  const unsubscribeLog = window.ipcToMain.messages.log((message: string) => {
    appendGdbMessage(outputRef, shouldScrollRef, pendingScrollRef, rowCountRef, message, "rowLog");
  });
  const unsubscribeError = window.ipcToMain.messages.error((message: string) => {
    appendGdbMessage(
      outputRef,
      shouldScrollRef,
      pendingScrollRef,
      rowCountRef,
      message,
      "rowError",
    );
  });
  const unsubscribeDebug = window.ipcToMain.messages.debug((message: string) => {
    appendGdbMessage(
      outputRef,
      shouldScrollRef,
      pendingScrollRef,
      rowCountRef,
      message,
      "rowDebug",
    );
  });
  const unsubscribeHtml = window.ipcToMain.messages.html((html: string) => {
    appendGdbHtmlMessage(outputRef, shouldScrollRef, pendingScrollRef, rowCountRef, html);
  });
  return () => {
    unsubscribeConsole();
    unsubscribeLog();
    unsubscribeError();
    unsubscribeDebug();
    unsubscribeHtml();
  };
}
/**
 * Performs useGdbSubscriptions as part of this module's internal workflow.
 *
 * @param outputRef - outputRef parameter.
 * @param shouldScrollRef - shouldScrollRef parameter.
 * @param pendingScrollRef - pendingScrollRef parameter.
 * @param rowCountRef - rowCountRef parameter.
 * @param inputRef - inputRef parameter.
 * @param historyRef - historyRef parameter.
 * @param cmdHistoryRef - cmdHistoryRef parameter.
 * @param setDangerousPrompt - setDangerousPrompt parameter.
 * @returns The computed result produced by this operation.
 */

function useGdbSubscriptions(
  outputRef: { current: HTMLDivElement | null },
  shouldScrollRef: { current: boolean },
  pendingScrollRef: { current: boolean },
  rowCountRef: { current: number },
  inputRef: { current: HTMLInputElement | null },
  historyRef: { current: HTMLSelectElement | null },
  cmdHistoryRef: { current: CommandHistory },
  setDangerousPrompt: (prompt: { commandText: string; reason?: string } | null) => void,
): void {
  useEffect(() => {
    window.ipcToMain.queries.app.getSettings().then((gdb: GdbSettings) => {
      cmdHistoryRef.current.clearHistory();
      gdb.command?.history?.forEach((cmd: string) => {
        cmdHistoryRef.current.add(cmd);
      });
    });

    const unsubscribeNotify = window.ipcToMain.notifications.render(
      (msg: NotifyRenderMessage): void => {
        switch (msg?.command) {
          case "command-entry":
            if (inputRef.current) inputRef.current.focus();
            break;
          case "confirm-dangerous-command": {
            const data = msg.data as { commandText: string; reason?: string };
            setDangerousPrompt({ commandText: data?.commandText ?? "", reason: data?.reason });
            break;
          }
        }
      },
    );

    const unsubscribeMessages = subscribeMessageChannels({
      outputRef,
      shouldScrollRef,
      pendingScrollRef,
      rowCountRef,
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
      unsubscribeMessages();
      if (historyElement) historyElement.ondblclick = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
/**
 * Performs useGdbKeyboardHandlers as part of this module's internal workflow.
 *
 * @param inputRef - inputRef parameter.
 * @param historyRef - historyRef parameter.
 * @param sendCommand - sendCommand parameter.
 * @returns The computed result produced by this operation.
 */

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
/**
 * Performs useGdbCommandController as part of this module's internal workflow.
 *
 * @returns The computed result produced by this operation.
 */

export function useGdbCommandController() {
  const cmdHistoryRef = useRef<CommandHistory>(new CommandHistory());
  const outputRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const historyRef = useRef<HTMLSelectElement | null>(null);
  const shouldScrollRef = useRef(true);
  const pendingScrollRef = useRef(false);
  const rowCountRef = useRef(0);
  const [dangerousPrompt, setDangerousPrompt] = useState<{
    commandText: string;
    reason?: string;
  } | null>(null);

  const { sendCommand, hideHistory, showHistory } = useGdbCommandHistory(
    cmdHistoryRef,
    inputRef,
    historyRef,
  );
  useGdbSubscriptions(
    outputRef,
    shouldScrollRef,
    pendingScrollRef,
    rowCountRef,
    inputRef,
    historyRef,
    cmdHistoryRef,
    setDangerousPrompt,
  );
  const { onSelectKeydownHandler, onInputKeyupHandler, onInputKeydownHandler } =
    useGdbKeyboardHandlers(inputRef, historyRef, sendCommand, hideHistory, showHistory);

  const onScrollHandler = useCallback(() => {
    if (pendingScrollRef.current) return;
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
    pendingScrollRef.current = false;
    rowCountRef.current = 0;
  }, []);

  const onDangerousCommandResponse = useCallback((response: DangerousCommandResponse) => {
    setDangerousPrompt(null);
    window.ipcToMain.commands.debugger.respondToDangerousCommand(response);
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
    dangerousPrompt,
    onDangerousCommandResponse,
  };
}
