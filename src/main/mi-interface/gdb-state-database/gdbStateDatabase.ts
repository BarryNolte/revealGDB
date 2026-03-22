/**
 * In-memory database for gdb state snapshots and derived metadata.
 */
import { EventEmitter } from "stream";
import { ElectronUINotifier } from "./notifiers/ElectronUINotifier";
import { UINotifier } from "./notifiers/UINotifier";
import { StateLifecycleCoordinator } from "./orchestration/StateLifecycleCoordinator";
import { StateUpdateBroadcaster } from "./orchestration/StateUpdateBroadcaster";
import { BreakpointStore } from "./stores/BreakpointStore";
import { FeatureStore } from "./stores/FeatureStore";
import { FunctionStore } from "./stores/FunctionStore";
import { LocalsStore } from "./stores/LocalsStore";
import { ParameterStore } from "./stores/ParameterStore";
import { RegisterStore } from "./stores/RegisterStore";
import { SourceFileStore } from "./stores/SourceFileStore";
import { StackFrameStore } from "./stores/StackFrameStore";
import { SymbolStore } from "./stores/SymbolStore";
import { ThreadGroupStore } from "./stores/ThreadGroupStore";
import { ThreadStore } from "./stores/ThreadStore";
import {
  AddThreadArgs,
  DisasmToken,
  DisasmTokenType,
  gdbAsmRow,
  gdbBreakpoint,
  gdbFeature,
  gdbFunction,
  gdbParams,
  gdbRegisters,
  gdbSection,
  gdbShowSourceInfo,
  gdbStackFrame,
  gdbSymbolFiles,
  gdbThread,
  gdbThreadGroup,
} from "./types/gdbStateTypes";

export type {
  DisasmToken,
  DisasmTokenType,
  gdbAsmRow,
  gdbBreakpoint,
  gdbFeature,
  gdbFunction,
  gdbParams,
  gdbRegisters,
  gdbSection,
  gdbShowSourceInfo,
  gdbStackFrame,
  gdbSymbolFiles,
  gdbThread,
  gdbThreadGroup,
};

/**
 * Tracks threads, breakpoints, registers, and symbol info from gdb.
 */
export class gdbStateDatabase extends EventEmitter {
  private readonly notifier: UINotifier;
  private readonly lifecycle: StateLifecycleCoordinator;
  private readonly updater: StateUpdateBroadcaster;

  private readonly localsStore: LocalsStore = new LocalsStore();
  private readonly threadGroupStore: ThreadGroupStore = new ThreadGroupStore();
  private readonly threadStore: ThreadStore = new ThreadStore();
  private readonly registerStore: RegisterStore = new RegisterStore();
  private readonly featureStore: FeatureStore = new FeatureStore();
  private readonly paramStore: ParameterStore = new ParameterStore();
  private readonly breakpointStore: BreakpointStore = new BreakpointStore();
  private readonly stackFrameStore: StackFrameStore = new StackFrameStore();
  private readonly sourceFileStore: SourceFileStore = new SourceFileStore();
  private readonly symbolStore: SymbolStore = new SymbolStore();
  private readonly functionStore: FunctionStore = new FunctionStore();

  readonly threadGroups: Map<string, gdbThreadGroup> = this.threadGroupStore.threadGroups;
  readonly threads: Map<string, gdbThread> = this.threadStore.threads;
  readonly registers: Map<string, gdbRegisters> = this.registerStore.registers;
  readonly features: Map<string, gdbFeature> = this.featureStore.features;
  readonly params: Map<string, gdbParams> = this.paramStore.params;
  readonly breakpoints: Map<string, gdbBreakpoint> = this.breakpointStore.breakpoints;
  readonly stackFrames: gdbStackFrame[] = this.stackFrameStore.stackFrames;
  readonly gdbSrcFileCache = this.sourceFileStore.gdbSrcFileCache;
  readonly gdbSymbolFiles: gdbSymbolFiles = this.symbolStore.symbolFiles;
  readonly gdbFunctionNames: Map<string, gdbFunction[]> = this.functionStore.functionNames;

  constructor(notifier?: UINotifier) {
    super();
    this.sourceFileStore.gdbSrcFileCache.on("error-stream", (line: string) => {
      this.emit("error-stream", line);
    });

    this.notifier = notifier || new ElectronUINotifier();
    this.updater = new StateUpdateBroadcaster(
      this.notifier,
      this.localsStore,
      this.stackFrameStore,
      this.breakpointStore,
      this.registerStore,
      this.threadStore,
      this.threadGroupStore,
    );
    this.lifecycle = new StateLifecycleCoordinator(
      this.notifier,
      this.localsStore,
      this.threadGroupStore,
      this.threadStore,
      this.registerStore,
      this.featureStore,
      this.paramStore,
      this.breakpointStore,
      this.stackFrameStore,
      this.sourceFileStore,
      this.symbolStore,
      this.functionStore,
    );
  }

  // Locals
  parseAndStoreLocals(localsStr: string): void {
    this.localsStore.parseAndStoreLocals(localsStr);
  }
  getLocals() {
    return this.localsStore.getLocals();
  }
  clearLocals(): void {
    this.localsStore.clearLocals();
  }
  localsUpdateUI(): void {
    this.updater.localsUpdateUI();
  }

