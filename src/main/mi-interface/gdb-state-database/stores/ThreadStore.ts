import { mapAddThreadArgsToThread } from "../../mappers/thread-mapper";
import { AddThreadArgs, gdbThread, gdbThreadGroup } from "../types/gdbStateTypes";

export class ThreadStore {
  readonly threads: Map<string, gdbThread> = new Map<string, gdbThread>();

  addThread(thread: AddThreadArgs): void {
    this.threads.set(thread.id, mapAddThreadArgsToThread(thread));
  }

  deleteThread(id: string): void {
    this.threads.delete(id);
  }

  clearThreadList(): void {
    this.threads.clear();
  }

  startThreadGroup(groupId: string, threadGroups: Map<string, gdbThreadGroup>): void {
    threadGroups.get(groupId)?.threads.forEach((thread: string) => {
      const th = this.threads.get(thread);
      if (th) {
        th.state = "running";
      }
    });
  }

  stopThreadGroup(groupId: string, threadGroups: Map<string, gdbThreadGroup>): void {
    threadGroups.get(groupId)?.threads.forEach((thread: string) => {
      this.threads.delete(thread);
    });
  }

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
