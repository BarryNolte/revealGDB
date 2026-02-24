/**
 * WSL-based connector that launches idf.py gdb in MI mode.
 */
import { ChildProcess, spawn } from "child_process";
import { ConnectionNotifier } from "../../utilities/ConnectionNotifier";
import { GdbConnector, OutputAvailableEventArgs } from "./gdb-connector";

export class gdbConnectorIdfOnWsl extends GdbConnector {
  private gdbExe: ChildProcess | null = null;

  constructor() {
    super();
    console.log("GdbConnectorIdfOnWsl");
  }

  override async Start(): Promise<boolean> {
    // Bootstrap the shell and then launch gdb in MI mode.
    const cmds = [
      "echo '(revealGDB) Shell Running (revealGDB)'",
      "cd ~/perftool",
      "source ~/.profile",
      "echo '(revealGDB) (revealGDB)'",
      "idf.py gdb --gdb-commands --interpreter=mi4",
    ];

    ConnectionNotifier.getInstance().notifyGdbStartup("starting-shell", "in-progress");

    this.gdbExe = spawn("wsl", undefined, {
      cwd: "",
      shell: false,
      windowsHide: true,
    });
    console.log(`Spawned WSL process with PID: ${this.gdbExe.pid}`);

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
      console.log(`GDB Error: ${text}`);
      if (ConnectionNotifier.getInstance().isWatchingConsole()) {
        ConnectionNotifier.getInstance().consoleCapture(true, text);
        return;
      }

      this.emit("gdb-error", new OutputAvailableEventArgs(text));
    });

    return await Promise.resolve(true);
  }

  override Send(data: string): void {
    this.gdbExe?.stdin?.write(data + "\n", (error) => {
      if (error) {
        console.error(`>>  ${data} > Error: ${error}`);
      } else {
        console.log(`>>  ${data}`);
      }
      this.emit("gdb-input", data);
    });
  }

  override End(): boolean {
    return this.gdbExe?.kill() ?? false;
  }

  override IsRunning(): boolean {
    return this.gdbExe?.exitCode === null;
  }

  override ConvertFilePath(path: string): string {
    return "//wsl$/Ubuntu-20.04" + path;
  }
}
