import { Component, createRef, JSX, KeyboardEvent } from "react";

import { GdbAny } from "../../common/gdb-common";
import { CommandHistory } from "../utilities/CommandHistory";
import "./GdbCommandWindow.css";

export default class GdbCommandWindow extends Component {
  private cmdHistory: CommandHistory = new CommandHistory();
  private outputRef = createRef<HTMLDivElement>();
  private inputRef = createRef<HTMLInputElement>();
  private historyRef = createRef<HTMLSelectElement>();
  private shouldScroll = true;

  override componentDidMount() {
    window.ipcToMain.getSettings().then((gdb: GdbAny) => {
      this.cmdHistory.clearHistory();
      gdb.command.history.forEach((cmd: string) => {
        this.cmdHistory.add(cmd);
      });
    });

    window.ipcToMain.notifyRender((msg: GdbAny): void => {
      switch (msg?.command) {
        case "command-entry":
          {
            if (this.inputRef.current) {
              this.inputRef.current.focus();
            }
          }
          break;
      }
    });

    window.ipcToMain.consoleMessage((message: string) => {
      this.appendMessage(message, "rowConsole");
    });

    window.ipcToMain.logMessage((message: string) => {
      this.appendMessage(message, "rowLog");
    });

    window.ipcToMain.errorMessage((message: string) => {
      this.appendMessage(message, "rowError");
    });

    window.ipcToMain.debugMessage((message: string) => {
      this.appendMessage(message, "rowDebug");
    });

    if (this.historyRef.current) {
      this.historyRef.current.ondblclick = (_e: Event) => {
        if (this.historyRef.current) {
          this.historyRef.current.hidden = true;

          if (this.inputRef.current) {
            const selIdx = this.historyRef.current.selectedIndex;
            this.inputRef.current.value = this.historyRef.current.options[selIdx].value;
            this.inputRef.current.focus();
          }
        }
      };
    }
  }

  private onSelectKeydownHandler = (args: KeyboardEvent<HTMLSelectElement>) => {
    switch (args.key) {
      case "Escape":
        {
          if (this.historyRef.current) {
            this.historyRef.current.hidden = true;
          }
        }
        break;
      case "Enter":
        {
          if (this.historyRef.current) {
            this.historyRef.current.hidden = true;
          }

          if (this.inputRef.current) {
            this.inputRef.current.value = args.currentTarget.value;
            this.inputRef.current.focus();
          }
        }
        break;
    }
    args.stopPropagation();
  };

  private onInputKeyupHandler = (args: KeyboardEvent<HTMLInputElement>) => {
    switch (args.key) {
      case "ArrowUp":
        {
          this.historyRef.current?.focus();
        }
        break;
    }
  };

  private onInputKeydownHandler = (args: KeyboardEvent<HTMLInputElement>) => {
    switch (args.key) {
      case "ArrowUp":
        {
          this.ShowHistory();
        }
        break;
      case "Escape":
        {
          this.HideHistory();
        }
        break;
      case "Enter":
        {
          this.SendCommand();
        }
        break;
    }
  };

  private onScrollHandler = () => {
    const cr = this.outputRef.current?.getBoundingClientRect();

    const scrollHeight = this.outputRef.current?.scrollHeight ?? 0;
    const scrollTop = this.outputRef.current?.scrollTop ?? 0;
    const crHeight = cr?.height ?? 0;

    if (scrollHeight - scrollTop - crHeight > crHeight * 0.2) {
      this.shouldScroll = false;
    } else {
      this.shouldScroll = true;
    }
  };

  private onShowHistory = () => {
    if (this.historyRef.current?.hidden === false) {
      this.HideHistory();
    } else {
      this.ShowHistory();
    }
  };

  private onSendCommand = () => {
    this.SendCommand();
  };

  private SendCommand() {
    if (this.inputRef.current) {
      window.ipcToMain.sendGdbCommand(this.inputRef.current.value);
      this.cmdHistory.add(this.inputRef.current.value);
      this.inputRef.current.value = "";
    }

    window.ipcToMain.notifyMain({
      command: "save-cmd-history",
      data: this.cmdHistory.commandHistory,
    });
  }

  private HideHistory() {
    if (this.historyRef.current) {
      this.historyRef.current.hidden = true;
    }
    this.inputRef.current!.value = "";
    this.cmdHistory.reset();
  }

  private ShowHistory() {
    if (this.historyRef.current) {
      this.historyRef.current.options.length = 0;

      for (const item of this.cmdHistory.commandHistory) {
        const option = document.createElement("option");
        option.text = item;
        this.historyRef.current.add(option);
      }

      this.historyRef.current.hidden = false;
      this.historyRef.current.options.selectedIndex = this.historyRef.current.options.length - 1;
      this.historyRef.current.scrollIntoView(false);
      //this.historyRef.current.focus();
    }
  }

  private appendMessage(message: string, type: string): void {
    const sp = document.createElement("span");
    sp.classList.add("defaultRow");
    const br = document.createElement("br");
    this.outputRef.current?.appendChild(sp);

    if (message === "") {
      message = "\u00A0";
    }

    sp.classList.add(type);

    sp.appendChild(document.createTextNode(message));
    this.outputRef.current?.appendChild(br);
    if (this.shouldScroll) {
      br.scrollIntoView();
      if (this.outputRef.current) {
        this.outputRef.current.scrollLeft = 0;
      }
    }
  }

  override render(): JSX.Element {
    return (
      <div className={"commandWindow full-size"}>
        <div className={"outputRow"} ref={this.outputRef} onScroll={this.onScrollHandler} />
        <div className={"historyRow"}>
          <select
            className={"historySelect"}
            ref={this.historyRef}
            title={"Command History"}
            size={15}
            hidden={true}
            onKeyDown={this.onSelectKeydownHandler}
          />
        </div>
        <div className="inputContainer">
          <input
            className={"inputRow"}
            ref={this.inputRef}
            type="text"
            spellCheck={false}
            placeholder={"Type your command here..."}
            onKeyDown={this.onInputKeydownHandler}
            onKeyUp={this.onInputKeyupHandler}
          />
          <button
            className="commandButton commandButtonSend"
            title="Send Command"
            type="button"
            onClick={this.onSendCommand}
          />
          <button
            className="commandButton commandButtonHistory"
            title="History"
            type="button"
            onClick={this.onShowHistory}
          />
        </div>
      </div>
    );
  }
}
