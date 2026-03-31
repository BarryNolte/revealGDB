import { mainWindow } from "../main";
import { MiOutputHost } from "./mi-output-types";

export class MiExecAsyncHandler {
  private readonly rgxExecAsyncRecord: RegExp = /^\*(?<result>[^,]*),?(?<data>.*)?$/;
  private readonly rgxThreadIdExtractor: RegExp = /thread-id="(?<tid>[^"]*)"/;
  private readonly rgxStoppedThreadsExtractor: RegExp =
    /stopped-threads="(?<stoppedThreads>[^"]*)"/;
  // private readonly rgxCoreExtractor: RegExp = /core="(?<core>[^"]*)"/;
  private readonly rgxReasonExtractor: RegExp = /reason="(?<reason>[^"]*)"/;
  //private readonly rgxBphExtractor: RegExp =
  //  /disp="(?<disp>[^"]*)",bkptno="(?<bkptno>[^"]*)",frame={(?<frame>[^}]*)}/;

  constructor(private readonly host: MiOutputHost) {}

  parseExecAsyncRecord(output: string): boolean {
    const chunks = this.rgxExecAsyncRecord.exec(output);

    const result = chunks?.groups?.result || "";
    const data = chunks?.groups?.data || "";

    switch (result) {
      case "running": {
        const tid = this.rgxThreadIdExtractor.exec(data)?.groups?.tid || undefined;

        this.host.gdbDB.startThreads(tid);
        mainWindow.webContents.send("notify-render", { command: "status-running" });
        break;
      }
      case "stopped": {
        const tid = this.rgxThreadIdExtractor.exec(data)?.groups?.tid || undefined;
        const stoppedThreads =
          this.rgxStoppedThreadsExtractor.exec(data)?.groups?.stoppedThreads || undefined;
        // const core = this.rgxCoreExtractor.exec(data)?.groups?.core || undefined;
        const reason = this.rgxReasonExtractor.exec(data)?.groups?.reason || undefined;

        // console.log(
        //   `ExecAsyncRecord (stopped): ${reason} ${tid} ${stoppedThreads} ${core} \n${data}`,
        // );

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
          case "watchpoint-trigger":
          case "read-watchpoint-trigger":
          case "access-watchpoint-trigger":
          case "function-finished":
          case "location-reached":
          case "watchpoint-scope":
          case "exited":
          case "exited-normally":
          case "exited-signalled":
          case "signal-received":
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
        mainWindow.webContents.send("notify-render", { command: "status-stopped" });
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