  // Function List
  addFunctionNames(fileName: string, line: string, func: string): void {
    this.functionStore.addFunctionNames(fileName, line, func);
  }
  getFunctionNames(fileName: string): gdbFunction[] | undefined {
    return this.functionStore.getFunctionNames(fileName);
  }
  getFunction(): Map<string, gdbFunction[]> {
    return this.functionStore.getFunction();
  }
  getAllFunctionNames(): gdbFunction[] {
    return this.functionStore.getAllFunctionNames();
  }

  // Symbol Files
  addMainSymbolFile(mainSym: string): void {
    this.symbolStore.addMainSymbolFile(mainSym);
  }
  addSection(section: gdbSection): void {
    this.symbolStore.addSection(section);
  }
  getSymbolFiles(): gdbSymbolFiles {
    return this.symbolStore.getSymbolFiles();
  }

  // Source Files
  hasSourceFile(file: string): boolean {
    return this.sourceFileStore.hasSourceFile(file);
  }
  async getSourceFileContents(file: string): Promise<string | undefined> {
    return await this.sourceFileStore.getSourceFileContents(file);
  }
  clearSourceFiles(): void {
    this.lifecycle.clearSourceFiles();
  }

  // Stack Frames
  clearStackFrames(): void {
    this.stackFrameStore.clear();
  }
  addStackFrame(frame: gdbStackFrame): void {
    this.stackFrameStore.add(frame);
  }
  setActiveFrame(af: number): void {
    this.stackFrameStore.setActiveFrame(af);
  }

  stackUpdateUI(): void {
    this.updater.stackUpdateUI();
  }

  // Breakpoints
  clearBreakpoints(): void {
    this.breakpointStore.clear();
  }
  createBreakpoint(bkpt: gdbBreakpoint): void {
    this.breakpointStore.create(bkpt);
  }
  updateBreakpoint(bkpt: gdbBreakpoint): void {
    this.breakpointStore.update(bkpt);
  }
  deleteBreakpoint(id: string): void {
    this.breakpointStore.delete(id);
  }
  breakpointsUpdateUI(): void {
    this.updater.breakpointsUpdateUI();
  }

  // Parameters
  addParam(paramName: string, paramValue: string): void {
    this.paramStore.add(paramName, paramValue);
  }
  getParam(paramName: string): gdbParams | undefined {
    return this.paramStore.get(paramName);
  }

  // Features
  addFeature(feature: string): void {
    this.featureStore.add(feature);
  }
  removeFeature(feature: string): void {
    this.featureStore.remove(feature);
  }
  hasFeature(feature: string): boolean {
    return this.featureStore.has(feature);
  }
  featureList(): gdbFeature[] {
    return this.featureStore.list();
  }

  // Registers
  addRegister(index: string, regName: string): void {
    this.registerStore.addRegister(index, regName);
  }
  addRegisterValue(index: string, regValue: string): void {
    this.registerStore.addRegisterValue(index, regValue);
  }
  getRegister(index: string): gdbRegisters | undefined {
    return this.registerStore.get(index);
  }
  registersUpdateUI(): void {
    this.updater.registersUpdateUI();
  }

  // Thread Groups
  addThreadGroup(gid: string): void {
    this.threadGroupStore.addThreadGroup(gid);
  }

  removeThreadGroup(id: string): void {
    this.threadGroupStore.removeThreadGroup(id);
  }

  getThreadGroup(id: string): gdbThreadGroup | undefined {
    return this.threadGroupStore.getThreadGroup(id);
  }

  hasThreadGroup(id: string): boolean {
    return this.threadGroupStore.hasThreadGroup(id);
  }

  removeThreadFromGroup(groupId: string, threadId: string): void {
    this.threadGroupStore.removeThreadFromGroup(groupId, threadId);
  }

  startThreadGroup(groupId: string): void {
    this.threadStore.startThreadGroup(groupId, this.threadGroups);
  }

  stopThreadGroup(groupId: string): void {
    this.threadStore.stopThreadGroup(groupId, this.threadGroups);
  }

  // Threads
  clearThreadList(): void {
    this.threadStore.clearThreadList();
  }

  addThread(arg0: AddThreadArgs): void {
    this.threadStore.addThread(arg0);
  }

  deleteThread(id: string): void {
    this.threadStore.deleteThread(id);
  }

  createThread(threadId: string, groupId: string): void {
    this.threadGroupStore.createThread(threadId, groupId);
  }

  stopThreads(tid: string | undefined, stoppedThreads: string | undefined): void {
    if (stoppedThreads === "all") {
      this.threadStore.stopThreadsAll(this.threadGroups);
    } else {
      this.emit(
        "error-stream",
        `Unknown stoppedThreads value, tid: ${tid} stoppedThreads: ${stoppedThreads}`,
      );
    }
  }

  startThreads(tid: string | undefined): void {
    if (tid === "all") {
      this.threadStore.startThreadsAll(this.threadGroups);
    } else {
      this.emit("error-stream", `Unknown tid value, tid: ${tid}`);
    }
  }

  threadUpdateUI(): void {
    this.updater.threadUpdateUI();
  }

  clearDatabase(): void {
    this.lifecycle.clearDatabase();
  }

  allDataUpdateUI(): void {
    this.updater.allDataUpdateUI();
  }

  // Debugging
  dump(): void {
    this.lifecycle.dump();
  }
}
