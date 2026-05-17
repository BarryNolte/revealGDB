/**
 * Implements thread group store logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `ThreadGroupStore`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { gdbThreadGroup } from "../types/gdbStateTypes";

export class ThreadGroupStore {
  readonly threadGroups: Map<string, gdbThreadGroup> = new Map<string, gdbThreadGroup>();

  /**
   * Performs add thread group as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param gid - Unique identifier used to look up the target entity.
   */
  addThreadGroup(gid: string): void {
    this.threadGroups.set(gid, { gid: gid, threads: new Map<string, string>() });
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
    this.threadGroups.delete(id);
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
    return this.threadGroups.get(id);
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
    return this.threadGroups.has(id);
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
    this.threadGroups.get(groupId)?.threads.delete(threadId);
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
    this.threadGroups.get(groupId)?.threads.set(threadId, threadId);
  }

  list(): gdbThreadGroup[] {
    return Array.from(this.threadGroups.values());
  }

  /**
   * Clears the operation from managed state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  clear(): void {
    this.threadGroups.clear();
  }
}
