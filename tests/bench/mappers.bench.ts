// @vitest-environment node

import { bench, describe } from "vitest";
import { mapRegexGroupsToMemoryData } from "../../src/main/mi-interface/mappers/memory-mapper";

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

const groups16 = makeGroups(HEX_16);
const groups64 = makeGroups(HEX_64);
const groups256 = makeGroups(HEX_256);
const groups1024 = makeGroups(HEX_1024);

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
});
