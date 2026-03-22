/**
 * WSL-based connector that launches idf.py gdb in MI mode.
 */
import { ChildProcess, spawn } from "child_process";
import { ConnectionNotifier } from "../../utilities/ConnectionNotifier";
import { GdbConnector, OutputAvailableEventArgs } from "./gdb-connector";
import { SelectedConnection } from "../../../common/gdb-common";
import { gdbStateDatabase } from "../gdb-state-database/gdbStateDatabase";
import { NormalizedConnection } from "../../../renderer/Dialogs/useConnectionManagerController";

export class gdbConnectorIdfOnWsl extends GdbConnector {
  private gdbExe: ChildProcess | null = null;
  private gdbDB: gdbStateDatabase;

  constructor(db: gdbStateDatabase) {
    super();
    this.gdbDB = db;
  }

  override Start(selectedConnection: SelectedConnection): boolean {
    // Bootstrap the shell and then launch gdb in MI mode.
    const cmds = [];
    cmds.push(`echo '${ConnectionNotifier.shellRunning}'`);

    const lastCmd = selectedConnection.commands.pop();
    if (selectedConnection.commands.length > 0) {
      cmds.push(...selectedConnection.commands);
    }

    cmds.push(`echo '${ConnectionNotifier.runningCommandsComplete}'`);

    if (lastCmd) {
      cmds.push(lastCmd);
    }

    ConnectionNotifier.getInstance().notifyGdbStartup("starting-shell", "in-progress");

    if (selectedConnection.shell === "wsl") {
      this.gdbDB.gdbSrcFileCache.setFilePrefix(
        "//wsl$/" + (selectedConnection as NormalizedConnection).wslDistribution,
      );
    }

    this.gdbExe = spawn(selectedConnection.shell, undefined, {
      cwd: "",
      shell: false,
      windowsHide: true,
    });
    console.log(`Spawned ${selectedConnection.shell} process with PID: ${this.gdbExe.pid}`);

    //TODO: handle errors when starting the process (e.g. wsl not installed, command fails, etc.)

    cmds.forEach((cmd) => {
      this.Send(cmd + "\n");
    });

    this.gdbExe.on("close", (code, signal) => {
      console.log(`Child process exited with code ${code} and signal ${signal}`);
      this.emit("gdb-end", code, signal);
    });

    this.gdbExe.stdout?.on("data", (data: Uint8Array): void => {
      const text = new TextDecoder().decode(data);
      console.log(`GDB Output: ${text}`);
      if (ConnectionNotifier.getInstance().isWatchingConsole() && "~@&^*=+".includes(text[0])) {
        ConnectionNotifier.getInstance().endWatchingConsole();
        ConnectionNotifier.getInstance().notifyGdbStartup("target-running", "completed");
      }

      if (ConnectionNotifier.getInstance().isWatchingConsole()) {
        ConnectionNotifier.getInstance().consoleCapture(false, text);
        return;
      }

      this.emit("gdb-data", new OutputAvailableEventArgs(text));
    });

    this.gdbExe.stderr?.on("data", (data: Uint8Array): void => {
      const text = new TextDecoder().decode(data);
      // console.log(`GDB Error: ${text}`);
      if (ConnectionNotifier.getInstance().isWatchingConsole()) {
        ConnectionNotifier.getInstance().consoleCapture(true, text);
        return;
      }

      this.emit("gdb-error", new OutputAvailableEventArgs(text));
    });

    return true;
  }

  override Send(data: string): void {
    this.gdbExe?.stdin?.cork();
    this.gdbExe?.stdin?.write(data + "\n", (_error) => {
      // if (error) {
      //   console.error(`>>  ${data} > Error: ${error}`);
      // } else {
      //   console.log(`>>  ${data}`);
      // }
      this.emit("gdb-input", data);
    });
    this.gdbExe?.stdin?.uncork();
  }

  override End(): boolean {
    return this.gdbExe?.kill() ?? false;
  }

  override IsRunning(): boolean {
    return this.gdbExe?.exitCode === null;
  }
}
