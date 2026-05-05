/**
 * Implements mi exec handler logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `MiExecAsyncHandler`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { sendToRenderer } from "../ipc-sender";
import { MiOutputHost } from "./mi-output-types";

export class MiExecAsyncHandler {
  private readonly rgxExecAsyncRecord: RegExp = /^\*(?<result>[^,]*),?(?<data>.*)?$/;
  private readonly rgxThreadIdExtractor: RegExp = /thread-id="(?<tid>[^"]*)"/;
  private readonly rgxStoppedThreadsExtractor: RegExp =
    /stopped-threads="(?<stoppedThreads>[^"]*)"/;
  private readonly rgxCoreExtractor: RegExp = /core="(?<core>[^"]*)"/;
  private readonly rgxReasonExtractor: RegExp = /reason="(?<reason>[^"]*)"/;
  private readonly rgxSignalName: RegExp = /signal-name="(?<signalName>[^"]*)"/;
  private readonly rgxSignalMeaning: RegExp = /signal-meaning="(?<signalMeaning>[^"]*)"/;
  private readonly rgxExitCode: RegExp = /exit-code="(?<exitCode>[^"]*)"/;

  constructor(private readonly host: MiOutputHost) {}

  /**
   * Parses input into exec async record data.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param output - Value for `output` consumed by this operation.
   * @returns True when the operation succeeds; otherwise false.
   */
  parseExecAsyncRecord(output: string): boolean {
    const chunks = this.rgxExecAsyncRecord.exec(output);

    const result = chunks?.groups?.result || "";
    const data = chunks?.groups?.data || "";

    switch (result) {
      case "running": {
        const tid = this.rgxThreadIdExtractor.exec(data)?.groups?.tid || undefined;

        this.host.gdbDB.startThreads(tid);
        sendToRenderer("notify-render", { command: "status-running" });
        break;
      }
      case "stopped": {
        const tid = this.rgxThreadIdExtractor.exec(data)?.groups?.tid || undefined;
        const stoppedThreads =
          this.rgxStoppedThreadsExtractor.exec(data)?.groups?.stoppedThreads || undefined;
        const core = this.rgxCoreExtractor.exec(data)?.groups?.core || undefined;
        const reason = this.rgxReasonExtractor.exec(data)?.groups?.reason || undefined;

        switch (reason) {
          case undefined: {
            this.host.gdbDB.stopThreads(tid, stoppedThreads);
            break;
          }
          case "end-stepping-range":
          case "breakpoint-hit": {
            // const bph = this.rgxBphExtractor.exec(data);
            // const disp = bph?.groups?.disp || undefined;
            // const bphBkptno = bph?.groups?.bkptno || undefined;
            // console.log(`ExecAsyncRecord (stopped): ${disp} ${bphBkptno}`);
            break;
          }
          case "exited-signalled": {
            const signalName = this.rgxSignalName.exec(data)?.groups?.signalName || "";
            const signalMeaning = this.rgxSignalMeaning.exec(data)?.groups?.signalMeaning || "";
            this.host.emit(
              "log-stream",
              `*stopped reason="exited-signalled" signal-name="${signalName}" signal-meaning="${signalMeaning}" core="${core}"`,
            );
            break;
          }
          case "signal-received": {
            const signalName = this.rgxSignalName.exec(data)?.groups?.signalName || "";
            const signalMeaning = this.rgxSignalMeaning.exec(data)?.groups?.signalMeaning || "";
            this.host.emit(
              "log-stream",
              `*stopped reason="signal-received" signal-name="${signalName}" signal-meaning="${signalMeaning}" core="${core}"`,
            );
            break;
          }
          case "exited": {
            const exitCode = this.rgxExitCode.exec(data)?.groups?.exitCode || "";
            this.host.emit(
              "log-stream",
              `*stopped reason="exited" exit-code="${exitCode}" core="${core}"`,
            );
            break;
          }
          case "watchpoint-trigger":
          case "read-watchpoint-trigger":
          case "access-watchpoint-trigger":
          case "function-finished":
          case "location-reached":
          case "watchpoint-scope":
          case "exited-normally":
          case "solib-event":
          case "fork":
          case "vfork":
          case "syscall-entry":
          case "syscall-return":
          case "exec":
          case "no-history":
          default:
            break;
        }

        this.host.emit("gdb-stopped");
        sendToRenderer("notify-render", { command: "status-stopped" });
        break;
      }
      default: {
        // console.error(`ExecAsyncRecord (Unknown): ${result} --> ${data}`);
        return false;
      }
    }

    return true;
  }
}
