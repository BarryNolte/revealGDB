/**
 * Implements thread store logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `ThreadStore`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { mapAddThreadArgsToThread } from "../../mappers/thread-mapper";
import { AddThreadArgs, gdbThread, gdbThreadGroup } from "../types/gdbStateTypes";

export class ThreadStore {
  readonly threads: Map<string, gdbThread> = new Map<string, gdbThread>();

  /**
   * Performs add thread as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param thread - Value for `thread` consumed by this operation.
   */
  addThread(thread: AddThreadArgs): void {
    this.threads.set(thread.id, mapAddThreadArgsToThread(thread));
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
    this.threads.delete(id);
  }

  /**
   * Clears thread list from managed state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  clearThreadList(): void {
    this.threads.clear();
  }

  /**
   * Starts thread group for the current workflow.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param groupId - Unique identifier used to look up the target entity.
   * @param threadGroups - Map of keyed values consumed or updated by this operation.
   */
  startThreadGroup(groupId: string, threadGroups: Map<string, gdbThreadGroup>): void {
    threadGroups.get(groupId)?.threads.forEach((thread: string) => {
      const th = this.threads.get(thread);
      if (th) {
        th.state = "running";
      }
    });
  }

  /**
   * Stops thread group for the current workflow.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param groupId - Unique identifier used to look up the target entity.
   * @param threadGroups - Map of keyed values consumed or updated by this operation.
   */
  stopThreadGroup(groupId: string, threadGroups: Map<string, gdbThreadGroup>): void {
    threadGroups.get(groupId)?.threads.forEach((thread: string) => {
      this.threads.delete(thread);
    });
  }

  /**
   * Stops threads all for the current workflow.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param threadGroups - Map of keyed values consumed or updated by this operation.
   */
  stopThreadsAll(threadGroups: Map<string, gdbThreadGroup>): void {
    threadGroups.forEach((threadGroup) => {
      threadGroup.threads.forEach((thread) => {
        const th = this.threads.get(thread);
        if (th) {
          th.state = "stopped";
        }
      });
    });
  }

  /**
   * Starts threads all for the current workflow.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param threadGroups - Map of keyed values consumed or updated by this operation.
   */
  startThreadsAll(threadGroups: Map<string, gdbThreadGroup>): void {
    threadGroups.forEach((threadGroup) => {
      threadGroup.threads.forEach((thread) => {
        const th = this.threads.get(thread);
        if (th) {
          th.state = "running";
        }
      });
    });
  }
}
