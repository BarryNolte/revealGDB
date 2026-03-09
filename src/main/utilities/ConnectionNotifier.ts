/**
 * Bridges gdb startup milestones to renderer UI notifications.
 */
import { Step, StepState } from "../../common/gdb-common";
import { mainWindow } from "../main";

export class ConnectionNotifier {
  public static readonly shellRunning: string = "(revealGDB) Shell Running (revealGDB)";
  public static readonly runningCommandsComplete: string =
    "(revealGDB) Commands Complete (revealGDB)";

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
    if (!this.watchingConsole) {
      this.watchingConsole = true;
    }
  }

  public endWatchingConsole(): void {
    if (this.watchingConsole) {
      this.watchingConsole = false;
    }
  }

  public consoleCapture(error: boolean, text: string): void {
    // Normalize partial console output into line-based events.
    text.split("\n").forEach((line) => {
      if (line === ConnectionNotifier.shellRunning) {
        this.notifyGdbStartup("starting-shell", "completed");
        this.notifyGdbStartup("running-commands", "in-progress");
        return;
      } else if (line === ConnectionNotifier.runningCommandsComplete) {
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
