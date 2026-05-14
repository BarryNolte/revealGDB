import { describe, expect, it } from "vitest";
import {
  mapAddThreadArgsToThread,
  mapRegexGroupsToAddThreadArgs,
} from "../../../../../src/main/mi-interface/mappers/thread-mapper";

const frameGroups = {
  level: "0",
  addr: "0x12345",
  func: "main",
  args: "",
  file: "main.c",
  fullName: "/path/main.c",
  line: "10",
  arch: "x86_64",
};

describe("mapRegexGroupsToAddThreadArgs", () => {
  it("returns empty strings for all fields when groups is undefined", () => {
    const result = mapRegexGroupsToAddThreadArgs(undefined, frameGroups, false);

    expect(result.id).toBe("");
    expect(result.targetId).toBe("");
    expect(result.name).toBe("");
    expect(result.details).toBe("");
    expect(result.state).toBe("");
    expect(result.active).toBe(false);
    expect(result.frame).toBe(frameGroups);
  });

  it("uses group values when groups is defined", () => {
    const groups = {
      tid: "1",
      targId: "process 123",
      name: "main-thread",
      details: "some details",
      state: "stopped",
    };

    const result = mapRegexGroupsToAddThreadArgs(groups, frameGroups, true);

    expect(result.id).toBe("1");
    expect(result.targetId).toBe("process 123");
    expect(result.name).toBe("main-thread");
    expect(result.details).toBe("some details");
    expect(result.state).toBe("stopped");
    expect(result.active).toBe(true);
    expect(result.frame).toBe(frameGroups);
  });

  it("falls back to empty string for undefined individual fields within groups", () => {
    const groups: Record<string, string> = { tid: "2" };

    const result = mapRegexGroupsToAddThreadArgs(groups, frameGroups, false);

    expect(result.id).toBe("2");
    expect(result.targetId).toBe("");
    expect(result.name).toBe("");
    expect(result.details).toBe("");
    expect(result.state).toBe("");
  });
});

describe("mapAddThreadArgsToThread", () => {
  it("maps AddThreadArgs to a gdbThread with correct fields", () => {
    const args = {
      id: "1",
      targetId: "process 123",
      name: "main-thread",
      details: "some details",
      state: "stopped",
      active: true,
      frame: frameGroups,
    };

    const thread = mapAddThreadArgsToThread(args);

    expect(thread.id).toBe("1");
    expect(thread.targetId).toBe("process 123");
    expect(thread.name).toBe("main-thread");
    expect(thread.details).toBe("some details");
    expect(thread.state).toBe("stopped");
    expect(thread.active).toBe(true);
    expect(thread.frame.level).toBe("0");
    expect(thread.frame.func).toBe("main");
    expect(thread.frame.addr).toBe("0x12345");
    expect(thread.frame.file).toBe("main.c");
    expect(thread.frame.fullName).toBe("/path/main.c");
    expect(thread.frame.line).toBe("10");
    expect(thread.frame.arch).toBe("x86_64");
    expect(thread.frame.active).toBe(false);
    expect(thread.frame.from).toBe("");
  });
});
