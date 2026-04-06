/**
 * Implements gdb connector general logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `gdbConnectorIdfOnWsl`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { ChildProcess, spawn } from "child_process";
import { SelectedConnection } from "../../../common/gdb-common";
import { NormalizedConnection } from "../../../renderer/Dialogs/connectionManagerModel";
import { ConnectionNotifier } from "../../utilities/ConnectionNotifier";
import { gdbStateDatabase } from "../gdb-state-database/gdbStateDatabase";
import { GdbConnector, OutputAvailableEventArgs } from "./gdb-connector";

export class gdbConnectorIdfOnWsl extends GdbConnector {
  private gdbExe: ChildProcess | null = null;
  private gdbDB: gdbStateDatabase;

  constructor(db: gdbStateDatabase) {
    super();
    this.gdbDB = db;
  }

  /**
   * Starts the operation for the current workflow.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param selectedConnection - Value for `selectedConnection` consumed by this operation.
   * @returns True when the operation succeeds; otherwise false.
   */
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
    // console.log(`Spawned ${selectedConnection.shell} process with PID: ${this.gdbExe.pid}`);

    //TODO: handle errors when starting the process (e.g. wsl not installed, command fails, etc.)

    cmds.forEach((cmd) => {
      this.Send(cmd + "\n");
    });

    this.gdbExe.on("close", (code, signal) => {
      this.emit("gdb-end", code, signal);
    });

    this.gdbExe.stdout?.on("data", (data: Uint8Array): void => {
      const text = new TextDecoder().decode(data);
      this.emit("gdb-data", new OutputAvailableEventArgs(text));
    });

    this.gdbExe.stderr?.on("data", (data: Uint8Array): void => {
      const text = new TextDecoder().decode(data);
      this.emit("gdb-error", new OutputAvailableEventArgs(text));
    });

    return true;
  }

  /**
   * Performs send as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param data - Structured payload consumed by this operation.
   */
  override Send(data: string): void {
    this.gdbExe?.stdin?.cork();
    this.gdbExe?.stdin?.write(data + "\n", (_error) => {
      this.emit("gdb-input", data);
    });
    this.gdbExe?.stdin?.uncork();
  }

  /**
   * Performs end as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @returns True when the operation succeeds; otherwise false.
   */
  override End(): boolean {
    return this.gdbExe?.kill() ?? false;
  }

  /**
   * Performs is running as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @returns True when the operation succeeds; otherwise false.
   */
  override IsRunning(): boolean {
    return this.gdbExe?.exitCode === null;
  }
}
