// @vitest-environment node

import { bench, describe } from "vitest";
import { parseDisasmTokens } from "../../src/main/mi-interface/gdb-parsers/disasmParser";
import { parseAsmRows } from "../../src/main/mi-interface/mi-result-strategies/asm-parsing-helpers";

// ─── parseDisasmTokens ────────────────────────────────────────────────────────

describe("parseDisasmTokens", () => {
  // Empty — early-exit path
  bench("empty input", () => {
    parseDisasmTokens("");
  });

  // Plain text tokens only — no special classification
  bench("plain text (mov a0, a1)", () => {
    parseDisasmTokens("mov a0, a1");
  });

  // Instruction prefix (ends with \t) + address + function label
  bench("instruction + address + function", () => {
    parseDisasmTokens("mov\\t0x40080aec <bootloader_random_enable+92>");
  });

  // Full addressing mode: address, function, parens, nested address+function
  bench("address + function + paren group", () => {
    parseDisasmTokens(
      "0x40080aec <bootloader_random_enable+92> (0x3ffb2b74 <port_xSchedulerRunning>)",
    );
  });
});

// ─── parseAsmRows ─────────────────────────────────────────────────────────────

// Regex fixtures matching what AsmResultStrategy uses
const rgxAsmData = /asm_insns=\[(?<asm_list>.*)]$/;
const rgxAsmRow =
  /(?<asm_row>address="(?<address>[^"]*)",func-name="(?<func>[^"]*)",offset="(?<offset>[^"]*)",opcodes="(?<opcodes>[^"]*)",inst="(?<inst>[^"]*)")/g;

// Realistic 5-instruction block (one function)
const ASM_SMALL = `^done,asm_insns=[address="0x4008000c",func-name="main",offset="0",opcodes="entry\ta1, 48",inst="entry\\ta1, 48",address="0x4008000f",func-name="main",offset="3",opcodes="movi\ta2, 0",inst="movi\\ta2, 0",address="0x40080011",func-name="main",offset="5",opcodes="call0\t0x40080aec",inst="call0\\t0x40080aec <bootloader_random_enable>",address="0x40080014",func-name="main",offset="8",opcodes="mov.n\ta2, a10",inst="mov.n\\ta2, a10",address="0x40080016",func-name="main",offset="10",opcodes="retw.n\t",inst="retw.n"]`;

// Larger block: 20 instructions across two functions
function makeAsmRows(count: number): string {
  const rows: string[] = [];
  for (let i = 0; i < count; i++) {
    const addr = `0x${(0x40080000 + i * 4).toString(16)}`;
    const func = i < count / 2 ? "foo" : "bar";
    const offset = String(i * 4);
    rows.push(`address="${addr}",func-name="${func}",offset="${offset}",opcodes="nop",inst="nop"`);
  }
  return `^done,asm_insns=[${rows.join(",")}]`;
}

const ASM_MEDIUM = makeAsmRows(20);
const ASM_LARGE = makeAsmRows(100);

describe("parseAsmRows", () => {
  bench("5 instructions (one function)", () => {
    parseAsmRows(ASM_SMALL, rgxAsmData, rgxAsmRow, parseDisasmTokens);
  });

  bench("20 instructions (two functions)", () => {
    parseAsmRows(ASM_MEDIUM, rgxAsmData, rgxAsmRow, parseDisasmTokens);
  });

  bench("100 instructions (two functions)", () => {
    parseAsmRows(ASM_LARGE, rgxAsmData, rgxAsmRow, parseDisasmTokens);
  });
});
