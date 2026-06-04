/**
 * Implements mi notify handler logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `MiNotifyAsyncHandler`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { IPC_CHANNELS } from "../../common/ipc-contracts";
import { sendToRenderer } from "../ipc-sender";
import { formatGeneralError } from "../utilities/html-error-formatter";
import { mapRegexGroupsToBreakpoint } from "./mappers/breakpoint-mapper";
import { MiOutputHost /*, gdbShowSourceInfo */ } from "./mi-output-types";
import { HTML_STREAM, LOG_STREAM } from "./mi-stream-events";

export class MiNotifyAsyncHandler {
  private readonly rgxNotify: RegExp = /^=(?<cmd>.*?),(?<data>.*$)/;
  private readonly rgxParamValue: RegExp = /^param="(?<cmdParam>.*?)",value="(?<value>.*?)"$/;
  private readonly rgxBkpt: RegExp =
    /^bkpt={number="(?<number>[^"]*)",type="(?<type>[^"]*)",disp="(?<disp>[^"]*)",enabled="(?<enabled>[^"]*)",addr="(?<addr>[^"]*)"(,func="(?<func>[^"]*)")?,file="(?<file>[^"]*)",fullname="(?<fullname>[^"]*)",line="(?<line>[^"]*)",thread-groups=\[(?<tg>[^\]]*)\],times="(?<times>[^"]*)",(installed="(?<installed>[^"]*)",)?original-location="(?<orgloc>[^"]*)"}$/;
  private readonly rgxThreadGroupId: RegExp = /id="(?<id>[^"]+)"/;
  private readonly rgxThreadGroupIdPid: RegExp = /^id="(?<id>[^"]*)",pid="(?<pid>[^"]*)"$/;
  private readonly rgxThreadGroupExited: RegExp = /^id="(?<id>[^"]*)"$/;
  private readonly rgxThreadCreated: RegExp = /^id="(?<id>[^"]*)",group-id="(?<grpid>[^"]*)"$/;
  private readonly rgxThreadExited: RegExp = /^id="(?<id>[^"]*)",group-id="(?<grpid>[^"]*)"$/;
  private readonly rgxThreadSelected: RegExp =
    /frame={level="(?<level>\d*)".*fullname="(?<filename>[^"]*)",line="(?<line>[^"]*)"/;
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
  parseNotifyAsyncRecord(output: string): boolean {
    const chunks = this.rgxNotify.exec(output);
    const cmd = chunks?.groups?.cmd || "";
    const data = chunks?.groups?.data || "";

    if (this.isThreadCommand(cmd)) {
      return this.handleThreadCommand(cmd, data);
    }
    if (this.isBreakpointCommand(cmd)) {
      return this.handleBreakpointCommand(cmd, data);
    }
    return this.handleOtherCommand(cmd, data);
  }

  private isThreadCommand(cmd: string): boolean {
    return cmd.startsWith("thread-");
  }

  private isBreakpointCommand(cmd: string): boolean {
    return cmd.startsWith("breakpoint-");
  }

  private handleThreadGroupCommand(cmd: string, data: string): boolean {
    switch (cmd) {
      case "thread-group-added": {
        const id = this.rgxThreadGroupId.exec(data)?.groups?.id;
        if (id) {
          this.host.gdbDB.addThreadGroup(id);
        }
        this.host.gdbDB.threadUpdateUI();
        return true;
      }
      case "thread-group-started": {
        const id = this.rgxThreadGroupIdPid.exec(data)?.groups?.id;
        if (id) {
          this.host.gdbDB.startThreadGroup(id);
        }
        this.host.gdbDB.threadUpdateUI();
        return true;
      }
      case "thread-group-exited": {
        const id = this.rgxThreadGroupExited.exec(data)?.groups?.id;
        if (id) {
          this.host.gdbDB.stopThreadGroup(id);
        }
        this.host.gdbDB.threadUpdateUI();
        return true;
      }
      case "thread-group-removed": {
        this.host.gdbDB.threadUpdateUI();
        return true;
      }
      default:
        return false;
    }
  }

  private handleThreadCommand(cmd: string, data: string): boolean {
    if (cmd.startsWith("thread-group-")) {
      return this.handleThreadGroupCommand(cmd, data);
    }
    const handlers: Record<string, () => boolean> = {
      "thread-selected": () => this.handleThreadSelected(data),
      "thread-created": () => this.handleThreadCreated(data),
      "thread-exited": () => this.handleThreadExited(data),
    };
    return handlers[cmd]?.() ?? false;
  }

  private handleThreadSelected(data: string): boolean {
    const groups = this.rgxThreadSelected.exec(data)?.groups;
    if (groups?.level) {
      this.host.gdbDB.setActiveFrame(parseInt(groups.level, 10));
    }
    this.host.gdbDB.stackUpdateUI();

    if (groups?.filename && groups?.line) {
      void (async () => {
        const contents = await this.host.gdbDB.getSourceFileContents(groups.filename);
        sendToRenderer(IPC_CHANNELS.mainToRenderer.debuggerData.sourceFile, {
          fileName: groups.filename,
          line: parseInt(groups.line, 10),
          contents,
        });
      })();
    }
    return true;
  }

  private handleThreadCreated(data: string): boolean {
    const groups = this.rgxThreadCreated.exec(data)?.groups;
    if (groups?.id && groups?.grpid) {
      this.host.gdbDB.createThread(groups.id, groups.grpid);
    }
    this.host.gdbDB.threadUpdateUI();
    return true;
  }

  private handleThreadExited(data: string): boolean {
    const id = this.rgxThreadExited.exec(data)?.groups?.id;
    if (id) {
      this.host.gdbDB.deleteThread(id);
    }
    this.host.gdbDB.threadUpdateUI();
    return true;
  }

  private handleBreakpointCommand(cmd: string, data: string): boolean {
    switch (cmd) {
      case "breakpoint-created": {
        const groups = this.rgxBkpt.exec(data)?.groups;
        if (!groups) {
          return false;
        }
        this.host.gdbDB.createBreakpoint(mapRegexGroupsToBreakpoint(groups));
        this.host.gdbDB.breakpointsUpdateUI();
        return true;
      }
      case "breakpoint-modified": {
        const groups = this.rgxBkpt.exec(data)?.groups;
        if (!groups) {
          return false;
        }
        // console.log(`Breakpoint modified: ${groups.number}`);
        this.host.gdbDB.updateBreakpoint(mapRegexGroupsToBreakpoint(groups));
        this.host.gdbDB.breakpointsUpdateUI();
        return true;
      }
      case "breakpoint-deleted": {
        const id = this.rgxBreakpointDeleted.exec(data)?.groups?.id;
        if (id) {
          this.host.gdbDB.deleteBreakpoint(id);
        }
        // console.log(`Breakpoint deleted: ${id}`);
        this.host.gdbDB.breakpointsUpdateUI();
        return true;
      }
      default:
        return false;
    }
  }

  private handleLibraryCommand(cmd: string, data: string): boolean {
    const id = this.rgxLibraryId.exec(data)?.groups?.id || "";
    const targetName = this.rgxLibraryTargetName.exec(data)?.groups?.targetName || "";
    const hostName = this.rgxLibraryHostName.exec(data)?.groups?.hostName || "";
    const threadGroup = this.rgxLibraryThreadGroup.exec(data)?.groups?.threadGroup || "";
    this.host.emit(
      LOG_STREAM,
      `=${cmd} id="${id}" target-name="${targetName}" host-name="${hostName}" thread-group="${threadGroup}"`,
    );
    return true;
  }

  private handleTraceframeChanged(data: string): void {
    if (data === "end") {
      this.host.emit(LOG_STREAM, `=traceframe-changed end`);
    } else {
      const num = this.rgxTraceframeNum.exec(data)?.groups?.num || "";
      const tracepoint = this.rgxTraceframeTracepoint.exec(data)?.groups?.tracepoint || "";
      this.host.emit(LOG_STREAM, `=traceframe-changed num=${num} tracepoint=${tracepoint}`);
    }
  }

  private handleTsvCreated(data: string): void {
    const name = this.rgxTsvName.exec(data)?.groups?.name || "";
    const initial = this.rgxTsvInitial.exec(data)?.groups?.initial || "";
    this.host.emit(LOG_STREAM, `=tsv-created name=${name} initial=${initial}`);
  }

  private handleTsvDeleted(data: string): void {
    const name = this.rgxTsvName.exec(data)?.groups?.name;
    const nameStr = name !== undefined ? ` name=${name}` : "";
    this.host.emit(LOG_STREAM, `=tsv-deleted${nameStr}`);
  }

  private handleTsvModified(data: string): void {
    const name = this.rgxTsvName.exec(data)?.groups?.name || "";
    const initial = this.rgxTsvInitial.exec(data)?.groups?.initial || "";
    const current = this.rgxTsvCurrent.exec(data)?.groups?.current;
    const currentStr = current !== undefined ? ` current=${current}` : "";
    this.host.emit(LOG_STREAM, `=tsv-modified name=${name} initial=${initial}${currentStr}`);
  }

  private handleTsvCommand(cmd: string, data: string): boolean {
    switch (cmd) {
      case "traceframe-changed":
        this.handleTraceframeChanged(data);
        return true;
      case "tsv-created":
        this.handleTsvCreated(data);
        return true;
      case "tsv-deleted":
        this.handleTsvDeleted(data);
        return true;
      case "tsv-modified":
        this.handleTsvModified(data);
        return true;
      default:
        return false;
    }
  }

  private handleCmdParamChanged(data: string): void {
    const groups = this.rgxParamValue.exec(data)?.groups;
    if (groups?.cmdParam && groups?.value) {
      this.host.gdbDB.addParam(groups.cmdParam, groups.value);
    }
  }

  private handleMemoryChanged(data: string): void {
    const threadGroup = this.rgxMemoryThreadGroup.exec(data)?.groups?.threadGroup || "";
    const addr = this.rgxMemoryAddr.exec(data)?.groups?.addr || "";
    const len = this.rgxMemoryLen.exec(data)?.groups?.len || "";
    const type = this.rgxMemoryType.exec(data)?.groups?.type;
    const typeStr = type !== undefined ? ` type="${type}"` : "";
    this.host.emit(
      LOG_STREAM,
      `=memory-changed thread-group=${threadGroup} addr="${addr}" len="${len}"${typeStr}`,
    );
  }

  private handleRecordStarted(data: string): void {
    const threadGroup = this.rgxRecordThreadGroup.exec(data)?.groups?.threadGroup || "";
    const method = this.rgxRecordMethod.exec(data)?.groups?.method || "";
    const format = this.rgxRecordFormat.exec(data)?.groups?.format;
    const formatStr = format !== undefined ? ` format="${format}"` : "";
    this.host.emit(
      LOG_STREAM,
      `=record-started thread-group="${threadGroup}" method="${method}"${formatStr}`,
    );
  }

  private handleRecordStopped(data: string): void {
    const threadGroup = this.rgxRecordThreadGroup.exec(data)?.groups?.threadGroup || "";
    this.host.emit(LOG_STREAM, `=record-stopped thread-group="${threadGroup}"`);
  }

  private handleOtherCommand(cmd: string, data: string): boolean {
    if (cmd.startsWith("library-")) {
      return this.handleLibraryCommand(cmd, data);
    }
    if (cmd.startsWith("tsv-") || cmd === "traceframe-changed") {
      return this.handleTsvCommand(cmd, data);
    }
    switch (cmd) {
      case "cmd-param-changed":
        this.handleCmdParamChanged(data);
        return true;
      case "memory-changed":
        this.handleMemoryChanged(data);
        return true;
      case "record-started":
        this.handleRecordStarted(data);
        return true;
      case "record-stopped":
        this.handleRecordStopped(data);
        return true;
      default: {
        this.host.emit(
          HTML_STREAM,
          formatGeneralError("Unknown MI Notify Async Record", `Command: ${cmd}`, `Data: ${data}`),
        );
        return false;
      }
    }
  }
}
