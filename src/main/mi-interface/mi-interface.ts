/**
 * GDB MI interface: parse MI output and push structured updates to the UI.
 */
//import { gdbConnectorWsl } from "./gdb-connector/gdb-connector-wsl";
import { EventEmitter } from "events";
import { GdbAny } from "../../common/gdb-common";
import { AppSettings, mainWindow } from "../main";
import { ConnectionNotifier } from "../utilities/ConnectionNotifier";
import { GdbConnector, OutputAvailableEventArgs } from "./gdb-connector/gdb-connector";
import { gdbConnectorIdfOnWsl } from "./gdb-connector/gdb-connector-idf-on-wsl";
import { parseDisasmTokens } from "./gdb-parsers/disasmParser";
import { LocalsContainer } from "./gdb-parsers/gdb-locals";
import { GdbOutputCapture } from "./gdb-parsers/gdb-output-capture";
import { gdbAsmRow, gdbBreakpoint, gdbStateDatabase } from "./gdb-state-database/gdbStateDatabase";

export type gdbShowSourceInfo = {
  fileName: string;
  line: string;
  contents: string | undefined;
};

export class miInterface extends EventEmitter {
  private static lnum: number = 0;
  private conn: GdbConnector | null = null;
  readonly gdbDB: gdbStateDatabase = new gdbStateDatabase();
  // Buffer partial lines until a newline terminator arrives.
  private streamSave: string[] = [];
  // Captures multi-line MI outputs (e.g., symbol files, function list).
  private outputCapture: GdbOutputCapture = new GdbOutputCapture(this.gdbDB);

  constructor() {
    super();
  }

  async connect(): Promise<boolean> {
    ConnectionNotifier.getInstance().startWatchingConsole();
    this.conn = new gdbConnectorIdfOnWsl();

    this.conn.on("gdb-exit", () => {
      console.log("GDB exited");
    });

    this.conn.on("gdb-data", (args: OutputAvailableEventArgs): void => {
      if (AppSettings.getSync("gdb.gui.showDebugInfo") as boolean) {
        this.emit(
          "debug-stream",
          `GDB Data (${miInterface.lnum++}): ${args.Output} ${args.Output.endsWith("\n")}`,
        );
      }

      if (!args.Output.endsWith("\n")) {
        this.streamSave.push(args.Output);
        return;
      }

      let totalStream = "";
      this.streamSave.forEach((s) => {
        totalStream += s;
      });
      this.streamSave = [];
      totalStream += args.Output;

      const lines = totalStream.split("\n");
      lines.forEach(async (line: string) => {
        // console.log(`Raw Output: ${line}`);
        try {
          if (this.outputCapture.CaptureLine(line)) {
            return;
          }
          // console.error(`Raw Output: ${line}`);
          await this.parseRawOutput(line);
        } catch (ex) {
          this.emit(
            "error-stream",
            `\n*************************************\nEXCEPTION: ${ex}\n*************************************\n`,
          );
        }
      });

      return;
    });

    this.conn.on("gdb-input", (input: string) => {
      this.emit("gdb-input", input);
    });

    this.conn.on("gdb-error", (args: OutputAvailableEventArgs) => {
      console.error(`GDB Error: ${args.Output}`);
      //throw new Error(`GDB Error: ${args.Output}`);
    });

    this.on("gdb-idle", () => {
      console.log("GDB is idle");
    });

    return await this.conn.Start();
  }

  send(data: string): void {
    if (AppSettings.getSync("gdb.gui.showDebugInfo") as boolean) {
      this.emit("debug-stream", data);
    }
    this.conn?.Send(data);
  }

