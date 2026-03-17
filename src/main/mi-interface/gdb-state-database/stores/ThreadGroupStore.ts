import { gdbThreadGroup } from "../types/gdbStateTypes";

export class ThreadGroupStore {
  readonly threadGroups: Map<string, gdbThreadGroup> = new Map<string, gdbThreadGroup>();

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

  createThread(threadId: string, groupId: string): void {
    this.threadGroups.get(groupId)?.threads.set(threadId, threadId);
  }

  clear(): void {
    this.threadGroups.clear();
  }
}
