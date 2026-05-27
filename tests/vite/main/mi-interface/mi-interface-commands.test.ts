/**
 * mi-interface-commands.test module.
 *
 * @remarks
 * Source module for mi-interface-commands.test.
 */

/**
 * @file mi-interface-commands.test.ts
 * @description Source module for mi-interface-commands.test.
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("../../../../src/main/app-settings", () => ({
  AppSettings: {
    getSync: vi.fn(() => false),
    setSync: vi.fn(),
  },
}));

import { miInterface } from "../../../../src/main/mi-interface/mi-interface";

describe("miInterface command wrappers", () => {
  it("routes continueExecution through send", () => {
    const gdb = new miInterface();
    const sendSpy = vi.spyOn(gdb, "send").mockImplementation(() => undefined);

    gdb.continueExecution();

    expect(sendSpy).toHaveBeenCalledWith("continue");
  });

  it("routes stepOver through send", () => {
    const gdb = new miInterface();
    const sendSpy = vi.spyOn(gdb, "send").mockImplementation(() => undefined);

    gdb.stepOver();

    expect(sendSpy).toHaveBeenCalledWith("next");
  });

  it("routes stepInto through send", () => {
    const gdb = new miInterface();
    const sendSpy = vi.spyOn(gdb, "send").mockImplementation(() => undefined);

    gdb.stepInto();

    expect(sendSpy).toHaveBeenCalledWith("step");
  });

  it("routes stepOut through send", () => {
    const gdb = new miInterface();
    const sendSpy = vi.spyOn(gdb, "send").mockImplementation(() => undefined);

    gdb.stepOut();

    expect(sendSpy).toHaveBeenCalledWith("finish");
  });

  it("routes pauseExecution through send", () => {
    const gdb = new miInterface();
    const sendSpy = vi.spyOn(gdb, "send").mockImplementation(() => undefined);

    gdb.pauseExecution();

    expect(sendSpy).toHaveBeenCalledWith("signal SIGINT");
  });

  it("routes stopDebugging through send", () => {
    const gdb = new miInterface();
    const sendSpy = vi.spyOn(gdb, "send").mockImplementation(() => undefined);

    gdb.stopDebugging();

    expect(sendSpy).toHaveBeenCalledWith("kill");
  });

  it("routes runCommand through send", () => {
    const gdb = new miInterface();
    const sendSpy = vi.spyOn(gdb, "send").mockImplementation(() => undefined);

    gdb.runCommand("monitor reset halt");

    expect(sendSpy).toHaveBeenCalledWith("monitor reset halt");
  });
});