  private async parseRawOutput(output: string): Promise<boolean> {
    if (output.length === 0) {
      return true;
    }

    switch (output[0]) {
      case "~":
        await this.parseConsoleStream(output);
        break;
      case "@":
        await this.parseTargetStream(output);
        break;
      case "&":
        await this.parseLogStream(output);
        break;
      case "^":
        await this.parseResultRecord(output);
        break;
      case "*":
        await this.parseExecAsyncRecord(output);
        break;
      case "=":
        await this.parseNotifyAsyncRecord(output);
        break;
      case "+":
        await this.parseStatusAsyncRecord(output);
        break;
      case "(":
        {
          if (output.startsWith("(gdb)")) {
            //console.log("IDLE...");
            this.emit("gdb-idle");
            //this.gdbDB.dump();
          }
        }
        break;
      default: {
        console.error(`Raw Output Type Unknown: ${output}`);
        this.emit("error-stream", output);
        return false;
      }
    }

    return true;
  }

  private parseStatusAsyncRecord(output: string): void {
    console.error(`StatusAsyncRecord: ${output}`);
    throw new Error("Method not implemented.");
  }

  rgxNotify: RegExp = /^=(?<cmd>.*?),(?<data>.*$)/;
  rgxParamValue: RegExp = /^param="(?<cmdParam>.*?)",value="(?<value>.*?)"$/;
  rgxBkpt: RegExp =
    /^bkpt={number="(?<number>[^"]*)",type="(?<type>[^"]*)",disp="(?<disp>[^"]*)",enabled="(?<enabled>[^"]*)",addr="(?<addr>[^"]*)",func="(?<func>[^"]*)",file="(?<file>[^"]*)",fullname="(?<fullname>[^"]*)",line="(?<line>[^"]*)",thread-groups=\[(?<tg>[^\]]*)\],times="(?<times>[^"]*)",(installed="(?<installed>[^"]*)",)?original-location="(?<orgloc>[^"]*)"}$/;
  private async parseNotifyAsyncRecord(output: string): Promise<boolean> {
    const chunks = this.rgxNotify.exec(output);

    const cmd = chunks?.groups?.cmd || "";
    const data = chunks?.groups?.data || "";

    switch (cmd) {
      case "thread-group-added":
        {
          const idChunks = /id="(?<id>[^"]+)"/.exec(data);
          const id = idChunks?.groups?.id;
          if (id) {
            this.gdbDB.addThreadGroup(id);
          }

          mainWindow.webContents.send("data-threads", {
            th: this.gdbDB.threads,
            grp: this.gdbDB.threadGroups,
          });
        }
        break;
      case "thread-group-started":
        {
          const idChunks = /^id="(?<id>[^"]*)",pid="(?<pid>[^"]*)"$/.exec(data);
          const id = idChunks?.groups?.id;
          // const pid = idChunks?.groups?.pid;
          if (id) {
            this.gdbDB.startThreadGroup(id);
          }

          mainWindow.webContents.send("data-threads", {
            th: this.gdbDB.threads,
            grp: this.gdbDB.threadGroups,
          });
        }
        break;
      case "thread-group-exited":
        {
          //TODO: remove all threads from group
          const idChunks = /^id="(?<id>[^"]*)"$/.exec(data);
          const id = idChunks?.groups?.id;

          if (id) {
            this.gdbDB.stopThreadGroup(id);
          }
          mainWindow.webContents.send("data-threads", {
            th: this.gdbDB.threads,
            grp: this.gdbDB.threadGroups,
          });
        }
        break;
      case "thread-group-removed":
        {
          //TODO: remove group from collection
          mainWindow.webContents.send("data-threads", {
            th: this.gdbDB.threads,
            grp: this.gdbDB.threadGroups,
          });
        }
        break;
      case "thread-created":
        {
          const idChunks = /^id="(?<id>[^"]*)",group-id="(?<grpid>[^"]*)"$/.exec(data);
          const id = idChunks?.groups?.id;
          const grpid = idChunks?.groups?.grpid;
          if (id && grpid) {
            this.gdbDB.createThread(id, grpid);
          }

          mainWindow.webContents.send("data-threads", {
            th: this.gdbDB.threads,
            grp: this.gdbDB.threadGroups,
          });
        }
        break;
      case "thread-exited":
        {
          const idChunks = /^id="(?<id>[^"]*)",group-id="(?<grpid>[^"]*)"$/.exec(data);
          const id = idChunks?.groups?.id;
          // const grpid = idChunks?.groups?.grpid;
          if (id) {
            this.gdbDB.deleteThread(id);
          }
        }
        break;
      case "thread-selected":
        {
          // This is received when the stack frame is changed when the process
          // is stopped.
          const idChunks = /frame={level="(?<level>[^"]*)"/g.exec(data);
          const level: number = parseInt(idChunks?.groups?.level || "0");

          this.send("-data-list-register-values x");

          this.gdbDB.setActiveFrame(level);

          const srcFileName = this.gdbDB.stackFrames[level].fullName || "";
          const showSourceInfo: gdbShowSourceInfo = {
            fileName: srcFileName,
            line: this.gdbDB.stackFrames[level].line,
            contents: await this.gdbDB.getSourceFileContents(srcFileName),
          };
          mainWindow.webContents.send("source-file", showSourceInfo);
          mainWindow.webContents.send("stack-frames", this.gdbDB.stackFrames);
        }
        break;
      case "cmd-param-changed":
        {
          const paramChunks = this.rgxParamValue.exec(data);
          const cmdParam = paramChunks?.groups?.cmdParam;
          const value = paramChunks?.groups?.value;
          if (cmdParam && value) {
            this.gdbDB.addParam(cmdParam, value);
          }
        }
        break;
      case "breakpoint-created":
        {
          const idChunks = this.rgxBkpt.exec(data);
          if (!idChunks || !idChunks.groups) {
            return false;
          }
          this.gdbDB.createBreakpoint(idChunks.groups as gdbBreakpoint);
          mainWindow.webContents.send("data-brkpts", this.gdbDB.breakpoints);
        }
        break;
      case "breakpoint-modified":
        {
          const idChunks = this.rgxBkpt.exec(data);
          if (!idChunks || !idChunks.groups) {
            return false;
          }
          this.gdbDB.updateBreakpoint(idChunks.groups as gdbBreakpoint);
          mainWindow.webContents.send("data-brkpts", this.gdbDB.breakpoints);
        }
        break;
      case "breakpoint-deleted":
        {
          const idChunks = /id="(?<id>[^"]+)"/.exec(data);
          const id = idChunks?.groups?.id;
          if (id) {
            this.gdbDB.deleteBreakpoint(id);
          }
          mainWindow.webContents.send("data-brkpts", this.gdbDB.breakpoints);
        }
        break;
      default: {
        console.error(`NotifyAsyncRecord (Unknown): ${cmd} --> ${data}`);
        return false;
      }
    }

    return true;
  }

  private async parseResultRecord(output: string): Promise<boolean> {
    const rgxResultRecord: RegExp = /^\^(?<result>[^,]*),?(?<data>.*)?$/;
    const chunks = rgxResultRecord.exec(output);

    const result = chunks?.groups?.result || "";
    const data = chunks?.groups?.data || "";

    // console.error(result);
    // console.error(data);

    switch (result) {
      case "done":
        {
          const rgxResultList: RegExp = /^(?<result>.*?)=(?<list>.*)$/;
          const resChunks = rgxResultList.exec(data);

          const resResult: string = resChunks?.groups?.result || "";
          const resList: string = resChunks?.groups?.list || "";

          switch (resResult) {
            case "asm_insns":
              {
                const rgxAsmData: RegExp = /asm_insns=\[(?<asm_list>.*)]$/gm;
                const asmData = rgxAsmData.exec(output);
                const asmList = asmData?.groups?.["asm_list"];

                const rgxAsmRow: RegExp =
                  /(?<asm_row>address="(?<address>[^"]*)",func-name="(?<func>[^"]*)",offset="(?<offset>[^"]*)",opcodes="(?<opcodes>[^"]*)",inst="(?<inst>[^"]*)")/gm;
                const asmRows = asmList?.matchAll(rgxAsmRow);

                const asmRowsText: gdbAsmRow[] = [];
                let currentFunc = "";
                let currentFuncFirstAddress = "";

                asmRows?.forEach((asmRow) => {
                  //console.log(asmRow);
                  const address = asmRow.groups?.address || "";
                  const func = asmRow.groups?.func || "";
                  const offset = asmRow.groups?.offset || "";
                  const opcodes = asmRow.groups?.opcodes || "";
                  const inst = asmRow.groups?.inst || "";

                  if (func !== currentFunc) {
                    currentFunc = func;
                    currentFuncFirstAddress = address;
                  }

                  const funcWithAddress = currentFuncFirstAddress
                    ? `${currentFuncFirstAddress}-${func}`
                    : func;

                  const row: gdbAsmRow = {
                    address: address,
                    func: funcWithAddress,
                    offset: offset,
                    opcodes: opcodes,
                    instructions: parseDisasmTokens(inst),
                  };

                  asmRowsText.push(row);
                });

                mainWindow.webContents.send("data-disasm", asmRowsText);
              }
              break;
            case "memory":
              {
                const rgxMemData: RegExp =
                  /\[\{begin="(?<begin>[^"]*)",offset="(?<offset>[^"]*)",end="(?<end>[^"]*)",contents="(?<contents>[^"]*)"\}\]/gm;

                const memData = rgxMemData.exec(output);
                //console.log(memData);

                const hexData = memData?.groups?.contents || "";
                //console.log(hexData);
                const result = [];
                for (let i = 0; i < hexData.length; i += 2) {
                  result.push(hexData.slice(i, i + 2));
                }
                const dataArray = new Uint8Array(result.length);
                result.forEach((byte, idx) => {
                  dataArray[idx] = parseInt(byte, 16);
                });

                mainWindow.webContents.send("data-memory", {
                  begin: memData?.groups?.["begin"],
                  offset: memData?.groups?.["offset"],
                  end: memData?.groups?.["end"],
                  data: dataArray,
                });
              }
              break;
            // deprecated
            // case "addr":
            //   {
            //     const rgxMemPage: RegExp =
            //       /addr="(?<addr>[^"]*)",nr-bytes="(?<nrBytes>[^"]*)",total-bytes="(?<totalBytes>[^"]*)",next-row="(?<nextRow>[^"]*)",prev-row="(?<prevRow>[^"]*)",next-page="(?<nextPage>[^"]*)",prev-page="(?<prevPage>[^"]*)"/g;
            //     const rgxMemData: RegExp =
            //       /\{addr="(?<addr>[^"]*)",data=\[(?<data>[^\]]*)\],ascii="(?<ascii>................)"}/g;
            //     const memPage = rgxMemPage.exec(output);
            //     const memData = resList.replaceAll('\\"', '"').matchAll(rgxMemData);
            //     const memList: ({ [key: string]: string } | undefined)[] = [];
            //     memData.forEach((md) => {
            //       memList.push(md.groups);
            //     });
            //     mainWindow.webContents.send("data-memory", {
            //       page: memPage?.groups,
            //       memList: memList,
            //     });
            //   }
            //   break;
            case "BreakpointTable":
              {
                // const rgxBpHdr: RegExp = /nr_rows="(?<nr_rows>[^"]*)",nr_cols="(?<nr_cols>[^"]*)",hdr=\[(?<hdr>[^\]]*)\],body/g;
                const rgxBps: RegExp =
                  /bkpt={number="(?<number>[^"]*)",type="(?<type>[^"]*)",disp="(?<disp>[^"]*)",enabled="(?<enabled>[^"]*)",addr="(?<addr>[^"]*)",func="(?<func>[^"]*)",file="(?<file>[^"]*)",fullname="(?<fullname>[^"]*)",line="(?<line>[^"]*)",thread-groups=\[(?<tg>[^\]]*)],times="(?<times>[^"]*)",original-location="(?<orgLoc>[^"]*)"/g;
                // const bkptHdr = rgxBpHdr.exec(resList);
                // const rows = bkptHdr?.groups?.nr_rows || '';
                // const cols = bkptHdr?.groups?.nr_cols || '';
                // const hdr = bkptHdr?.groups?.hdr || '';
                const bps = resList.matchAll(rgxBps);
                this.gdbDB.clearBreakpoints();
                bps?.forEach((bkpt) => {
                  this.gdbDB.createBreakpoint(bkpt.groups as gdbBreakpoint);
                });

                mainWindow.webContents.send("data-brkpts", this.gdbDB.breakpoints);
              }
              break;
            case "threads":
              {
                const rgxThreads: RegExp = /\[(?<data>.*)],current-thread-id="(?<curTid>.*)"/g;
                const rgxThreadData: RegExp =
                  /{id="(?<tid>[^"]*)",target-id="(?<targId>[^"]*)",details="(?<details>[^"]*)",frame={level="(?<level>[^"]*)",addr="(?<addr>[^"]*)",func="(?<func>[^"]*)",args=\[(?<args>[^\]]*)\],file="(?<file>[^"]*)",fullname="(?<fullname>[^"]*)",line="(?<line>[^"]*)",arch="(?<arch>[^"]*)"},state="(?<state>[^"]*)"}/g;

                const thVals = rgxThreads.exec(resList);
                const curTid = thVals?.groups?.curTid || "";
                const tData = thVals?.groups?.data || "";
                const tValues = tData.matchAll(rgxThreadData);
                this.gdbDB.clearThreadList();
                tValues.forEach((thread: GdbAny) => {
                  this.gdbDB.addThread({
                    id: thread.groups.tid,
                    targetId: thread.groups.targid,
                    details: thread.groups.details,
                    frame: {
                      level: thread.groups.level,
                      addr: thread.groups.addr,
                      func: thread.groups.func,
                      args: thread.groups.args,
                      file: thread.groups.file,
                      fullName: thread.groups.fullname,
                      line: thread.groups.line,
                      arch: thread.groups.arch,
                    },
                    state: thread.groups.state,
                    active: thread.groups.tid === curTid,
                  });
                });

                mainWindow.webContents.send("data-threads", {
                  th: this.gdbDB.threads,
                  grp: this.gdbDB.threadGroups,
                });
              }
              break;
            case "features":
              {
                const features = resList.split(",");
                features.forEach((feature: string) => {
                  this.gdbDB.addFeature(feature.replaceAll('"', ""));
                });
              }
              break;
            case "register-names":
              {
                const rgxCleanList: RegExp = /\[(?<list>.*)\]/;
                const cleanList = rgxCleanList.exec(resList)?.groups?.list || "";
                const registers = cleanList.split(",");
                registers.forEach((register: string, index: number) => {
                  this.gdbDB.addRegister(index.toString(), register.replaceAll('"', ""));
                });
                mainWindow.webContents.send("data-register", this.gdbDB.registers);
              }
              break;
            case "register-values":
              {
                const rgxRegisterValues: RegExp =
                  /{number="(?<number>[^"]*)",value="(?<value>[^"]*)"}/g;
                const regValues = resList.matchAll(rgxRegisterValues);
                regValues.forEach((regChunks: RegExpExecArray) => {
                  const number = regChunks?.groups?.number;
                  const value = regChunks?.groups?.value;

                  if (number && value) {
                    this.gdbDB.addRegisterValue(number, value);
                  }
                });
                mainWindow.webContents.send("data-register", this.gdbDB.registers);
              }
              break;
            case "stack":
              {
                const rgxFrame: RegExp =
                  /frame={level="(?<level>[^"]*)",addr="(?<addr>[^"]*)",func="(?<func>[^"]*)",file="(?<file>[^"]*)",fullname="(?<fullname>[^"]*)",line="(?<line>[^"]*)",arch="(?<arch>[^"]*)"}/g;
                const frameValues = resList.matchAll(rgxFrame);

                this.gdbDB.clearStackFrames();
                frameValues.forEach((frameChunk: RegExpExecArray) => {
                  this.gdbDB.addStackFrame({
                    active: false,
                    level: frameChunk.groups?.level || "",
                    func: frameChunk.groups?.func || "",
                    addr: frameChunk.groups?.addr || "",
                    //TODO: Include ARGS??
                    args: "",
                    file: frameChunk.groups?.file || "",
                    fullName: frameChunk.groups?.fullname || "",
                    line: frameChunk.groups?.line || "",
                    from: frameChunk.groups?.from || "",
                    arch: frameChunk.groups?.arch || "",
                  });
                });
                this.gdbDB.stackFrames[0].active = true;
                mainWindow.webContents.send("stack-frames", this.gdbDB.stackFrames);

                const srcFileName = this.gdbDB.stackFrames[0].fullName || "";
                const showSourceInfo: gdbShowSourceInfo = {
                  fileName: srcFileName,
                  line: this.gdbDB.stackFrames[0].line,
                  contents: await this.gdbDB.getSourceFileContents(srcFileName),
                };

                mainWindow.webContents.send("source-file", showSourceInfo);
              }
              break;
            case "locals":
            case "variables":
              {
                const lc = new LocalsContainer(resList);
                //console.log(lc.locals);

                mainWindow.webContents.send("data-locals", lc.locals);
              }
              break;
            case "":
              {
                /**
                 * This is a state, but what does it mean?
                 */
                console.error("ResultRecord (empty): ARE WE DONE??");
              }
              break;
            default: {
              console.error(`ResultRecord (Unknown): ${resResult} --> ${resList}`);
              return false;
            }
          }
          console.error(`ResultRecord (done) ${resResult}`);
        }
        break;
      case "running":
        {
          // TODO: This is a state, but what does it mean?
          console.error(`ResultRecord (running): ${data}`);
        }
        break;
      case "connected":
        {
          console.error(`ResultRecord (connected): ${data}`);
        }
        break;
      case "error":
        {
          //  "^error" "," "msg=" c-string [ "," "code=" c-string ]
          const msg = /^msg="(?<msg>.*)"$/.exec(data);
          const msgText = msg?.groups?.msg
            .replaceAll('\\"', '"')
            .replaceAll("\\t", "\t")
            .split("\\n");
          if (msgText) {
            this.emit("error-stream", msgText);
          }
        }
        break;
      case "exit":
        {
          console.error(`ResultRecord (exit): ${data}`);
        }
        break;
      default: {
        console.error(`ResultRecord (Unknown): ${result} --> ${data}`);
        return false;
      }
    }

    return true;
  }
  private parseExecAsyncRecord(output: string): boolean {
    const rgxExecAsyncRecord: RegExp = /^\*(?<result>[^,]*),?(?<data>.*)?$/;
    const chunks = rgxExecAsyncRecord.exec(output);

    const result = chunks?.groups?.result || "";
    const data = chunks?.groups?.data || "";

    switch (result) {
      case "running":
        {
          const tid = /thread-id="(?<tid>[^"]*)"/.exec(data)?.groups?.tid || undefined;

          console.log(`ExecAsyncRecord (running): ${data}`);
          this.gdbDB.startThreads(tid);
          mainWindow.webContents.send("notify-render", { command: "status-running" });
        }
        break;
      case "stopped":
        {
          const tid = /thread-id="(?<tid>[^"]*)"/.exec(data)?.groups?.tid || undefined;
          const stoppedThreads =
            /stopped-threads="(?<stoppedThreads>[^"]*)"/.exec(data)?.groups?.stoppedThreads ||
            undefined;
          const core = /core="(?<core>[^"]*)"/.exec(data)?.groups?.core || undefined;
          const reason = /reason="(?<reason>[^"]*)"/.exec(data)?.groups?.reason || undefined;

          console.log(
            `ExecAsyncRecord (stopped): ${reason} ${tid} ${stoppedThreads} ${core} \n${data}`,
          );

          switch (reason) {
            case undefined:
              {
                this.gdbDB.stopThreads(tid, stoppedThreads);
                // TODO: frame is also available here, if needed
              }
              break;
            case "end-stepping-range":
            case "breakpoint-hit":
              {
                const bph =
                  /disp="(?<disp>[^"]*)",bkptno="(?<bkptno>[^"]*)",frame={(?<frame>[^}]*)}/.exec(
                    data,
                  );
                const disp = bph?.groups?.disp || undefined;
                const bphBkptno = bph?.groups?.bkptno || undefined;
                console.log(`ExecAsyncRecord (stopped): ${disp} ${bphBkptno}`);
              }
              break;
            case "watchpoint-trigger":
            case "read-watchpoint-trigger":
            case "access-watchpoint-trigger":
            case "function-finished":
            case "location-reached":
            case "watchpoint-scope":
            case "exited":
            case "exited-normally":
            case "signal-received":
            case "solib-event":
            case "fork":
            case "vfork":
            case "syscall-entry":
            case "syscall-return":
            case "exec":
            case "no-history":
            default: {
              //   console.error(
              //     `ExecAsyncRecord (stopped): ${reason} ${tid} ${stoppedThreads} ${core} \n${data}`,
              //   );
            }
          }

          console.error(`ExecAsyncRecord (stopped) (${reason})`);
          this.emit("gdb-stopped");
          mainWindow.webContents.send("notify-render", { command: "status-stopped" });
        }
        break;
      default: {
        console.error(`ExecAsyncRecord (Unknown): ${result} --> ${data}`);
        return false;
      }
    }

    return true;
  }
  private parseTargetStream(output: string): boolean {
    this.emit("log-error", `Target Stream: ${output}`);
    return true;
  }

  private parseLogStream(output: string): boolean {
    const rgxLogStream: RegExp = /^&"(?<line>.*?)"$/;
    const chunks = rgxLogStream.exec(output);

    const strLine = chunks?.groups?.line || "";
    if (strLine.endsWith("\\n")) {
      const lines: string[] = strLine.replaceAll('\\"', '"').replaceAll("\\t", "\t").split("\\n");

      if (lines[lines.length - 1] === "") {
        lines.pop();
      }

      lines.forEach((line: string) => {
        this.emit("log-stream", line);
      });
    }

    return true;
  }

  private savedStr: string = "";
  private parseConsoleStream(output: string): boolean {
    // Get just the text between the quotes
    const rgxConsoleStream: RegExp = /^~"(?<line>.*?)"$/;
    const chunks = rgxConsoleStream.exec(output);

    // Save the text, we *may* need it later if it's not terminated with a \n
    const line = chunks?.groups?.line || "";
    this.savedStr += line;

    // If the line is terminated, then do something with it.
    if (this.savedStr.endsWith("\\n")) {
      const lines: string[] = this.savedStr
        .replaceAll('\\"', '"')
        .replaceAll("\\t", "\t")
        .split("\\n");

      // When .split, there is an extra line at the end, e.g. "\n" is two lines,
      // what comes before the terminator, and what is after the terminator.
      if (lines[lines.length - 1] === "") {
        lines.pop();
      }

      // Tell the world about what got sent
      lines.forEach((line: string) => {
        this.emit("console-stream", line);
      });

      // We've sent the collection of lines that have a terminnator,
      // so clear the saved string.
      this.savedStr = "";
    }

    return true;
  }
}
