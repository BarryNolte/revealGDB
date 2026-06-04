// @vitest-environment node

import { bench, describe } from "vitest";
import { mapRegexGroupsToBreakpoint } from "../../src/main/mi-interface/mappers/breakpoint-mapper";
import { mapRegexGroupsToMemoryData } from "../../src/main/mi-interface/mappers/memory-mapper";
import { mapToRegisterEntry } from "../../src/main/mi-interface/mappers/register-mapper";

// ─── mapRegexGroupsToMemoryData / parseHexContents ───────────────────────────

// GDB returns hex memory contents as a flat hex string ("aabbccdd...").
// parseHexContents decodes it byte-by-byte using parseInt(byte, 16).
// These benchmarks cover small, medium, and large read sizes.

function makeHex(bytes: number): string {
  // Deterministic pattern: bytes 0x00–0xFF cycling
  let s = "";
  for (let i = 0; i < bytes; i++) {
    s += (i & 0xff).toString(16).padStart(2, "0");
  }
  return s;
}

function makeGroups(hexContents: string): Record<string, string> {
  return {
    begin: "0x20000000",
    offset: "0x0",
    end: `0x${(0x20000000 + hexContents.length / 2).toString(16)}`,
    contents: hexContents,
  };
}

const HEX_16 = makeHex(16); // 16 bytes  — typical register value read
const HEX_64 = makeHex(64); // 64 bytes  — small memory window
const HEX_256 = makeHex(256); // 256 bytes — default memory view row
const HEX_1024 = makeHex(1024); // 1 KiB     — large memory read
const HEX_2048 = makeHex(2048); // 2 KiB     — very large memory read
const HEX_4096 = makeHex(4096); // 4 KiB     — huge memory read
const HEX_8192 = makeHex(8192); // 8 KiB     — huge memory read (exceeds typical page size)
const groups16 = makeGroups(HEX_16);
const groups64 = makeGroups(HEX_64);
const groups256 = makeGroups(HEX_256);
const groups1024 = makeGroups(HEX_1024);
const groups2048 = makeGroups(HEX_2048);
const groups4096 = makeGroups(HEX_4096);
const groups8192 = makeGroups(HEX_8192);

describe("mapRegexGroupsToMemoryData", () => {
  bench("16 bytes", () => {
    mapRegexGroupsToMemoryData(groups16);
  });

  bench("64 bytes", () => {
    mapRegexGroupsToMemoryData(groups64);
  });

  bench("256 bytes", () => {
    mapRegexGroupsToMemoryData(groups256);
  });

  bench("1024 bytes", () => {
    mapRegexGroupsToMemoryData(groups1024);
  });

  bench("2048 bytes", () => {
    mapRegexGroupsToMemoryData(groups2048);
  });

  bench("4096 bytes", () => {
    mapRegexGroupsToMemoryData(groups4096);
  });

  bench("8192 bytes", () => {
    mapRegexGroupsToMemoryData(groups8192);
  });
});

// ─── mapRegexGroupsToBreakpoint ───────────────────────────────────────────────

// GDB emits breakpoint info as named capture groups from a regex match.
// These benchmarks cover a minimal breakpoint and a fully-populated one.

const bpGroupsMinimal: Record<string, string> = {
  number: "1",
  type: "breakpoint",
  disp: "keep",
  enabled: "y",
  addr: "0x00000000",
  func: "",
  file: "",
  fullname: "",
  line: "",
  tg: "",
  times: "0",
  installed: "",
  orgLoc: "",
};

const bpGroupsFull: Record<string, string> = {
  number: "3",
  type: "breakpoint",
  disp: "keep",
  enabled: "y",
  addr: "0x08004abc",
  func: "HAL_UART_Transmit",
  file: "stm32f4xx_hal_uart.c",
  fullname: "/workspace/Drivers/STM32F4xx_HAL_Driver/Src/stm32f4xx_hal_uart.c",
  line: "427",
  tg: "i1",
  times: "5",
  installed: "y",
  orgLoc: "stm32f4xx_hal_uart.c:427",
};

describe("mapRegexGroupsToBreakpoint", () => {
  bench("minimal breakpoint", () => {
    mapRegexGroupsToBreakpoint(bpGroupsMinimal);
  });

  bench("fully populated breakpoint", () => {
    mapRegexGroupsToBreakpoint(bpGroupsFull);
  });
});

// ─── mapToRegisterEntry ───────────────────────────────────────────────────────

// mapToRegisterEntry is called for every register on every stop event.
// The "new register" path (no existing entry) and the "update unchanged" /
// "update changed" paths all follow slightly different code paths.

describe("mapToRegisterEntry", () => {
  bench("new register (no existing entry)", () => {
    mapToRegisterEntry("0", "0x00000000", undefined);
  });

  bench("update register — value unchanged", () => {
    mapToRegisterEntry("0", "0xdeadbeef", { name: "r0", value: "0xdeadbeef", changed: false });
  });

  bench("update register — value changed", () => {
    mapToRegisterEntry("0", "0xcafebabe", { name: "r0", value: "0xdeadbeef", changed: false });
  });
});
