/**
 * Implements gdb state database logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `gdbStateDatabase`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { EventEmitter } from "stream";
import { sendToRenderer } from "../../ipc-sender";
import {
  buildLineVarMap,
  MaintPrintSymbolsParser,
  queryVarAtPosition,
} from "../gdb-parsers/maint-print-symbols-parser";
import { ERROR_STREAM, HTML_STREAM } from "../mi-stream-events";
import { ElectronUINotifier } from "./notifiers/ElectronUINotifier";
import { UINotifier } from "./notifiers/UINotifier";
import { StateLifecycleCoordinator } from "./orchestration/StateLifecycleCoordinator";
import { StateUpdateBroadcaster } from "./orchestration/StateUpdateBroadcaster";
import { BreakpointStore } from "./stores/BreakpointStore";
import { FeatureStore } from "./stores/FeatureStore";
import { FunctionStore } from "./stores/FunctionStore";
import { LineVarStore } from "./stores/LineVarStore";
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
  gdbLineVarMap,
  gdbParams,
  gdbRegisters,
  gdbSection,
  gdbShowSourceInfo,
  gdbStackFrame,
  gdbSymbolFiles,
  gdbThread,
  gdbThreadGroup,
  gdbVarLocation,
} from "./types/gdbStateTypes";

export type {
  DisasmToken,
  DisasmTokenType,
  gdbAsmRow,
  gdbBreakpoint,
  gdbFeature,
  gdbFunction,
  gdbLineVarMap,
  gdbParams,
  gdbRegisters,
  gdbSection,
  gdbShowSourceInfo,
  gdbStackFrame,
  gdbSymbolFiles,
  gdbThread,
  gdbThreadGroup,
  gdbVarLocation,
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
  private readonly lineVarStore: LineVarStore = new LineVarStore();

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
    this.sourceFileStore.gdbSrcFileCache.on(ERROR_STREAM, (line: string) => {
      this.emit(ERROR_STREAM, line);
    });
    this.sourceFileStore.gdbSrcFileCache.on(HTML_STREAM, (html: string) => {
      this.emit(HTML_STREAM, html);
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
  /**
   * Parses input into and store locals data.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param localsStr - Value for `localsStr` consumed by this operation.
   */
  parseAndStoreLocals(localsStr: string): void {
    this.localsStore.parseAndStoreLocals(localsStr);
  }
  /**
   * Returns locals from current state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  getLocals() {
    return this.localsStore.getLocals();
  }
  /**
   * Clears locals from managed state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  clearLocals(): void {
    this.localsStore.clearLocals();
  }
  /**
   * Performs locals update ui as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  localsUpdateUI(): void {
    this.updater.localsUpdateUI();
  }

  // Function List
  /**
   * Performs add function names as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param fileName - Filesystem or source path used to locate the target resource.
   * @param line - Line value used for source navigation or rendering.
   * @param func - Value for `func` consumed by this operation.
   */
  addFunctionNames(fileName: string, line: string, func: string): void {
    this.functionStore.addFunctionNames(fileName, line, func);
  }
  /**
   * Returns function names from current state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param fileName - Filesystem or source path used to locate the target resource.
   * @returns The resulting collection produced by this operation.
   */
  getFunctionNames(fileName: string): gdbFunction[] | undefined {
    return this.functionStore.getFunctionNames(fileName);
  }
  /**
   * Returns function from current state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @returns The resulting collection produced by this operation.
   */
  getFunction(): Map<string, gdbFunction[]> {
    return this.functionStore.getFunction();
  }
  /**
   * Returns all function names from current state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @returns The resulting collection produced by this operation.
   */
  getAllFunctionNames(): gdbFunction[] {
    return this.functionStore.getAllFunctionNames();
  }

  // Symbol Files
  /**
   * Performs add main symbol file as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param mainSym - Value for `mainSym` consumed by this operation.
   */
  addMainSymbolFile(mainSym: string): void {
    this.symbolStore.addMainSymbolFile(mainSym);
  }
  /**
   * Performs add section as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param section - Value for `section` consumed by this operation.
   */
  addSection(section: gdbSection): void {
    this.symbolStore.addSection(section);
  }
  /**
   * Returns symbol files from current state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @returns The computed result produced by this operation.
   */
  getSymbolFiles(): gdbSymbolFiles {
    return this.symbolStore.getSymbolFiles();
  }

  // Source Files
  /**
   * Performs has source file as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param file - Filesystem or source path used to locate the target resource.
   * @returns True when the operation succeeds; otherwise false.
   */
  hasSourceFile(file: string): boolean {
    return this.sourceFileStore.hasSourceFile(file);
  }
  /**
   * Returns source file contents from current state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications. Performs asynchronous work and should be used with completion ordering in mind.
   *
   * @param file - Filesystem or source path used to locate the target resource.
   * @returns A promise that resolves with the computed result after asynchronous processing completes.
   */
  async getSourceFileContents(file: string): Promise<string | undefined> {
    return await this.sourceFileStore.getSourceFileContents(file);
  }
  /**
   * Clears source files from managed state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  clearSourceFiles(): void {
    this.lifecycle.clearSourceFiles();
  }

  // Stack Frames
  /**
   * Clears stack frames from managed state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  clearStackFrames(): void {
    this.stackFrameStore.clear();
  }
  /**
   * Performs add stack frame as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param frame - Value for `frame` consumed by this operation.
   */
  addStackFrame(frame: gdbStackFrame): void {
    this.stackFrameStore.add(frame);
  }
  /**
   * Sets active frame on current state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param af - Value for `af` consumed by this operation.
   */
  setActiveFrame(af: number): void {
    this.stackFrameStore.setActiveFrame(af);
  }

  /**
   * Performs stack update ui as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  stackUpdateUI(): void {
    this.updater.stackUpdateUI();
  }

  // Breakpoints
  /**
   * Clears breakpoints from managed state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  clearBreakpoints(): void {
    this.breakpointStore.clear();
  }

  /**
   * Creates breakpoint for downstream use.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param bkpt - Value for `bkpt` consumed by this operation.
   */
  createBreakpoint(bkpt: gdbBreakpoint): void {
    this.breakpointStore.create(bkpt);
  }

  /**
   * Updates breakpoint using supplied inputs.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param bkpt - Value for `bkpt` consumed by this operation.
   */
  updateBreakpoint(bkpt: gdbBreakpoint): void {
    this.breakpointStore.update(bkpt);
  }

  /**
   * Removes breakpoint from managed state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param id - Unique identifier used to look up the target entity.
   */
  deleteBreakpoint(id: string): void {
    this.breakpointStore.delete(id);
  }

  breakpointList(): gdbBreakpoint[] {
    return this.breakpointStore.list();
  }

  /**
   * Performs breakpoints update ui as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  breakpointsUpdateUI(): void {
    this.updater.breakpointsUpdateUI();
  }

  // Parameters
  /**
   * Performs add param as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param paramName - Value for `paramName` consumed by this operation.
   * @param paramValue - Value for `paramValue` consumed by this operation.
   */
  addParam(paramName: string, paramValue: string): void {
    this.paramStore.add(paramName, paramValue);
  }
  /**
   * Returns param from current state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param paramName - Value for `paramName` consumed by this operation.
   * @returns The computed result produced by this operation.
   */
  getParam(paramName: string): gdbParams | undefined {
    return this.paramStore.get(paramName);
  }

  paramList(): gdbParams[] {
    return this.paramStore.list();
  }

  // Features
  /**
   * Performs add feature as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param feature - Value for `feature` consumed by this operation.
   */
  addFeature(feature: string): void {
    this.featureStore.add(feature);
  }
  /**
   * Removes feature from managed state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param feature - Value for `feature` consumed by this operation.
   */
  removeFeature(feature: string): void {
    this.featureStore.remove(feature);
  }
  /**
   * Performs has feature as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param feature - Value for `feature` consumed by this operation.
   * @returns True when the operation succeeds; otherwise false.
   */
  hasFeature(feature: string): boolean {
    return this.featureStore.has(feature);
  }
  /**
   * Performs feature list as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @returns The resulting collection produced by this operation.
   */
  featureList(): gdbFeature[] {
    return this.featureStore.list();
  }

  // Registers
  /**
   * Performs add register as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param index - Zero-based index used to address a specific item.
   * @param regName - Value for `regName` consumed by this operation.
   */
  addRegister(index: string, regName: string): void {
    this.registerStore.addRegister(index, regName);
  }
  /**
   * Performs add register value as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param index - Zero-based index used to address a specific item.
   * @param regValue - Value for `regValue` consumed by this operation.
   */
  addRegisterValue(index: string, regValue: string): void {
    this.registerStore.addRegisterValue(index, regValue);
  }
  /**
   * Returns register from current state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param index - Zero-based index used to address a specific item.
   * @returns The computed result produced by this operation.
   */
  getRegister(index: string): gdbRegisters | undefined {
    return this.registerStore.get(index);
  }

  registerList(): gdbRegisters[] {
    return this.registerStore.list();
  }

  /**
   * Performs registers update ui as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  registersUpdateUI(): void {
    this.updater.registersUpdateUI();
  }

  // Thread Groups
  /**
   * Performs add thread group as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param gid - Unique identifier used to look up the target entity.
   */
  addThreadGroup(gid: string): void {
    this.threadGroupStore.addThreadGroup(gid);
  }

  /**
   * Removes thread group from managed state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param id - Unique identifier used to look up the target entity.
   */
  removeThreadGroup(id: string): void {
    this.threadGroupStore.removeThreadGroup(id);
  }

  /**
   * Returns thread group from current state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param id - Unique identifier used to look up the target entity.
   * @returns The computed result produced by this operation.
   */
  getThreadGroup(id: string): gdbThreadGroup | undefined {
    return this.threadGroupStore.getThreadGroup(id);
  }

  /**
   * Performs has thread group as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param id - Unique identifier used to look up the target entity.
   * @returns True when the operation succeeds; otherwise false.
   */
  hasThreadGroup(id: string): boolean {
    return this.threadGroupStore.hasThreadGroup(id);
  }

  /**
   * Removes thread from group from managed state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param groupId - Unique identifier used to look up the target entity.
   * @param threadId - Unique identifier used to look up the target entity.
   */
  removeThreadFromGroup(groupId: string, threadId: string): void {
    this.threadGroupStore.removeThreadFromGroup(groupId, threadId);
  }

  /**
   * Starts thread group for the current workflow.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param groupId - Unique identifier used to look up the target entity.
   */
  startThreadGroup(groupId: string): void {
    this.threadStore.startThreadGroup(groupId, this.threadGroups);
  }

  /**
   * Stops thread group for the current workflow.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param groupId - Unique identifier used to look up the target entity.
   */
  stopThreadGroup(groupId: string): void {
    this.threadStore.stopThreadGroup(groupId, this.threadGroups);
  }

  // Threads
  /**
   * Clears thread list from managed state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  clearThreadList(): void {
    this.threadStore.clearThreadList();
  }

  /**
   * Performs add thread as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param arg0 - Value for `arg0` consumed by this operation.
   */
  addThread(arg0: AddThreadArgs): void {
    this.threadStore.addThread(arg0);
  }

  /**
   * Removes thread from managed state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param id - Unique identifier used to look up the target entity.
   */
  deleteThread(id: string): void {
    this.threadStore.deleteThread(id);
  }

  /**
   * Creates thread for downstream use.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param threadId - Unique identifier used to look up the target entity.
   * @param groupId - Unique identifier used to look up the target entity.
   */
  createThread(threadId: string, groupId: string): void {
    this.threadGroupStore.createThread(threadId, groupId);
  }

  /**
   * Stops threads for the current workflow.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param tid - Unique identifier used to look up the target entity.
   * @param stoppedThreads - Value for `stoppedThreads` consumed by this operation.
   */
  stopThreads(tid: string | undefined, stoppedThreads: string | undefined): void {
    if (stoppedThreads === "all") {
      this.threadStore.stopThreadsAll(this.threadGroups);
    } else {
      this.emit(
        ERROR_STREAM,
        `Unknown stoppedThreads value, tid: ${tid} stoppedThreads: ${stoppedThreads}`,
      );
    }
  }

  /**
   * Starts threads for the current workflow.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param tid - Unique identifier used to look up the target entity.
   */
  startThreads(tid: string | undefined): void {
    if (tid === "all") {
      this.threadStore.startThreadsAll(this.threadGroups);
    } else {
      this.emit(ERROR_STREAM, `Unknown tid value, tid: ${tid}`);
    }
  }

  /**
   * Performs thread update ui as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  threadUpdateUI(): void {
    this.updater.threadUpdateUI();
  }

  /**
   * Clears database from managed state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  clearDatabase(): void {
    this.lifecycle.clearDatabase();
  }

  /**
   * Performs all data update ui as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  allDataUpdateUI(): void {
    this.updater.allDataUpdateUI();
  }

  // Line Variable Map
  addRawLineVarData(rawLines: string[]): void {
    const parsed = MaintPrintSymbolsParser.parse(rawLines);
    // Kick off source enrichment; if source is unavailable it will fall back to Approach B
    void this.enrichLineVarsFromSource(parsed);
  }

  private async enrichLineVarsFromSource(
    parsed: ReturnType<typeof MaintPrintSymbolsParser.parse>,
  ): Promise<void> {
    const { header, lineTable, blocks } = parsed;
    const contents = await this.gdbSrcFileCache.getSourceFileContents(header.sourceFile);
    const sourceLines = contents ? contents.split("\n") : undefined;
    // Approach C when source is available, Approach B otherwise
    const map = buildLineVarMap(blocks, lineTable, header, sourceLines);
    this.lineVarStore.add(map);
    console.log("Built line var map", JSON.stringify(map));
    sendToRenderer("data-line-vars", this.serializeLineVarMap(map));
  }

  getLineVars(sourceFile: string): gdbLineVarMap | undefined {
    return this.lineVarStore.get(sourceFile);
  }

  hasLineVars(sourceFile: string): boolean {
    return this.lineVarStore.has(sourceFile);
  }

  queryVarAtPosition(sourceFile: string, line: number, col: number): gdbVarLocation | undefined {
    const map = this.lineVarStore.get(sourceFile);
    if (!map) return undefined;
    return queryVarAtPosition(map, line, col);
  }

  getVarByName(sourceFile: string, varName: string): gdbVarLocation | undefined {
    const map = this.lineVarStore.get(sourceFile);
    if (!map) return undefined;
    for (const locs of map.lineVars.values()) {
      const found = locs.find((l) => l.name === varName);
      if (found) return found;
    }
    return undefined;
  }

  private serializeLineVarMap(map: gdbLineVarMap): {
    sourceFile: string;
    compilationDir: string;
    lineVars: [
      number,
      {
        name: string;
        line: number;
        colStart: number;
        colEnd: number;
        references: { line: number; colStart: number; colEnd: number }[];
      }[],
    ][];
  } {
    return {
      sourceFile: map.sourceFile,
      compilationDir: map.compilationDir,
      lineVars: Array.from(map.lineVars.entries()),
    };
  }

  // Debugging
  /**
   * Performs dump as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  dump(): string[] {
    return this.lifecycle.dump();
  }
}
