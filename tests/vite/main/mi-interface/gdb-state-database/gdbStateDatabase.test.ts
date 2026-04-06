/**
 * gdbStateDatabase.test module.
 *
 * @remarks
 * Source module for gdbStateDatabase.test.
 */

/**
 * @file gdbStateDatabase.test.ts
 * @description Source module for gdbStateDatabase.test.
 */

/**
 * Tests for gdbStateDatabase behavior and edge cases.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gdbBreakpoint, gdbStackFrame, gdbStateDatabase } from "../../../../../src/main/mi-interface/gdb-state-database/gdbStateDatabase";

describe("gdbStateDatabase class", () => {
  let db: gdbStateDatabase;

  beforeEach(() => {
    db = new gdbStateDatabase();
  });

  afterEach(() => {
    db.removeAllListeners();
  });

  describe("constructor", () => {
    it("should create an instance with empty collections", () => {
      expect(db).toBeInstanceOf(gdbStateDatabase);
      expect(db.threadGroups.size).toBe(0);
      expect(db.threads.size).toBe(0);
      expect(db.registers.size).toBe(0);
      expect(db.features.size).toBe(0);
      expect(db.params.size).toBe(0);
      expect(db.breakpoints.size).toBe(0);
      expect(db.stackFrames).toEqual([]);
    });

    it("should extend EventEmitter", () => {
      expect(db.on).toBeDefined();
      expect(db.emit).toBeDefined();
    });

    it("should have a gdbSrcFileCache instance", () => {
      expect(db.gdbSrcFileCache).toBeDefined();
    });
  });

  describe("Source File methods", () => {
    it("should delegate hasSourceFile to cache", () => {
      const spy = vi.spyOn(db.gdbSrcFileCache, "hasSourceFile");
      db.hasSourceFile("/test/file.c");
      expect(spy).toHaveBeenCalledWith("/test/file.c");
    });

    it("should delegate getSourceFileContents to cache", async () => {
      const spy = vi.spyOn(db.gdbSrcFileCache, "getSourceFileContents");
      await db.getSourceFileContents("/test/file.c");
      expect(spy).toHaveBeenCalledWith("/test/file.c");
    });
  });

  describe("Stack Frame methods", () => {
    const mockFrame: gdbStackFrame = {
      active: false,
      level: "0",
      func: "main",
      addr: "0x12345",
      args: "",
      file: "main.c",
      fullName: "/path/main.c",
      line: "10",
      from: "",
      arch: "x86_64",
    };

    describe("addStackFrame", () => {
      it("should add a stack frame", () => {
        db.addStackFrame(mockFrame);
        expect(db.stackFrames).toHaveLength(1);
        expect(db.stackFrames[0]).toBe(mockFrame);
      });

      it("should add multiple frames in order", () => {
        const frame1 = { ...mockFrame, level: "0" };
        const frame2 = { ...mockFrame, level: "1" };
        const frame3 = { ...mockFrame, level: "2" };

        db.addStackFrame(frame1);
        db.addStackFrame(frame2);
        db.addStackFrame(frame3);

        expect(db.stackFrames).toHaveLength(3);
        expect(db.stackFrames[0].level).toBe("0");
        expect(db.stackFrames[1].level).toBe("1");
        expect(db.stackFrames[2].level).toBe("2");
      });
    });

    describe("clearStackFrames", () => {
      it("should clear all stack frames", () => {
        db.addStackFrame(mockFrame);
        db.addStackFrame({ ...mockFrame, level: "1" });

        db.clearStackFrames();

        expect(db.stackFrames).toHaveLength(0);
      });

      it("should work on empty stack", () => {
        db.clearStackFrames();
        expect(db.stackFrames).toHaveLength(0);
      });
    });

    describe("setActiveFrame", () => {
      beforeEach(() => {
        db.addStackFrame({ ...mockFrame, level: "0", active: false });
        db.addStackFrame({ ...mockFrame, level: "1", active: false });
        db.addStackFrame({ ...mockFrame, level: "2", active: false });
      });

      it("should set the specified frame as active", () => {
        db.setActiveFrame(1);

        expect(db.stackFrames[0].active).toBe(false);
        expect(db.stackFrames[1].active).toBe(true);
        expect(db.stackFrames[2].active).toBe(false);
      });

      it("should deactivate all other frames", () => {
        db.stackFrames[0].active = true;
        db.stackFrames[1].active = true;

        db.setActiveFrame(2);

        expect(db.stackFrames[0].active).toBe(false);
        expect(db.stackFrames[1].active).toBe(false);
        expect(db.stackFrames[2].active).toBe(true);
      });

      it("should handle setting first frame as active", () => {
        db.setActiveFrame(0);
        expect(db.stackFrames[0].active).toBe(true);
      });

      it("should handle setting last frame as active", () => {
        db.setActiveFrame(2);
        expect(db.stackFrames[2].active).toBe(true);
      });

      it("should not throw on negative index", () => {
        expect(() => db.setActiveFrame(-1)).not.toThrow();
        expect(db.stackFrames.every((f) => !f.active)).toBe(true);
      });

      it("should not throw on index out of bounds", () => {
        expect(() => db.setActiveFrame(10)).not.toThrow();
        expect(db.stackFrames.every((f) => !f.active)).toBe(true);
      });

      it("should handle empty stack frames", () => {
        db.clearStackFrames();
        expect(() => db.setActiveFrame(0)).not.toThrow();
      });
    });
  });

  describe("Breakpoint methods", () => {
    const mockBreakpoint: gdbBreakpoint = {
      number: "1",
      type: "breakpoint",
      disp: "keep",
      enabled: "y",
      addr: "0x12345",
      func: "main",
      file: "main.c",
      fullname: "/path/main.c",
      line: "10",
      tg: "i1",
      times: "0",
      installed: "y",
      orgloc: "main.c:10",
    };

    describe("createBreakpoint", () => {
      it("should create a new breakpoint", () => {
        db.createBreakpoint(mockBreakpoint);
        expect(db.breakpoints.size).toBe(1);
        expect(db.breakpoints.get("1")).toBe(mockBreakpoint);
      });

      it("should handle multiple breakpoints", () => {
        db.createBreakpoint({ ...mockBreakpoint, number: "1" });
        db.createBreakpoint({ ...mockBreakpoint, number: "2" });
        db.createBreakpoint({ ...mockBreakpoint, number: "3" });

        expect(db.breakpoints.size).toBe(3);
      });
    });

    describe("updateBreakpoint", () => {
      it("should update an existing breakpoint", () => {
        db.createBreakpoint(mockBreakpoint);
        const updated = { ...mockBreakpoint, times: "5" };

        db.updateBreakpoint(updated);

        expect(db.breakpoints.get("1")?.times).toBe("5");
      });

      it("should create breakpoint if it doesn't exist", () => {
        db.updateBreakpoint(mockBreakpoint);
        expect(db.breakpoints.has("1")).toBe(true);
      });
    });

    describe("deleteBreakpoint", () => {
      it("should delete an existing breakpoint", () => {
        db.createBreakpoint(mockBreakpoint);
        db.deleteBreakpoint("1");

        expect(db.breakpoints.has("1")).toBe(false);
      });

      it("should not throw when deleting non-existent breakpoint", () => {
        expect(() => db.deleteBreakpoint("999")).not.toThrow();
      });
    });

    describe("clearBreakpoints", () => {
      it("should clear all breakpoints", () => {
        db.createBreakpoint({ ...mockBreakpoint, number: "1" });
        db.createBreakpoint({ ...mockBreakpoint, number: "2" });

        db.clearBreakpoints();

        expect(db.breakpoints.size).toBe(0);
      });
    });
  });

  describe("Parameter methods", () => {
    describe("addParam", () => {
      it("should add a parameter", () => {
        db.addParam("language", "c");
        expect(db.params.size).toBe(1);
        expect(db.params.get("language")).toEqual({
          name: "language",
          value: "c",
        });
      });

      it("should overwrite existing parameter", () => {
        db.addParam("arch", "x86");
        db.addParam("arch", "x86_64");

        expect(db.params.get("arch")?.value).toBe("x86_64");
      });
    });

    describe("getParam", () => {
      it("should retrieve an existing parameter", () => {
        db.addParam("test", "value");
        const param = db.getParam("test");

        expect(param).toEqual({ name: "test", value: "value" });
      });

      it("should return undefined for non-existent parameter", () => {
        expect(db.getParam("nonexistent")).toBeUndefined();
      });
    });
  });

  describe("Feature methods", () => {
    describe("addFeature", () => {
      it("should add a feature", () => {
        db.addFeature("python");
        expect(db.features.size).toBe(1);
        expect(db.features.get("python")).toEqual({
          feature: "python",
          available: true,
        });
      });

      it("should add multiple features", () => {
        db.addFeature("python");
        db.addFeature("breakpoint-notifications");
        db.addFeature("thread-info");

        expect(db.features.size).toBe(3);
      });
    });

    describe("removeFeature", () => {
      it("should remove an existing feature", () => {
        db.addFeature("python");
        db.removeFeature("python");

        expect(db.features.has("python")).toBe(false);
      });

      it("should not throw when removing non-existent feature", () => {
        expect(() => db.removeFeature("nonexistent")).not.toThrow();
      });
    });

    describe("hasFeature", () => {
      it("should return true for existing feature", () => {
        db.addFeature("python");
        expect(db.hasFeature("python")).toBe(true);
      });

      it("should return false for non-existent feature", () => {
        expect(db.hasFeature("nonexistent")).toBe(false);
      });
    });

    describe("featureList", () => {
      it("should return array of all features", () => {
        db.addFeature("python");
        db.addFeature("thread-info");

        const features = db.featureList();

        expect(features).toHaveLength(2);
        expect(features).toContainEqual({ feature: "python", available: true });
        expect(features).toContainEqual({ feature: "thread-info", available: true });
      });

      it("should return empty array when no features", () => {
        expect(db.featureList()).toEqual([]);
      });
    });
  });

  describe("Register methods", () => {
    describe("addRegister", () => {
      it("should add a new register", () => {
        db.addRegister("0", "rax");

        expect(db.registers.size).toBe(1);
        expect(db.registers.get("0")).toEqual({
          name: "rax",
          value: "",
          changed: false,
        });
      });

      it("should update name of existing register", () => {
        db.addRegister("0", "eax");
        db.addRegister("0", "rax");

        expect(db.registers.get("0")?.name).toBe("rax");
      });

      it("should preserve value when updating name", () => {
        db.addRegister("0", "rax");
        db.addRegisterValue("0", "0x1234");
        db.addRegister("0", "RAX");

        expect(db.registers.get("0")?.value).toBe("0x1234");
      });
    });

    describe("addRegisterValue", () => {
      it("should add value to new register", () => {
        db.addRegisterValue("0", "0xABCD");

        const reg = db.registers.get("0");
        expect(reg?.value).toBe("0xABCD");
        expect(reg?.changed).toBe(true);
      });

      it("should update existing register value", () => {
        db.addRegister("0", "rax");
        db.addRegisterValue("0", "0x1111");
        db.addRegisterValue("0", "0x2222");

        expect(db.registers.get("0")?.value).toBe("0x2222");
        expect(db.registers.get("0")?.changed).toBe(true);
      });

      it("should mark changed as false when value unchanged", () => {
        db.addRegisterValue("0", "0x1234");
        db.addRegisterValue("0", "0x1234");

        expect(db.registers.get("0")?.changed).toBe(false);
      });

      it("should mark changed as true when value changes", () => {
        db.addRegisterValue("0", "0x1234");
        db.addRegisterValue("0", "0x5678");

        expect(db.registers.get("0")?.changed).toBe(true);
      });

      it("should use index as name if register not previously added", () => {
        db.addRegisterValue("5", "0xFFFF");

        expect(db.registers.get("5")?.name).toBe("5");
      });
    });

    describe("getRegister", () => {
      it("should retrieve existing register", () => {
        db.addRegister("0", "rax");
        const reg = db.getRegister("0");

        expect(reg?.name).toBe("rax");
      });

      it("should return undefined for non-existent register", () => {
        expect(db.getRegister("999")).toBeUndefined();
      });
    });
  });

  describe("Thread Group methods", () => {
    describe("addThreadGroup", () => {
      it("should add a thread group", () => {
        db.addThreadGroup("i1");

        expect(db.threadGroups.size).toBe(1);
        expect(db.threadGroups.get("i1")).toEqual({
          gid: "i1",
          threads: expect.any(Map),
        });
      });

      it("should add multiple thread groups", () => {
        db.addThreadGroup("i1");
        db.addThreadGroup("i2");

        expect(db.threadGroups.size).toBe(2);
      });
    });

    describe("removeThreadGroup", () => {
      it("should remove an existing thread group", () => {
        db.addThreadGroup("i1");
        db.removeThreadGroup("i1");

        expect(db.threadGroups.has("i1")).toBe(false);
      });
    });

    describe("getThreadGroup", () => {
      it("should retrieve existing thread group", () => {
        db.addThreadGroup("i1");
        const group = db.getThreadGroup("i1");

        expect(group?.gid).toBe("i1");
      });

      it("should return undefined for non-existent group", () => {
        expect(db.getThreadGroup("nonexistent")).toBeUndefined();
      });
    });

    describe("hasThreadGroup", () => {
      it("should return true for existing group", () => {
        db.addThreadGroup("i1");
        expect(db.hasThreadGroup("i1")).toBe(true);
      });

      it("should return false for non-existent group", () => {
        expect(db.hasThreadGroup("i999")).toBe(false);
      });
    });

    describe("createThread", () => {
      it("should add thread to group", () => {
        db.addThreadGroup("i1");
        db.createThread("1", "i1");

        const group = db.getThreadGroup("i1");
        expect(group?.threads.has("1")).toBe(true);
      });

      it("should handle multiple threads in group", () => {
        db.addThreadGroup("i1");
        db.createThread("1", "i1");
        db.createThread("2", "i1");
        db.createThread("3", "i1");

        const group = db.getThreadGroup("i1");
        expect(group?.threads.size).toBe(3);
      });
    });

    describe("removeThreadFromGroup", () => {
      it("should remove thread from group", () => {
        db.addThreadGroup("i1");
        db.createThread("1", "i1");
        db.removeThreadFromGroup("i1", "1");

        const group = db.getThreadGroup("i1");
        expect(group?.threads.has("1")).toBe(false);
      });

      it("should not throw if group doesn't exist", () => {
        expect(() => db.removeThreadFromGroup("nonexistent", "1")).not.toThrow();
      });
    });

    describe("startThreadGroup", () => {
      it("should set all threads in group to running", () => {
        db.addThreadGroup("i1");
        db.createThread("1", "i1");

        db.addThread({
          id: "1",
          targetId: "Thread 0x1",
          details: "",
          name: "main",
          frame: {
            level: "0",
            addr: "0x123",
            func: "main",
            args: "",
            file: "main.c",
            fullName: "/path/main.c",
            line: "10",
            arch: "x86_64",
          },
          state: "stopped",
          active: false,
        });

        db.startThreadGroup("i1");

        expect(db.threads.get("1")?.state).toBe("running");
      });
    });

    describe("stopThreadGroup", () => {
      it("should delete all threads in group", () => {
        db.addThreadGroup("i1");
        db.createThread("1", "i1");
        db.createThread("2", "i1");

        db.addThread({
          id: "1",
          targetId: "Thread 0x1",
          details: "",
          name: "main",
          frame: {
            level: "0",
            addr: "0x123",
            func: "main",
            args: "",
            file: "main.c",
            fullName: "/path/main.c",
            line: "10",
            arch: "x86_64",
          },
          state: "running",
          active: false,
        });

        db.stopThreadGroup("i1");

        expect(db.threads.has("1")).toBe(false);
      });
    });
  });

  describe("Thread methods", () => {
    const mockThreadData = {
      id: "1",
      targetId: "Thread 0x1234",
      details: "main thread",
      name: "main",
      frame: {
        level: "0",
        addr: "0x12345",
        func: "main",
        args: "argc=1, argv=0x...",
        file: "main.c",
        fullName: "/path/to/main.c",
        line: "42",
        arch: "x86_64",
      },
      state: "stopped",
      active: true,
    };

    describe("addThread", () => {
      it("should add a thread", () => {
        db.addThread(mockThreadData);

        expect(db.threads.size).toBe(1);
        const thread = db.threads.get("1");
        expect(thread?.id).toBe("1");
        expect(thread?.targetId).toBe("Thread 0x1234");
        expect(thread?.name).toBe("main");
      });

      it("should use func as thread name", () => {
        db.addThread(mockThreadData);
        expect(db.threads.get("1")?.name).toBe("main");
      });

      it("should set frame.active to false", () => {
        db.addThread(mockThreadData);
        expect(db.threads.get("1")?.frame.active).toBe(false);
      });

      it("should preserve thread active state", () => {
        db.addThread({ ...mockThreadData, active: true });
        expect(db.threads.get("1")?.active).toBe(true);
      });
    });

    describe("deleteThread", () => {
      it("should delete an existing thread", () => {
        db.addThread(mockThreadData);
        db.deleteThread("1");

        expect(db.threads.has("1")).toBe(false);
      });

      it("should not throw when deleting non-existent thread", () => {
        expect(() => db.deleteThread("999")).not.toThrow();
      });
    });

    describe("clearThreadList", () => {
      it("should clear all threads", () => {
        db.addThread(mockThreadData);
        db.addThread({ ...mockThreadData, id: "2" });

        db.clearThreadList();

        expect(db.threads.size).toBe(0);
      });
    });

    describe("stopThreads", () => {
      beforeEach(() => {
        db.addThreadGroup("i1");
        db.createThread("1", "i1");
        db.createThread("2", "i1");

        db.addThread({ ...mockThreadData, id: "1", state: "running" });
        db.addThread({ ...mockThreadData, id: "2", state: "running" });
      });

      it("should stop all threads when stoppedThreads is 'all'", () => {
        db.stopThreads(undefined, "all");

        expect(db.threads.get("1")?.state).toBe("stopped");
        expect(db.threads.get("2")?.state).toBe("stopped");
      });

      it("should emit error for unknown stoppedThreads value", () => {
        const listener = vi.fn();
        db.on("error-stream", listener);

        db.stopThreads("1", "unknown");

        expect(listener).toHaveBeenCalledWith(
          expect.stringContaining("Unknown stoppedThreads value"),
        );
      });
    });

    describe("startThreads", () => {
      beforeEach(() => {
        db.addThreadGroup("i1");
        db.createThread("1", "i1");
        db.createThread("2", "i1");

        db.addThread({ ...mockThreadData, id: "1", state: "stopped" });
        db.addThread({ ...mockThreadData, id: "2", state: "stopped" });
      });

      it("should start all threads when tid is 'all'", () => {
        db.startThreads("all");

        expect(db.threads.get("1")?.state).toBe("running");
        expect(db.threads.get("2")?.state).toBe("running");
      });

      it("should emit error for unknown tid value", () => {
        const listener = vi.fn();
        db.on("error-stream", listener);

        db.startThreads("unknown");

        expect(listener).toHaveBeenCalledWith(expect.stringContaining("Unknown tid value"));
      });
    });
  });

  describe("dump method", () => {
    it("should log all database state to console", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      db.addFeature("python");
      db.addParam("language", "c");
      db.dump();

      expect(consoleSpy).toHaveBeenCalledWith("GDB State Database");
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Features:"));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Parameters:"));

      consoleSpy.mockRestore();
    });

    it("should not throw on empty database", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      expect(() => db.dump()).not.toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe("event emitter integration", () => {
    it("should emit error-stream events", () => {
      const listener = vi.fn();
      db.on("error-stream", listener);

      db.startThreads("invalid");

      expect(listener).toHaveBeenCalled();
    });

    it("should support multiple listeners", () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      db.on("error-stream", listener1);
      db.on("error-stream", listener2);

      db.stopThreads(undefined, "invalid");

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it("should forward source file cache errors", async () => {
      const listener = vi.fn();
      db.on("error-stream", listener);

      await db.getSourceFileContents("/file/that/does/not/exist.c");

      expect(listener).toHaveBeenCalledWith(expect.stringContaining("Error reading file"));
    });
  });
});
