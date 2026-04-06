/**
 * Implements state lifecycle coordinator logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `StateLifecycleCoordinator`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { UINotifier } from "../notifiers/UINotifier";
import { BreakpointStore } from "../stores/BreakpointStore";
import { FeatureStore } from "../stores/FeatureStore";
import { FunctionStore } from "../stores/FunctionStore";
import { LocalsStore } from "../stores/LocalsStore";
import { ParameterStore } from "../stores/ParameterStore";
import { RegisterStore } from "../stores/RegisterStore";
import { SourceFileStore } from "../stores/SourceFileStore";
import { StackFrameStore } from "../stores/StackFrameStore";
import { SymbolStore } from "../stores/SymbolStore";
import { ThreadGroupStore } from "../stores/ThreadGroupStore";
import { ThreadStore } from "../stores/ThreadStore";
import { gdbShowSourceInfo } from "../types/gdbStateTypes";

export class StateLifecycleCoordinator {
  constructor(
    private readonly notifier: UINotifier,
    private readonly localsStore: LocalsStore,
    private readonly threadGroupStore: ThreadGroupStore,
    private readonly threadStore: ThreadStore,
    private readonly registerStore: RegisterStore,
    private readonly featureStore: FeatureStore,
    private readonly paramStore: ParameterStore,
    private readonly breakpointStore: BreakpointStore,
    private readonly stackFrameStore: StackFrameStore,
    private readonly sourceFileStore: SourceFileStore,
    private readonly symbolStore: SymbolStore,
    private readonly functionStore: FunctionStore,
  ) {}

  /**
   * Clears source files from managed state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  clearSourceFiles(): void {
    const showSourceInfo: gdbShowSourceInfo = {
      fileName: " ",
      line: "0",
      contents: " ",
    };

    this.notifier.sendSourceFile(showSourceInfo);
  }

  /**
   * Clears database from managed state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  clearDatabase(): void {
    this.threadGroupStore.clear();
    this.threadStore.clearThreadList();
    this.registerStore.clear();
    this.featureStore.clear();
    this.paramStore.clear();
    this.breakpointStore.clear();
    this.stackFrameStore.clear();
    this.sourceFileStore.clearCache();
    this.symbolStore.clear();
    this.functionStore.clear();
    this.localsStore.clearLocals();
    this.clearSourceFiles();
  }

  /**
   * Performs dump as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  dump(): void {
    console.log("GDB State Database");
    console.log("==================");
    console.log("Features:");
    console.log(this.featureStore.features);
    console.log("Thread Groups:");
    console.log(this.threadGroupStore.threadGroups);
    console.log("Threads:");
    console.log(this.threadStore.threads);
    console.log("Stack Frames:");
    console.log(this.stackFrameStore.stackFrames);
    console.log("Registers:");
    console.log(this.registerStore.registers);
    console.log("Parameters:");
    console.log(this.paramStore.params);
    console.log("Breakpoints:");
    console.log(this.breakpointStore.breakpoints);
    console.log("Source Files:");
    console.log(this.sourceFileStore.gdbSrcFileCache.dump());
    console.log("Symbol Files:");
    console.log(this.symbolStore.symbolFiles);
    console.log("Function Names:");
    console.log(this.functionStore.functionNames);
  }
}
