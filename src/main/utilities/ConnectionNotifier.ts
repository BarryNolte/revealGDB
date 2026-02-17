import { mainWindow } from "../main";

export class ConnectionNotifier {
  private static instance: ConnectionNotifier;

  private constructor() {}

  public static getInstance(): ConnectionNotifier {
    if (!ConnectionNotifier.instance) {
      ConnectionNotifier.instance = new ConnectionNotifier();
    }
    return ConnectionNotifier.instance;
  }

  // Notifications for the UI
  // public notifyConnectionStarted(): void {
  //   mainWindow.webContents.send("connection-status", "started");
  // }
  // public notifyConnectionSuccess(): void {
  //   mainWindow.webContents.send("connection-status", "success");
  // }
  // public notifyConnectionFailure(): void {
  //   mainWindow.webContents.send("connection-status", "failure");
  // }

  public notifyFindingGdb(): void {
    mainWindow.webContents.send("connection-status", "finding-gdb");
  }
  public notifyGdbFound(): void {
    mainWindow.webContents.send("connection-status", "gdb-found");
  }
  public notifyGdbNotFound(): void {
    mainWindow.webContents.send("connection-status", "gdb-not-found");
  }
  public notifyGdbStarting(): void {
    mainWindow.webContents.send("connection-status", "gdb-starting");
  }
  public notifyGdbStarted(): void {
    mainWindow.webContents.send("connection-status", "gdb-started");
  }
  public notifyGdbStartFailed(): void {
    mainWindow.webContents.send("connection-status", "gdb-start-failed");
  }
  public notifyTargetRunning(): void {
    mainWindow.webContents.send("connection-status", "target-running");
  }

  // Letting this class know what is happening
  //
  public outputReceived(): void {
    this.notifyTargetRunning();
  }
}
