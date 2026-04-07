// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

const wslMocks = vi.hoisted(() => ({
  execSync: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  execSync: wslMocks.execSync,
}));

import { WslUtilities } from "../../../../src/main/utilities/wsl-utilities";

describe("WslUtilities", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("parses WSL distributions from command output", () => {
    wslMocks.execSync.mockReturnValue(
      Buffer.from(
        "NAME                   STATE           VERSION\r\n* Ubuntu                 Running         2\r\n  Debian                 Stopped         1\r\n\r\n",
        "ascii",
      ),
    );

    expect(WslUtilities.getWslDistrobutions()).toEqual([
      { name: "Ubuntu", state: "Running", version: "2", default: true },
      { name: "Debian", state: "Stopped", version: "1", default: false },
    ]);
  });

  it("parses serial port names from WSL sysfs output", () => {
    wslMocks.execSync.mockReturnValue(
      Buffer.from(
        "/sys/class/tty/ttyS0/device/driver\n/sys/class/tty/ttyUSB1/device/driver\n",
        "ascii",
      ),
    );

    expect(WslUtilities.getWslSerialPorts()).toEqual(["ttyS0", "ttyUSB1"]);
  });
});
