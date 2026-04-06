/**
 * Provides connection notifier utilities used by main-process platform and integration workflows.
 *
 * @remarks
 * Exported symbols include `ConnectionNotifier`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
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

  /**
   * Returns instance from current state.
   *
   * @returns The computed result produced by this operation.
   */
  public static getInstance(): ConnectionNotifier {
    if (!ConnectionNotifier.instance) {
      ConnectionNotifier.instance = new ConnectionNotifier();
    }
    return ConnectionNotifier.instance;
  }

  /**
   * Performs is watching console as part of this module's public API.
   *
   * @returns True when the operation succeeds; otherwise false.
   */
  public isWatchingConsole(): boolean {
    return this.watchingConsole;
  }

  /**
   * Starts watching console for the current workflow.
   */
  public startWatchingConsole(): void {
    if (!this.watchingConsole) {
      this.watchingConsole = true;
    }
  }

  /**
   * Performs end watching console as part of this module's public API.
   */
  public endWatchingConsole(): void {
    if (this.watchingConsole) {
      this.watchingConsole = false;
    }
  }

  /**
   * Performs console capture as part of this module's public API.
   *
   * @param error - Value for `error` consumed by this operation.
   * @param text - Value for `text` consumed by this operation.
   */
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

  /**
   * Performs notify gdb startup as part of this module's public API.
   *
   * @param step - Value for `step` consumed by this operation.
   * @param stepState - Current state object read or updated by this operation.
   */
  public notifyGdbStartup(step: Step, stepState: StepState): void {
    mainWindow.webContents.send("connection-status", ["gdb-startup", step, stepState]);
  }
}
