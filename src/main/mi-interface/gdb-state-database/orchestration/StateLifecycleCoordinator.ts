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
import {
  gdbBreakpoint,
  gdbFeature,
  gdbFunction,
  gdbParams,
  gdbSection,
  gdbShowSourceInfo,
  gdbStackFrame,
  gdbThread,
  gdbThreadGroup,
} from "../types/gdbStateTypes";

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
  dump(): string[] {
    const outputLines: string[] = [];
    outputLines.push(" ");
    outputLines.push("Features:");
    this.featureStore.features.forEach((feature: gdbFeature) =>
      outputLines.push(
        `  ${feature.feature.padEnd(30, " ")}: ${feature.available ? "available" : "unavailable"}`,
      ),
    );
    outputLines.push(" ");
    outputLines.push("Thread Groups:");
    this.threadGroupStore.threadGroups.forEach((tg: gdbThreadGroup) => {
      outputLines.push(`  GroupId: ${tg.gid}`);
      tg.threads.forEach((thread: string) => outputLines.push(`    ThreadId: ${thread}`));
    });
    outputLines.push(" ");
    outputLines.push("Threads:");
    this.threadStore.threads.forEach((thread: gdbThread) => {
      outputLines.push(`  ${JSON.stringify(thread)}`);
    });
    outputLines.push(" ");
    outputLines.push("Stack Frames:");
    this.stackFrameStore.stackFrames.forEach((frame: gdbStackFrame) => {
      outputLines.push(`  ${JSON.stringify(frame)}`);
    });
    outputLines.push(" ");
    outputLines.push("Locals:");
    const locals = this.localsStore.getLocals();
    if (locals) {
      locals.locals.forEach((local) =>
        outputLines.push(`  ${local.name.padEnd(20, " ")}: ${local.value}`),
      );
    }
    outputLines.push(" ");
    outputLines.push("Registers:");
    this.registerStore.registers.forEach((reg) =>
      outputLines.push(`  ${reg.name.padEnd(16, " ")}: ${reg.value.padEnd(16, " ")}`),
    );
    outputLines.push(" ");
    outputLines.push("Parameters:");
    this.paramStore.params.forEach((param: gdbParams) =>
      outputLines.push(`  ${param.name.padEnd(16, " ")}: ${param.value}`),
    );
    outputLines.push(" ");
    outputLines.push("Breakpoints:");
    this.breakpointStore.breakpoints.forEach((bp: gdbBreakpoint) => {
      outputLines.push(`  ${JSON.stringify(bp)}`);
    });
    outputLines.push(" ");
    outputLines.push("Source Files:");
    outputLines.push(...this.sourceFileStore.gdbSrcFileCache.dump());

    outputLines.push(" ");
    outputLines.push("Symbol Files:");
    outputLines.push(`  Main Symbols: ${this.symbolStore.symbolFiles.mainSym}`);
    this.symbolStore.symbolFiles.sections.forEach((sf: gdbSection) =>
      outputLines.push(
        `  ${sf.section.padEnd(20, " ")}: ${sf.startAddr} - ${sf.endAddr} ${sf.file ? `(file: ${sf.file})` : ""}`,
      ),
    );
    outputLines.push(" ");
    outputLines.push("Function Names:");
    this.functionStore.functionNames.forEach((fn: gdbFunction[], key: string) => {
      outputLines.push(`  ${key}:`);
      fn.forEach((fn: gdbFunction) =>
        outputLines.push(`    ${fn.line.padEnd(5, " ")}: ${fn.function}`),
      );
    });
    outputLines.push(" ");
    outputLines.push(" ");

    return outputLines;
  }
}
