import { mainWindow } from "../main";
import { gdbBreakpoint } from "./gdb-state-database/gdbStateDatabase";
import { MiOutputHost, gdbShowSourceInfo } from "./mi-output-types";

export class MiNotifyAsyncHandler {
  private readonly rgxNotify: RegExp = /^=(?<cmd>.*?),(?<data>.*$)/;
  private readonly rgxParamValue: RegExp = /^param="(?<cmdParam>.*?)",value="(?<value>.*?)"$/;
  private readonly rgxBkpt: RegExp =
    /^bkpt={number="(?<number>[^"]*)",type="(?<type>[^"]*)",disp="(?<disp>[^"]*)",enabled="(?<enabled>[^"]*)",addr="(?<addr>[^"]*)",func="(?<func>[^"]*)",file="(?<file>[^"]*)",fullname="(?<fullname>[^"]*)",line="(?<line>[^"]*)",thread-groups=\[(?<tg>[^\]]*)\],times="(?<times>[^"]*)",(installed="(?<installed>[^"]*)",)?original-location="(?<orgloc>[^"]*)"}$/;
  private readonly rgxThreadGroupId: RegExp = /id="(?<id>[^"]+)"/;
  private readonly rgxThreadGroupIdPid: RegExp = /^id="(?<id>[^"]*)",pid="(?<pid>[^"]*)"$/;
  private readonly rgxThreadGroupExited: RegExp = /^id="(?<id>[^"]*)"$/;
  private readonly rgxThreadCreated: RegExp = /^id="(?<id>[^"]*)",group-id="(?<grpid>[^"]*)"$/;
  private readonly rgxThreadExited: RegExp = /^id="(?<id>[^"]*)",group-id="(?<grpid>[^"]*)"$/;
  private readonly rgxThreadSelected: RegExp = /frame={level="(?<level>[^"]*)"/;
  private readonly rgxBreakpointDeleted: RegExp = /id="(?<id>[^"]+)"/;

  constructor(private readonly host: MiOutputHost) {}

  async parseNotifyAsyncRecord(output: string): Promise<boolean> {
    const chunks = this.rgxNotify.exec(output);

    const cmd = chunks?.groups?.cmd || "";
    const data = chunks?.groups?.data || "";

    switch (cmd) {
      case "thread-group-added": {
        const idChunks = this.rgxThreadGroupId.exec(data);
        const id = idChunks?.groups?.id;
        if (id) {
          this.host.gdbDB.addThreadGroup(id);
        }

        this.host.gdbDB.threadUpdateUI();
        break;
      }
      case "thread-group-started": {
        const idChunks = this.rgxThreadGroupIdPid.exec(data);
        const id = idChunks?.groups?.id;
        if (id) {
          this.host.gdbDB.startThreadGroup(id);
        }

        this.host.gdbDB.threadUpdateUI();
        break;
      }
      case "thread-group-exited": {
        const idChunks = this.rgxThreadGroupExited.exec(data);
        const id = idChunks?.groups?.id;

        if (id) {
          this.host.gdbDB.stopThreadGroup(id);
        }
        this.host.gdbDB.threadUpdateUI();
        break;
      }
      case "thread-group-removed": {
        this.host.gdbDB.threadUpdateUI();
        break;
      }
      case "thread-created": {
        const idChunks = this.rgxThreadCreated.exec(data);
        const id = idChunks?.groups?.id;
        const grpid = idChunks?.groups?.grpid;
        if (id && grpid) {
          this.host.gdbDB.createThread(id, grpid);
        }

        this.host.gdbDB.threadUpdateUI();
        break;
      }
      case "thread-exited": {
        const idChunks = this.rgxThreadExited.exec(data);
        const id = idChunks?.groups?.id;
        if (id) {
          this.host.gdbDB.deleteThread(id);
        }
        this.host.gdbDB.threadUpdateUI();
        break;
      }
      case "thread-selected": {
        const idChunks = this.rgxThreadSelected.exec(data);
        const level: number = parseInt(idChunks?.groups?.level || "0");

        this.host.send("-data-list-register-values x");

        this.host.gdbDB.setActiveFrame(level);

        const srcFileName = this.host.gdbDB.stackFrames[level].fullName || "";
        const showSourceInfo: gdbShowSourceInfo = {
          fileName: srcFileName,
          line: this.host.gdbDB.stackFrames[level].line,
          contents: await this.host.gdbDB.getSourceFileContents(srcFileName),
        };
        mainWindow.webContents.send("source-file", showSourceInfo);
        mainWindow.webContents.send("stack-frames", this.host.gdbDB.stackFrames);
        break;
      }
      case "cmd-param-changed": {
        const paramChunks = this.rgxParamValue.exec(data);
        const cmdParam = paramChunks?.groups?.cmdParam;
        const value = paramChunks?.groups?.value;
        if (cmdParam && value) {
          this.host.gdbDB.addParam(cmdParam, value);
        }
        break;
      }
      case "breakpoint-created": {
        const idChunks = this.rgxBkpt.exec(data);
        if (!idChunks || !idChunks.groups) {
          // console.error(`Failed to parse breakpoint-created: ${data}`);
          return false;
        }
        this.host.gdbDB.createBreakpoint(idChunks.groups as gdbBreakpoint);
        this.host.gdbDB.breakpointsUpdateUI();
        break;
      }
      case "breakpoint-modified": {
        const idChunks = this.rgxBkpt.exec(data);
        if (!idChunks || !idChunks.groups) {
          // console.error(`Failed to parse breakpoint-modified: ${data}`);
          return false;
        }
        this.host.gdbDB.updateBreakpoint(idChunks.groups as gdbBreakpoint);
        this.host.gdbDB.breakpointsUpdateUI();
        break;
      }
      case "breakpoint-deleted": {
        const idChunks = this.rgxBreakpointDeleted.exec(data);
        const id = idChunks?.groups?.id;
        if (id) {
          this.host.gdbDB.deleteBreakpoint(id);
        }
        this.host.gdbDB.breakpointsUpdateUI();
        break;
      }
      default: {
        console.error(`NotifyAsyncRecord (Unknown): ${cmd} --> ${data}`);
        return false;
      }
    }

    return true;
  }
}
