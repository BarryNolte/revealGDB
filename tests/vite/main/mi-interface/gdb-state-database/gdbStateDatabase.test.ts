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
import { readFileSync } from "fs";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  gdbBreakpoint,
  gdbSection,
  gdbStackFrame,
  gdbStateDatabase,
} from "../../../../../src/main/mi-interface/gdb-state-database/gdbStateDatabase";
import { UINotifier } from "../../../../../src/main/mi-interface/gdb-state-database/notifiers/UINotifier";
import { ERROR_STREAM, HTML_STREAM } from "../../../../../src/main/mi-interface/mi-stream-events";

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

    it("should use a provided custom notifier instead of creating a new one", () => {
      const customNotifier: UINotifier = {
        sendLocals: vi.fn(),
        sendStackFrames: vi.fn(),
        sendBreakpoints: vi.fn(),
        sendRegisters: vi.fn(),
        sendThreads: vi.fn(),
        sendSourceFile: vi.fn(),
      };
      const db2 = new gdbStateDatabase(customNotifier);
      expect(db2).toBeInstanceOf(gdbStateDatabase);
      db2.removeAllListeners();
    });

    it("forwards ERROR_STREAM events from gdbSrcFileCache to the database emitter", () => {
      const handler = vi.fn();
      db.on(ERROR_STREAM, handler);
      db.gdbSrcFileCache.emit(ERROR_STREAM, "error line");
      expect(handler).toHaveBeenCalledWith("error line");
    });

    it("forwards HTML_STREAM events from gdbSrcFileCache to the database emitter", () => {
      const handler = vi.fn();
      db.on(HTML_STREAM, handler);
      db.gdbSrcFileCache.emit(HTML_STREAM, "<html>");
      expect(handler).toHaveBeenCalledWith("<html>");
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
      db.on("html-stream", listener);

      await db.getSourceFileContents("/file/that/does/not/exist.c");

      expect(listener).toHaveBeenCalledWith(expect.stringContaining("Source File Read Error"));
    });
  });

  describe("Line Variable methods", () => {
    it("queryVarAtPosition returns undefined when no map exists for source file", () => {
      const result = db.queryVarAtPosition("nonexistent.c", 1, 1);
      expect(result).toBeUndefined();
    });

    it("getVarByName returns undefined when no map exists for source file", () => {
      const result = db.getVarByName("nonexistent.c", "x");
      expect(result).toBeUndefined();
    });

    it("hasLineVars returns false when no map exists for source file", () => {
      expect(db.hasLineVars("nonexistent.c")).toBe(false);
    });

    it("getLineVars returns undefined when no map exists for source file", () => {
      expect(db.getLineVars("nonexistent.c")).toBeUndefined();
    });
  });

  describe("Locals methods", () => {
    it("parseAndStoreLocals stores parsed locals", () => {
      db.parseAndStoreLocals('locals=[{name="x",value="1"}]');
      expect(db.getLocals()).toBeDefined();
    });

    it("getLocals returns undefined before any locals are stored", () => {
      expect(db.getLocals()).toBeUndefined();
    });

    it("clearLocals removes stored locals", () => {
      db.parseAndStoreLocals('locals=[{name="x",value="1"}]');
      db.clearLocals();
      expect(db.getLocals()).toBeUndefined();
    });

    it("localsUpdateUI delegates to notifier", () => {
      const notifier: UINotifier = {
        sendLocals: vi.fn(),
        sendStackFrames: vi.fn(),
        sendBreakpoints: vi.fn(),
        sendRegisters: vi.fn(),
        sendThreads: vi.fn(),
        sendSourceFile: vi.fn(),
      };
      const db2 = new gdbStateDatabase(notifier);
      db2.localsUpdateUI();
      expect(notifier.sendLocals).toHaveBeenCalled();
      db2.removeAllListeners();
    });
  });

  describe("Function store methods", () => {
    it("addFunctionNames adds a function entry for a file", () => {
      db.addFunctionNames("main.c", "42", "main");
      expect(db.gdbFunctionNames.has("main.c")).toBe(true);
      expect(db.gdbFunctionNames.get("main.c")).toHaveLength(1);
    });

    it("getFunctionNames returns functions for an existing file", () => {
      db.addFunctionNames("main.c", "42", "main");
      db.addFunctionNames("main.c", "50", "helper");
      const fns = db.getFunctionNames("main.c");
      expect(fns).toHaveLength(2);
      expect(fns?.[0]).toEqual({ line: "42", function: "main" });
    });

    it("getFunctionNames returns undefined for a missing file", () => {
      expect(db.getFunctionNames("nonexistent.c")).toBeUndefined();
    });

    it("getFunction returns the full function map", () => {
      db.addFunctionNames("main.c", "1", "main");
      db.addFunctionNames("util.c", "10", "helper");
      const map = db.getFunction();
      expect(map.size).toBe(2);
      expect(map.has("main.c")).toBe(true);
      expect(map.has("util.c")).toBe(true);
    });

    it("getAllFunctionNames returns all functions sorted alphabetically", () => {
      db.addFunctionNames("main.c", "1", "zebra");
      db.addFunctionNames("util.c", "5", "alpha");
      db.addFunctionNames("main.c", "10", "middle");
      const all = db.getAllFunctionNames();
      expect(all).toHaveLength(3);
      expect(all[0].function).toBe("alpha");
      expect(all[1].function).toBe("middle");
      expect(all[2].function).toBe("zebra");
    });
  });

  describe("Symbol File methods", () => {
    it("addMainSymbolFile sets the main symbol file path", () => {
      db.addMainSymbolFile("/path/to/main.elf");
      expect(db.gdbSymbolFiles.mainSym).toBe("/path/to/main.elf");
    });

    it("addSection appends a section to symbol files", () => {
      const section: gdbSection = {
        startAddr: "0x1000",
        endAddr: "0x2000",
        section: ".text",
        file: "/path/to/main.elf",
      };
      db.addSection(section);
      expect(db.gdbSymbolFiles.sections).toHaveLength(1);
      expect(db.gdbSymbolFiles.sections[0]).toEqual(section);
    });

    it("getSymbolFiles returns the symbol files object", () => {
      db.addMainSymbolFile("/path/to/app");
      const sym = db.getSymbolFiles();
      expect(sym.mainSym).toBe("/path/to/app");
    });
  });

  describe("UI update and lifecycle methods", () => {
    let mockNotifier: UINotifier;
    let dbN: gdbStateDatabase;

    beforeEach(() => {
      mockNotifier = {
        sendLocals: vi.fn(),
        sendStackFrames: vi.fn(),
        sendBreakpoints: vi.fn(),
        sendRegisters: vi.fn(),
        sendThreads: vi.fn(),
        sendSourceFile: vi.fn(),
      };
      dbN = new gdbStateDatabase(mockNotifier);
    });

    afterEach(() => {
      dbN.removeAllListeners();
    });

    it("stackUpdateUI notifies with current stack frames", () => {
      dbN.stackUpdateUI();
      expect(mockNotifier.sendStackFrames).toHaveBeenCalledWith(dbN.stackFrames);
    });

    it("breakpointsUpdateUI notifies with current breakpoints", () => {
      dbN.breakpointsUpdateUI();
      expect(mockNotifier.sendBreakpoints).toHaveBeenCalledWith(dbN.breakpoints);
    });

    it("breakpointList returns an array of current breakpoints", () => {
      const bkpt: gdbBreakpoint = {
        number: "1",
        type: "breakpoint",
        disp: "keep",
        enabled: "y",
        addr: "0x1000",
        func: "main",
        file: "main.c",
        fullname: "/main.c",
        line: "10",
        tg: "i1",
        times: "0",
        installed: "y",
        orgloc: "main.c:10",
      };
      dbN.createBreakpoint(bkpt);
      const list = dbN.breakpointList();
      expect(list).toHaveLength(1);
      expect(list[0].number).toBe("1");
    });

    it("paramList returns an array of current parameters", () => {
      dbN.addParam("lang", "c");
      dbN.addParam("arch", "x86_64");
      const list = dbN.paramList();
      expect(list).toHaveLength(2);
    });

    it("registersUpdateUI notifies with current registers", () => {
      dbN.registersUpdateUI();
      expect(mockNotifier.sendRegisters).toHaveBeenCalledWith(dbN.registers);
    });

    it("registerList returns an array of current registers", () => {
      dbN.addRegister("0", "rax");
      dbN.addRegister("1", "rbx");
      const list = dbN.registerList();
      expect(list).toHaveLength(2);
    });

    it("threadUpdateUI notifies with threads and thread groups", () => {
      dbN.threadUpdateUI();
      expect(mockNotifier.sendThreads).toHaveBeenCalledWith(dbN.threads, dbN.threadGroups);
    });

    it("clearSourceFiles calls notifier.sendSourceFile with blank source info", () => {
      dbN.clearSourceFiles();
      expect(mockNotifier.sendSourceFile).toHaveBeenCalledWith(
        expect.objectContaining({ fileName: " ", line: "0" }),
      );
    });

    it("clearDatabase clears all stores", () => {
      dbN.addFeature("python");
      dbN.addParam("lang", "c");
      dbN.addStackFrame({
        active: false,
        level: "0",
        func: "main",
        addr: "0x0",
        args: "",
        file: "main.c",
        fullName: "/main.c",
        line: "1",
        from: "",
        arch: "x86_64",
      });
      dbN.clearDatabase();
      expect(dbN.features.size).toBe(0);
      expect(dbN.params.size).toBe(0);
      expect(dbN.stackFrames).toHaveLength(0);
    });

    it("allDataUpdateUI calls all notifier send methods", () => {
      dbN.allDataUpdateUI();
      expect(mockNotifier.sendLocals).toHaveBeenCalled();
      expect(mockNotifier.sendStackFrames).toHaveBeenCalled();
      expect(mockNotifier.sendBreakpoints).toHaveBeenCalled();
      expect(mockNotifier.sendRegisters).toHaveBeenCalled();
      expect(mockNotifier.sendThreads).toHaveBeenCalled();
    });
  });

  describe("addRawLineVarData and Line Variable Map with data", () => {
    const sourceFile = "/home/barry/perftool/main/hello_world_main.c";
    const corpusLines = readFileSync(
      join(__dirname, "../../../../../notes/MaintPrintSymbols--source.txt"),
      "utf-8",
    ).split(/\r?\n/);

    beforeEach(() => {
      vi.spyOn(db.gdbSrcFileCache, "getSourceFileContents").mockResolvedValue(undefined);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("addRawLineVarData populates lineVarStore after async enrichment", async () => {
      db.addRawLineVarData(corpusLines);
      await vi.waitFor(() => {
        expect(db.hasLineVars(sourceFile)).toBe(true);
      });
    });

    it("getLineVars returns the populated map after addRawLineVarData", async () => {
      db.addRawLineVarData(corpusLines);
      await vi.waitFor(() => {
        const map = db.getLineVars(sourceFile);
        expect(map).toBeDefined();
        expect(map?.sourceFile).toBe(sourceFile);
      });
    });

    it("queryVarAtPosition does not throw when map is populated", async () => {
      db.addRawLineVarData(corpusLines);
      await vi.waitFor(() => {
        expect(db.hasLineVars(sourceFile)).toBe(true);
      });
      expect(() => db.queryVarAtPosition(sourceFile, 10, 0)).not.toThrow();
    });

    it("getVarByName returns a variable when its name exists in the map", async () => {
      db.addRawLineVarData(corpusLines);
      await vi.waitFor(() => {
        expect(db.hasLineVars(sourceFile)).toBe(true);
      });
      const map = db.getLineVars(sourceFile)!;
      const firstEntry = [...map.lineVars.values()][0]?.[0];
      if (firstEntry) {
        const found = db.getVarByName(sourceFile, firstEntry.name);
        expect(found).toBeDefined();
        expect(found?.name).toBe(firstEntry.name);
      }
    });

    it("getVarByName returns undefined for an unknown variable name", async () => {
      db.addRawLineVarData(corpusLines);
      await vi.waitFor(() => {
        expect(db.hasLineVars(sourceFile)).toBe(true);
      });
      const result = db.getVarByName(sourceFile, "__nonexistent__");
      expect(result).toBeUndefined();
    });
  });
});
