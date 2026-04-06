/**
 * Implements state update broadcaster logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `StateUpdateBroadcaster`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
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

  /**
   * Performs locals update ui as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  localsUpdateUI(): void {
    this.notifier.sendLocals(this.localsStore.locals);
  }

  /**
   * Performs stack update ui as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  stackUpdateUI(): void {
    this.notifier.sendStackFrames(this.stackFrameStore.stackFrames);
  }

  /**
   * Performs breakpoints update ui as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  breakpointsUpdateUI(): void {
    this.notifier.sendBreakpoints(this.breakpointStore.breakpoints);
  }

  /**
   * Performs registers update ui as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  registersUpdateUI(): void {
    this.notifier.sendRegisters(this.registerStore.registers);
  }

  /**
   * Performs thread update ui as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  threadUpdateUI(): void {
    this.notifier.sendThreads(this.threadStore.threads, this.threadGroupStore.threadGroups);
  }

  /**
   * Performs all data update ui as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  allDataUpdateUI(): void {
    this.threadUpdateUI();
    this.registersUpdateUI();
    this.breakpointsUpdateUI();
    this.stackUpdateUI();
    this.localsUpdateUI();
  }
}
