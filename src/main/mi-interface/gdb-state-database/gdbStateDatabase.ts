import { gdbSourceFileCache } from "./gdbSourceFileCache";

export type gdbFeature = {
  feature: string;
  available: boolean;
};

export type gdbThread = {
  active: boolean;
  id: string;
  targetId: string;
  details: string;
  name: string;
  state: string;
  frame: gdbStackFrame;
};

export type gdbThreadGroup = {
  gid: string;
  threads: Map<string, string>;
};

export type gdbStackFrame = {
  level: string;
  func: string;
  addr: string;
  args: string;
  file: string;
  fullName: string;
  line: string;
  from: string;
  arch: string;
};

export type gdbRegisters = {
  name: string;
  value: string;
  changed: boolean;
};

export type gdbParams = {
  name: string;
  value: string;
};

export type gdbBreakpoint = {
  number: string;
  type: string;
  disp: string;
  enabled: string;
  addr: string;
  func: string;
  file: string;
  fullname: string;
  line: string;
  tg: string;
  times: string;
  orgloc: string;
};

/**
 *
 */
export class gdbStateDatabase {
  readonly threadGroups: Map<string, gdbThreadGroup> = new Map<string, gdbThreadGroup>();
  readonly threads: Map<string, gdbThread> = new Map<string, gdbThread>();
  readonly registers: Map<string, gdbRegisters> = new Map<string, gdbRegisters>();
  readonly features: Map<string, gdbFeature> = new Map<string, gdbFeature>();
  readonly params: Map<string, gdbParams> = new Map<string, gdbParams>();
  readonly breakpoints: Map<string, gdbBreakpoint> = new Map<string, gdbBreakpoint>();
  readonly stackFrames: gdbStackFrame[] = [];

  readonly gdbSrcFileCache: gdbSourceFileCache = new gdbSourceFileCache();

  constructor() {}

  // Source Files
  hasSourceFile(file: string): boolean {
    return this.gdbSrcFileCache.hasSourceFile(file);
  }
  async getSourceFileContents(file: string): Promise<string | undefined> {
    return await this.gdbSrcFileCache.getSourceFileContents(file);
  }

  // Stack Frames
  clearStackFrames(): void {
    this.stackFrames.length = 0;
  }
  addStackFrame(frame: gdbStackFrame): void {
    this.stackFrames.push(frame);
  }

  // Breakpoints
  clearBreakpoints(): void {
    this.breakpoints.clear();
  }
  createBreakpoint(bkpt: gdbBreakpoint): void {
    this.breakpoints.set(bkpt.number, bkpt);
  }
  updateBreakpoint(bkpt: gdbBreakpoint): void {
    this.breakpoints.set(bkpt.number, bkpt);
  }
  deleteBreakpoint(id: string): void {
    this.breakpoints.delete(id);
  }

  // Parameters
  addParam(paramName: string, paramValue: string): void {
    this.params.set(paramName, { name: paramName, value: paramValue });
  }
  getParam(paramName: string): gdbParams | undefined {
    return this.params.get(paramName);
  }

  // Features
  addFeature(feature: string): void {
    this.features.set(feature, { feature: feature, available: true });
  }
  removeFeature(feature: string): void {
    this.features.delete(feature);
  }
  hasFeature(feature: string): boolean {
    return this.features.get(feature)?.available || false;
  }
  featureList(): gdbFeature[] {
    return Array.from(this.features.values());
  }

  // Registers
  addRegister(index: string, regName: string): void {
    this.registers.set(index, { name: regName, value: "", changed: false });
  }
  addRegisterValue(index: string, regValue: string): void {
    const reg = this.registers.get(index);
    this.registers.set(index, {
      name: reg ? reg.name : index,
      value: regValue,
      changed: regValue !== (reg ? reg.value : ""),
    });
  }
  getRegister(index: string): gdbRegisters | undefined {
    return this.registers.get(index);
  }

  // Thread Groups
  addThreadGroup(gid: string): void {
    this.threadGroups.set(gid, { gid: gid, threads: new Map<string, string>() });
  }

  removeThreadGroup(id: string): void {
    this.threadGroups.delete(id);
  }

  getThreadGroup(id: string): gdbThreadGroup | undefined {
    return this.threadGroups.get(id);
  }

  hasThreadGroup(id: string): boolean {
    return this.threadGroups.has(id);
  }

  removeThreadFromGroup(groupId: string, threadId: string): void {
    this.threadGroups.get(groupId)?.threads.delete(threadId);
  }

  startThreadGroup(groupId: string): void {
    this.threadGroups.get(groupId)?.threads.forEach((thread: string) => {
      const th = this.threads.get(thread);
      if (th) {
        th.state = "running";
      }
    });
  }

  stopThreadGroup(groupId: string): void {
    this.threadGroups.get(groupId)?.threads.forEach((thread: string) => {
      this.threads.delete(thread);
    });
  }

  // Threads
  clearThreadList(): void {
    this.threads.clear();
  }

  addThread(arg0: {
    id: string;
    targetId: string;
    details: string;
    frame: {
      level: string;
      addr: string;
      func: string;
      args: string;
      file: string;
      fullName: string;
      line: string;
      arch: string;
    };
    state: string;
    active: boolean;
  }) {
    this.threads.set(arg0.id, {
      active: arg0.active,
      id: arg0.id,
      targetId: arg0.targetId,
      details: arg0.details,
      name: arg0.frame.func,
      state: arg0.state,
      frame: {
        level: arg0.frame.level,
        func: arg0.frame.func,
        addr: arg0.frame.addr,
        args: arg0.frame.args,
        file: arg0.frame.file,
        fullName: arg0.frame.fullName,
        line: arg0.frame.line,
        arch: arg0.frame.arch,
        from: "",
      },
    });
  }

  deleteThread(id: string) {
    this.threads.delete(id);
  }

  createThread(threadId: string, groupId: string): void {
    this.threadGroups.get(groupId)?.threads.set(threadId, threadId);
  }

  stopThreads(tid: string | undefined, stoppedThreads: string | undefined): void {
    // TODO: Need to figure out if we get a list of threads or just a single thread
    if (stoppedThreads === "all") {
      this.threadGroups.forEach((threadGroup) => {
        threadGroup.threads.forEach((thread) => {
          const th = this.threads.get(thread);
          if (th) {
            th.state = "stopped";
          }
        });
      });
    } else {
      console.error(`Unknown stoppedThreads value, tid: ${tid} stoppedThreads: ${stoppedThreads}`);
    }
  }

  startThreads(tid: string | undefined) {
    // TODO: Need to figure out if we get a list of threads or just a single thread
    if (tid === "all") {
      this.threadGroups.forEach((threadGroup) => {
        threadGroup.threads.forEach((thread) => {
          const th = this.threads.get(thread);
          if (th) {
            th.state = "running";
          }
        });
      });
    } else {
      console.error(`Unknown tid value, tid: ${tid}`);
    }
  }

  dump(): void {
    console.log("GDB State Database");
    console.log("==================");
    console.log("Features:");
    console.log(this.features);
    console.log("Thread Groups:");
    console.log(this.threadGroups);
    console.log("Threads:");
    console.log(this.threads);
    console.log("Stack Frames:");
    console.log(this.stackFrames);
    console.log("Registers:");
    console.log(this.registers);
    console.log("Parameters:");
    console.log(this.params);
    console.log("Breakpoints:");
    console.log(this.breakpoints);
    console.log("Source Files:");
    console.log(this.gdbSrcFileCache.dump());
  }
}
