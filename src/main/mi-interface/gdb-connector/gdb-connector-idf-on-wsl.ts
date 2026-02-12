import { GdbConnector, OutputAvailableEventArgs } from "./gdb-connector";
import { ChildProcess, spawn } from "child_process";

export class gdbConnectorIdfOnWsl extends GdbConnector {
  private gdbExe: ChildProcess | null = null;

  constructor() {
    super();
    console.log("GdbConnectorIdfOnWsl");
  }

  override async Start(): Promise<boolean> {
    //const extraArgs: string[] = await AppSettings.get('connections[0].extraArgs') as string[] ?? [];
    //TODO: figure out how to add arguments to the command line
    const args: string[] = [
      "bash",
      "-c",
      "cd ~/perftool; source ~/.profile; idf.py gdb --gdb-commands --interpreter=mi2",
    ];
    console.log(`ARGS: ${args}`);
    console.log("");

    this.gdbExe = spawn("wsl", args, {
      cwd: "",
      shell: false,
      windowsHide: true,
    });

    this.gdbExe.on("close", (code, signal) => {
      console.log(`Child process exited with code ${code} and signal ${signal}`);
      this.emit("gdb-end", code, signal);
    });

    this.gdbExe.stdout?.on("data", (data: Uint8Array) => {
      const text = new TextDecoder().decode(data);
      //console.log("<< " + text);
      this.emit("gdb-data", new OutputAvailableEventArgs(text));
    });

    this.gdbExe.stderr?.on("data", (data: Uint8Array) => {
      const text = new TextDecoder().decode(data);
      //console.log("!! " + text);
      this.emit("gdb-error", new OutputAvailableEventArgs(text));
    });

    return await Promise.resolve(true);
  }

  override Send(data: string): void {
    this.gdbExe?.stdin?.write(data + "\n", (error) => {
      console.log(`>>  ${data} : ${error}`);
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
