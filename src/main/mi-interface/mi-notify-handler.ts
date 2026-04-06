/**
 * Implements mi notify handler logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `MiNotifyAsyncHandler`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { mainWindow } from "../main";
import { mapRegexGroupsToBreakpoint } from "./mappers/breakpoint-mapper";
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
  private readonly rgxLibraryId: RegExp = /id="(?<id>[^"]*)"/;
  private readonly rgxLibraryTargetName: RegExp = /target-name="(?<targetName>[^"]*)"/;
  private readonly rgxLibraryHostName: RegExp = /host-name="(?<hostName>[^"]*)"/;
  private readonly rgxLibraryThreadGroup: RegExp = /thread-group="(?<threadGroup>[^"]*)"/;
  private readonly rgxMemoryThreadGroup: RegExp = /thread-group=(?<threadGroup>\S+)/;
  private readonly rgxMemoryAddr: RegExp = /addr="(?<addr>[^"]*)"/;
  private readonly rgxMemoryLen: RegExp = /len="(?<len>[^"]*)"/;
  private readonly rgxMemoryType: RegExp = /type="(?<type>[^"]*)"/;
  private readonly rgxRecordThreadGroup: RegExp = /thread-group="(?<threadGroup>[^"]*)"/;
  private readonly rgxRecordMethod: RegExp = /method="(?<method>[^"]*)"/;
  private readonly rgxRecordFormat: RegExp = /format="(?<format>[^"]*)"/;
  private readonly rgxTraceframeNum: RegExp = /num=(?<num>\S+)/;
  private readonly rgxTraceframeTracepoint: RegExp = /tracepoint=(?<tracepoint>\S+)/;
  private readonly rgxTsvName: RegExp = /name=(?<name>\S+)/;
  private readonly rgxTsvInitial: RegExp = /initial=(?<initial>\S+)/;
  private readonly rgxTsvCurrent: RegExp = /current=(?<current>\S+)/;

  constructor(private readonly host: MiOutputHost) {}

  /**
   * Parses input into notify async record data.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications. Performs asynchronous work and should be used with completion ordering in mind.
   *
   * @param output - Value for `output` consumed by this operation.
   * @returns A promise that resolves with the computed result after asynchronous processing completes.
   */
  async parseNotifyAsyncRecord(output: string): Promise<boolean> {
    const chunks = this.rgxNotify.exec(output);

    const cmd = chunks?.groups?.cmd || "";
    const data = chunks?.groups?.data || "";

    switch (cmd) {
      case "thread-group-added": {
        const id = this.rgxThreadGroupId.exec(data)?.groups?.id;
        if (id) {
          this.host.gdbDB.addThreadGroup(id);
        }
        this.host.gdbDB.threadUpdateUI();
        break;
      }
      case "thread-group-started": {
        const id = this.rgxThreadGroupIdPid.exec(data)?.groups?.id;
        if (id) {
          this.host.gdbDB.startThreadGroup(id);
        }
        this.host.gdbDB.threadUpdateUI();
        break;
      }
      case "thread-group-exited": {
        const id = this.rgxThreadGroupExited.exec(data)?.groups?.id;
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
        const groups = this.rgxThreadCreated.exec(data)?.groups;
        if (groups?.id && groups?.grpid) {
          this.host.gdbDB.createThread(groups.id, groups.grpid);
        }
        this.host.gdbDB.threadUpdateUI();
        break;
      }
      case "thread-exited": {
        const id = this.rgxThreadExited.exec(data)?.groups?.id;
        if (id) {
          this.host.gdbDB.deleteThread(id);
        }
        this.host.gdbDB.threadUpdateUI();
        break;
      }
      case "thread-selected": {
        const level: number = parseInt(this.rgxThreadSelected.exec(data)?.groups?.level || "0");

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
        const groups = this.rgxParamValue.exec(data)?.groups;
        if (groups?.cmdParam && groups?.value) {
          this.host.gdbDB.addParam(groups.cmdParam, groups.value);
        }
        break;
      }
      case "breakpoint-created": {
        const groups = this.rgxBkpt.exec(data)?.groups;
        if (!groups) {
          return false;
        }
        this.host.gdbDB.createBreakpoint(mapRegexGroupsToBreakpoint(groups));
        this.host.gdbDB.breakpointsUpdateUI();
        break;
      }
      case "breakpoint-modified": {
        const groups = this.rgxBkpt.exec(data)?.groups;
        if (!groups) {
          return false;
        }
        this.host.gdbDB.updateBreakpoint(mapRegexGroupsToBreakpoint(groups));
        this.host.gdbDB.breakpointsUpdateUI();
        break;
      }
      case "breakpoint-deleted": {
        const id = this.rgxBreakpointDeleted.exec(data)?.groups?.id;
        if (id) {
          this.host.gdbDB.deleteBreakpoint(id);
        }
        this.host.gdbDB.breakpointsUpdateUI();
        break;
      }
      case "library-loaded": {
        const id = this.rgxLibraryId.exec(data)?.groups?.id || "";
        const targetName = this.rgxLibraryTargetName.exec(data)?.groups?.targetName || "";
        const hostName = this.rgxLibraryHostName.exec(data)?.groups?.hostName || "";
        const threadGroup = this.rgxLibraryThreadGroup.exec(data)?.groups?.threadGroup || "";
        this.host.emit(
          "log-stream",
          `=library-loaded id="${id}" target-name="${targetName}" host-name="${hostName}" thread-group="${threadGroup}"`,
        );
        break;
      }
      case "library-unloaded": {
        const id = this.rgxLibraryId.exec(data)?.groups?.id || "";
        const targetName = this.rgxLibraryTargetName.exec(data)?.groups?.targetName || "";
        const hostName = this.rgxLibraryHostName.exec(data)?.groups?.hostName || "";
        const threadGroup = this.rgxLibraryThreadGroup.exec(data)?.groups?.threadGroup || "";
        this.host.emit(
          "log-stream",
          `=library-unloaded id="${id}" target-name="${targetName}" host-name="${hostName}" thread-group="${threadGroup}"`,
        );
        break;
      }
      case "memory-changed": {
        const threadGroup = this.rgxMemoryThreadGroup.exec(data)?.groups?.threadGroup || "";
        const addr = this.rgxMemoryAddr.exec(data)?.groups?.addr || "";
        const len = this.rgxMemoryLen.exec(data)?.groups?.len || "";
        const type = this.rgxMemoryType.exec(data)?.groups?.type;
        const typeStr = type !== undefined ? ` type="${type}"` : "";
        this.host.emit(
          "log-stream",
          `=memory-changed thread-group=${threadGroup} addr="${addr}" len="${len}"${typeStr}`,
        );
        break;
      }
      case "record-started": {
        const threadGroup = this.rgxRecordThreadGroup.exec(data)?.groups?.threadGroup || "";
        const method = this.rgxRecordMethod.exec(data)?.groups?.method || "";
        const format = this.rgxRecordFormat.exec(data)?.groups?.format;
        const formatStr = format !== undefined ? ` format="${format}"` : "";
        this.host.emit(
          "log-stream",
          `=record-started thread-group="${threadGroup}" method="${method}"${formatStr}`,
        );
        break;
      }
      case "record-stopped": {
        const threadGroup = this.rgxRecordThreadGroup.exec(data)?.groups?.threadGroup || "";
        this.host.emit("log-stream", `=record-stopped thread-group="${threadGroup}"`);
        break;
      }
      case "traceframe-changed": {
        if (data === "end") {
          this.host.emit("log-stream", `=traceframe-changed end`);
        } else {
          const num = this.rgxTraceframeNum.exec(data)?.groups?.num || "";
          const tracepoint = this.rgxTraceframeTracepoint.exec(data)?.groups?.tracepoint || "";
          this.host.emit("log-stream", `=traceframe-changed num=${num} tracepoint=${tracepoint}`);
        }
        break;
      }
      case "tsv-created": {
        const name = this.rgxTsvName.exec(data)?.groups?.name || "";
        const initial = this.rgxTsvInitial.exec(data)?.groups?.initial || "";
        this.host.emit("log-stream", `=tsv-created name=${name} initial=${initial}`);
        break;
      }
      case "tsv-deleted": {
        const name = this.rgxTsvName.exec(data)?.groups?.name;
        const nameStr = name !== undefined ? ` name=${name}` : "";
        this.host.emit("log-stream", `=tsv-deleted${nameStr}`);
        break;
      }
      case "tsv-modified": {
        const name = this.rgxTsvName.exec(data)?.groups?.name || "";
        const initial = this.rgxTsvInitial.exec(data)?.groups?.initial || "";
        const current = this.rgxTsvCurrent.exec(data)?.groups?.current;
        const currentStr = current !== undefined ? ` current=${current}` : "";
        this.host.emit("log-stream", `=tsv-modified name=${name} initial=${initial}${currentStr}`);
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
