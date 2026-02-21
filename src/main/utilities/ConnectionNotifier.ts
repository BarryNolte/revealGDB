import { Step, StepState } from "../../common/gdb-common";
import { mainWindow } from "../main";

export class ConnectionNotifier {
  private static instance: ConnectionNotifier;
  private watchingConsole: boolean = false;

  private constructor() {}

  public static getInstance(): ConnectionNotifier {
    if (!ConnectionNotifier.instance) {
      ConnectionNotifier.instance = new ConnectionNotifier();
    }
    return ConnectionNotifier.instance;
  }
  public isWatchingConsole(): boolean {
    return this.watchingConsole;
  }

  public startWatchingConsole(): void {
    console.log("Start watching console");
    console.assert(!this.watchingConsole, "Already watching console");
    if (!this.watchingConsole) {
      this.watchingConsole = true;
    }
  }

  public endWatchingConsole(): void {
    console.log("End watching console");
    console.assert(this.watchingConsole, "Not watching console");
    if (this.watchingConsole) {
      this.watchingConsole = false;
    }
  }

  public consoleCapture(error: boolean, text: string): void {
    text.split("\n").forEach((line) => {
      if (line === "(revealGDB) Shell Running (revealGDB)") {
        this.notifyGdbStartup("starting-shell", "completed");
        this.notifyGdbStartup("running-commands", "in-progress");
        return;
      } else if (line === "(revealGDB) (revealGDB)") {
        this.notifyGdbStartup("running-commands", "completed");
        this.notifyGdbStartup("target-running", "in-progress");
        return;
      }
      mainWindow.webContents.send("connection-status", ["console-capture", { error, line }]);
    });
  }

  public notifyGdbStartup(step: Step, stepState: StepState): void {
    mainWindow.webContents.send("connection-status", ["gdb-startup", step, stepState]);
  }
}
