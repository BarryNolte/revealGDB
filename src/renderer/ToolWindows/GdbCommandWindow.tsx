import React, { Component, KeyboardEvent } from "react";

import { GdbAny } from "../../common/gdb-common";
import { CommandHistory } from "../utilities/CommandHistory";
import "./GdbCommandWindow.css";

export default class GdbCommandWindow extends Component {
  private cmdHistory: CommandHistory = new CommandHistory();
  private outputRef = React.createRef<HTMLDivElement>();
  private inputRef = React.createRef<HTMLInputElement>();
  private historyRef = React.createRef<HTMLSelectElement>();
  private shouldScroll = true;

  override componentDidMount() {
    window.ipcToMain.getSettings().then((gdb: GdbAny) => {
      this.cmdHistory.clearHistory();
      gdb.command.history.forEach((cmd: string) => {
        this.cmdHistory.add(cmd);
      });
    });

    window.ipcToMain.notifyRender((msg: GdbAny) => {
      if (msg?.command === "command-entry") {
        if (this.inputRef.current) {
          this.inputRef.current.focus();
        }
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
  }

  private onSelectKeydownHandler = (args: KeyboardEvent<HTMLSelectElement>) => {
    switch (args.key) {
      case "Escape":
        {
          args.currentTarget.hidden = true;
        }
        break;
      case "Enter":
        {
          args.currentTarget.hidden = true;
          if (this.inputRef.current) {
            this.inputRef.current.value = args.currentTarget.value;
            this.inputRef.current.focus();
          }
        }
        break;
    }
  };

  private onInputKeydownHandler = (args: KeyboardEvent<HTMLInputElement>) => {
    switch (args.key) {
      case "ArrowUp":
        {
          if (this.historyRef.current) {
            this.historyRef.current.options.length = 0;

            for (const item of this.cmdHistory.commandHistory) {
              const option = document.createElement("option");
              option.text = item;
              this.historyRef.current.add(option);
            }

            this.historyRef.current.hidden = false;
            this.historyRef.current.focus();
            this.historyRef.current.options.selectedIndex =
              this.historyRef.current.options.length - 1;
            this.historyRef.current.scrollIntoView(false);
          }
        }
        break;
      case "Escape":
        {
          if (this.historyRef.current) {
            this.historyRef.current.hidden = true;
          }
          this.inputRef.current!.value = "";
          this.cmdHistory.reset();
        }
        break;
      case "Enter":
        {
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

  override render() {
    return (
      <div className={"commandWindow"}>
        <div className={"outputRow"} ref={this.outputRef} onScroll={this.onScrollHandler} />
        <select
          className={"historyRow"}
          ref={this.historyRef}
          title={"Command History"}
          size={15}
          hidden={true}
          onKeyDown={this.onSelectKeydownHandler}
        />
        <input
          className={"inputRow"}
          ref={this.inputRef}
          type="text"
          placeholder={"Type your command here..."}
          onKeyDown={this.onInputKeydownHandler}
        />
      </div>
    );
  }
}
