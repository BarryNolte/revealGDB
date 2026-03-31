import { describe, expect, it, vi } from "vitest";
import type { UINotifier } from "../notifiers/UINotifier";
import { BreakpointStore } from "../stores/BreakpointStore";
import { LocalsStore } from "../stores/LocalsStore";
import { RegisterStore } from "../stores/RegisterStore";
import { StackFrameStore } from "../stores/StackFrameStore";
import { ThreadGroupStore } from "../stores/ThreadGroupStore";
import { ThreadStore } from "../stores/ThreadStore";
import { StateUpdateBroadcaster } from "./StateUpdateBroadcaster";

function createNotifierMock(): UINotifier {
  return {
    sendLocals: vi.fn(),
    sendStackFrames: vi.fn(),
    sendBreakpoints: vi.fn(),
    sendRegisters: vi.fn(),
    sendThreads: vi.fn(),
    sendSourceFile: vi.fn(),
  };
}

describe("StateUpdateBroadcaster", () => {
  function createSubject() {
    const notifier = createNotifierMock();
    const localsStore = new LocalsStore();
    const stackFrameStore = new StackFrameStore();
    const breakpointStore = new BreakpointStore();
    const registerStore = new RegisterStore();
    const threadStore = new ThreadStore();
    const threadGroupStore = new ThreadGroupStore();

    const broadcaster = new StateUpdateBroadcaster(
      notifier,
      localsStore,
      stackFrameStore,
      breakpointStore,
      registerStore,
      threadStore,
      threadGroupStore,
    );

    return {
      broadcaster,
      notifier,
      localsStore,
      stackFrameStore,
      breakpointStore,
      registerStore,
      threadStore,
      threadGroupStore,
    };
  }

  it("forwards each store to the matching notifier method", () => {
    const subject = createSubject();
    const locals = {
      locals: [{ exp: "counter", name: "counter", type: "int", value: "7", variablesReference: 0 }],
    };

    subject.localsStore.locals = locals as never;
    subject.stackFrameStore.add({
      active: true,
      level: "0",
      func: "main",
      addr: "0x1000",
      args: "",
      file: "main.c",
      fullName: "/tmp/main.c",
      line: "12",
      from: "",
      arch: "arm",
    });
    subject.breakpointStore.create({
      number: "1",
      type: "breakpoint",
      disp: "keep",
      enabled: "y",
      addr: "0x1000",
      func: "main",
      file: "main.c",
      fullname: "/tmp/main.c",
      line: "12",
      tg: "i1",
      times: "0",
      installed: "y",
      orgloc: "main.c:12",
    });
    subject.registerStore.addRegister("0", "r0");
    subject.registerStore.addRegisterValue("0", "0x0");
    subject.threadGroupStore.addThreadGroup("i1");
    subject.threadGroupStore.createThread("1", "i1");
    subject.threadStore.addThread({
      id: "1",
      targetId: "Thread 1",
      details: "stopped",
      name: "Thread 1",
      state: "stopped",
      active: true,
      frame: {
        level: "0",
        addr: "0x1000",
        func: "main",
        args: "",
        file: "main.c",
        fullName: "/tmp/main.c",
        line: "12",
        arch: "arm",
      },
    });

    subject.broadcaster.localsUpdateUI();
    subject.broadcaster.stackUpdateUI();
    subject.broadcaster.breakpointsUpdateUI();
    subject.broadcaster.registersUpdateUI();
    subject.broadcaster.threadUpdateUI();

    expect(subject.notifier.sendLocals).toHaveBeenCalledWith(locals);
    expect(subject.notifier.sendStackFrames).toHaveBeenCalledWith(
      subject.stackFrameStore.stackFrames,
    );
    expect(subject.notifier.sendBreakpoints).toHaveBeenCalledWith(
      subject.breakpointStore.breakpoints,
    );
    expect(subject.notifier.sendRegisters).toHaveBeenCalledWith(subject.registerStore.registers);
    expect(subject.notifier.sendThreads).toHaveBeenCalledWith(
      subject.threadStore.threads,
      subject.threadGroupStore.threadGroups,
    );
  });

  it("broadcasts all data in thread-register-breakpoint-stack-locals order", () => {
    const subject = createSubject();

    subject.broadcaster.allDataUpdateUI();

    const sendThreads = vi.mocked(subject.notifier.sendThreads);
    const sendRegisters = vi.mocked(subject.notifier.sendRegisters);
    const sendBreakpoints = vi.mocked(subject.notifier.sendBreakpoints);
    const sendStackFrames = vi.mocked(subject.notifier.sendStackFrames);
    const sendLocals = vi.mocked(subject.notifier.sendLocals);

    expect(sendThreads).toHaveBeenCalledOnce();
    expect(sendRegisters).toHaveBeenCalledOnce();
    expect(sendBreakpoints).toHaveBeenCalledOnce();
    expect(sendStackFrames).toHaveBeenCalledOnce();
    expect(sendLocals).toHaveBeenCalledOnce();

    expect(sendThreads.mock.invocationCallOrder[0]).toBeLessThan(
      sendRegisters.mock.invocationCallOrder[0],
    );
    expect(sendRegisters.mock.invocationCallOrder[0]).toBeLessThan(
      sendBreakpoints.mock.invocationCallOrder[0],
    );
    expect(sendBreakpoints.mock.invocationCallOrder[0]).toBeLessThan(
      sendStackFrames.mock.invocationCallOrder[0],
    );
    expect(sendStackFrames.mock.invocationCallOrder[0]).toBeLessThan(
      sendLocals.mock.invocationCallOrder[0],
    );
  });
});
