import { UINotifier } from "../notifiers/UINotifier";
import { BreakpointStore } from "../stores/BreakpointStore";
import { LocalsStore } from "../stores/LocalsStore";
import { RegisterStore } from "../stores/RegisterStore";
import { StackFrameStore } from "../stores/StackFrameStore";
import { ThreadGroupStore } from "../stores/ThreadGroupStore";
import { ThreadStore } from "../stores/ThreadStore";

export class StateUpdateBroadcaster {
  constructor(
    private readonly notifier: UINotifier,
    private readonly localsStore: LocalsStore,
    private readonly stackFrameStore: StackFrameStore,
    private readonly breakpointStore: BreakpointStore,
    private readonly registerStore: RegisterStore,
    private readonly threadStore: ThreadStore,
    private readonly threadGroupStore: ThreadGroupStore,
  ) {}

  localsUpdateUI(): void {
    this.notifier.sendLocals(this.localsStore.locals);
  }

  stackUpdateUI(): void {
    this.notifier.sendStackFrames(this.stackFrameStore.stackFrames);
  }

  breakpointsUpdateUI(): void {
    this.notifier.sendBreakpoints(this.breakpointStore.breakpoints);
  }

  registersUpdateUI(): void {
    this.notifier.sendRegisters(this.registerStore.registers);
  }

  threadUpdateUI(): void {
    this.notifier.sendThreads(this.threadStore.threads, this.threadGroupStore.threadGroups);
  }

  allDataUpdateUI(): void {
    this.threadUpdateUI();
    this.registersUpdateUI();
    this.breakpointsUpdateUI();
    this.stackUpdateUI();
    this.localsUpdateUI();
  }
}
