/**
 * mi-output-processor.fuzz module.
 *
 * @remarks
 * Fuzz testing suite for mi-output-processor parseRawOutput function.
 */

/**
 * @file mi-output-processor.fuzz.test.ts
 * @description Fuzz testing module for MiOutputProcessor.parseRawOutput
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { gdbStateDatabase } from "../../../../src/main/mi-interface/gdb-state-database/gdbStateDatabase";
import { MiOutputProcessor } from "../../../../src/main/mi-interface/mi-output-processor";
import { MiOutputHost } from "../../../../src/main/mi-interface/mi-output-types";

const { mockWebContentsSend, notifierMock, setNotifierWatching } = vi.hoisted(() => {
  let watchingConsole = false;

  return {
    mockWebContentsSend: vi.fn(),
    notifierMock: {
      notifyGdbStartup: vi.fn(),
      isWatchingConsole: vi.fn(() => watchingConsole),
      endWatchingConsole: vi.fn(() => {
        watchingConsole = false;
      }),
      consoleCapture: vi.fn(),
    },
    setNotifierWatching: (value: boolean) => {
      watchingConsole = value;
    },
  };
});

vi.mock("../../../../src/main/ipc-sender", () => ({
  sendToRenderer: mockWebContentsSend,
}));

vi.mock("../../../../src/main/utilities/ConnectionNotifier", () => ({
  ConnectionNotifier: {
    getInstance: vi.fn(() => notifierMock),
  },
}));

describe("MiOutputProcessor.parseRawOutput - Fuzz Testing", () => {
  const createHost = (): MiOutputHost => ({
    gdbDB: new gdbStateDatabase(),
    emit: vi.fn(),
    send: vi.fn(),
    getEvaluatingExpression: vi.fn(() => false),
    runOnStopped: vi.fn(),
  });

  afterEach(() => {
    vi.clearAllMocks();
    setNotifierWatching(false);
  });

  // Fuzz with valid MI record prefixes
  describe("Valid MI record type prefixes", () => {
    it.each(["~", "@", "&", "^", "*", "=", "+", "("])("should handle prefix '%s' without crashing", async (prefix) => {
      const host = createHost();
      const processor = new MiOutputProcessor(host);

      const result = await processor.parseRawOutput(prefix);

      expect(result).toBeDefined();
    });

    it("should handle empty string", async () => {
      const host = createHost();
      const processor = new MiOutputProcessor(host);

      const result = await processor.parseRawOutput("");

      expect(result).toBe(true);
    });

    it("should emit error for unknown prefix", async () => {
      const host = createHost();
      const processor = new MiOutputProcessor(host);

      await processor.parseRawOutput("?invalid");

      expect(host.emit).toHaveBeenCalledWith("html-stream", expect.stringContaining("Unknown MI Output"));
    });
  });

  // Fuzz with console stream inputs
  describe("Console stream fuzz", () => {
    const consoleStreamTests = [
      '~"simple text"',
      '~"text with \\"quotes\\""',
      '~"text with \\n newline"',
      '~"text with \\t tab"',
      '~"text with \\\\nnn escape"',
      '~""',
      '~"\\n"',
      '~"\\\\n"',
      '~"mixed\\n\\t\\"content"',
      '~"🚀 unicode"',
      '~"' + "a".repeat(1000) + '"',
      '~"incomplete',
      "~missing quote",
    ];

    it.each(consoleStreamTests)("should handle console stream: %s", async (input) => {
      const host = createHost();
      const processor = new MiOutputProcessor(host);

      await expect(processor.parseRawOutput(input)).resolves.toBeDefined();
    });
  });

  // Fuzz with log stream inputs
  describe("Log stream fuzz", () => {
    const logStreamTests = [
      '&"debug message"',
      '&"message with \\n"',
      '&"message with \\t"',
      '&""',
      '&"' + "b".repeat(1000) + '"',
      '&incomplete',
      "&missing quote",
      "&no quotes",
    ];

    it.each(logStreamTests)("should handle log stream: %s", async (input) => {
      const host = createHost();
      const processor = new MiOutputProcessor(host);

      await expect(processor.parseRawOutput(input)).resolves.toBeDefined();
    });
  });

  // Fuzz with target stream inputs
  describe("Target stream fuzz", () => {
    const targetStreamTests = [
      "@target message",
      "@",
      "@" + "c".repeat(500),
      "@with special chars !@#$%^&*()",
    ];

    it.each(targetStreamTests)("should handle target stream: %s", async (input) => {
      const host = createHost();
      const processor = new MiOutputProcessor(host);

      await expect(processor.parseRawOutput(input)).resolves.toBeDefined();
    });
  });

  // Fuzz with result record inputs
  describe("Result record fuzz", () => {
    const resultRecordTests = [
      "^done",
      "^done,key=value",
      "^error,msg=message",
      "^running",
      "^connected",
      "^" + "d".repeat(100),
      "^done,complex={nested={deep=value}}",
      "^done,array=[1,2,3]",
    ];

    it.each(resultRecordTests)("should handle result record: %s", async (input) => {
      const host = createHost();
      const processor = new MiOutputProcessor(host);

      await expect(processor.parseRawOutput(input)).resolves.toBeDefined();
    });
  });

  // Fuzz with exec async records
  describe("Exec async record fuzz", () => {
    const execAsyncTests = [
      "*stopped",
      "*running",
      "*" + "e".repeat(100),
      "*stopped,reason=breakpoint-hit",
    ];

    it.each(execAsyncTests)("should handle exec async record: %s", async (input) => {
      const host = createHost();
      const processor = new MiOutputProcessor(host);

      await expect(processor.parseRawOutput(input)).resolves.toBeDefined();
    });
  });

  // Fuzz with notify async records
  describe("Notify async record fuzz", () => {
    const notifyAsyncTests = [
      "=thread-created",
      "=thread-exited",
      "=" + "f".repeat(100),
      "=thread-selected",
    ];

    it.each(notifyAsyncTests)("should handle notify async record: %s", async (input) => {
      const host = createHost();
      const processor = new MiOutputProcessor(host);

      await expect(processor.parseRawOutput(input)).resolves.toBeDefined();
    });
  });

  // Fuzz with status async records
  describe("Status async record fuzz", () => {
    const statusAsyncTests = [
      "+download",
      "+" + "g".repeat(100),
      "+thread-created",
    ];

    it.each(statusAsyncTests)("should handle status async record: %s", async (input) => {
      const host = createHost();
      const processor = new MiOutputProcessor(host);

      await expect(processor.parseRawOutput(input)).resolves.toBeDefined();
    });
  });

  // Fuzz with gdb idle prompt
  describe("GDB idle prompt fuzz", () => {
    const gdbIdleTests = [
      "(gdb)",
      "(gdb) ",
      "(gdb)\n",
      "(" + "h".repeat(100),
      "(gdb extra)",
    ];

    it.each(gdbIdleTests)("should handle gdb prompt: %s", async (input) => {
      const host = createHost();
      const processor = new MiOutputProcessor(host);

      await expect(processor.parseRawOutput(input)).resolves.toBeDefined();
    });
  });

  // Fuzz with special characters and edge cases
  describe("Special characters and edge cases", () => {
    const specialCases = [
      "~\"\\x00null byte\"",
      "~\"emoji 😀 test\"",
      "~\"\\\\backslash\"",
      "~\"quote\\\"escape\"",
      "~\"line\\nbreak\"",
      "~\"tab\\there\"",
      "~\"mixed\\n\\t\\\\escapes\"",
      "\u0000",
      "\n",
      "\r\n",
      "\t",
      " ".repeat(1000),
      "~".repeat(100),
      "*".repeat(100),
      "=" + "i".repeat(500),
      "^" + "j".repeat(500),
    ];

    it.each(specialCases)("should handle special case without throwing", async (input) => {
      const host = createHost();
      const processor = new MiOutputProcessor(host);

      await expect(processor.parseRawOutput(input)).resolves.toBeDefined();
    });
  });

  // Randomized fuzz testing
  describe("Randomized fuzz testing", () => {
    const generateRandomString = (length: number): string => {
      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:',.<>?/";
      let result = "";
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    const miPrefixes = ["~", "@", "&", "^", "*", "=", "+", "("];

    it("should handle 100 random inputs with MI prefixes", async () => {
      const host = createHost();
      const processor = new MiOutputProcessor(host);

      for (let i = 0; i < 100; i++) {
        const prefix = miPrefixes[Math.floor(Math.random() * miPrefixes.length)];
        const randomString = generateRandomString(Math.floor(Math.random() * 500));
        const input = prefix + randomString;

        await expect(processor.parseRawOutput(input)).resolves.toBeDefined();
      }
    });

    it("should handle 50 random strings without MI prefixes", async () => {
      const host = createHost();
      const processor = new MiOutputProcessor(host);

      for (let i = 0; i < 50; i++) {
        const input = Math.random() > 0.5 ? generateRandomString(Math.floor(Math.random() * 300)) : String.fromCharCode(Math.floor(Math.random() * 128));

        await expect(processor.parseRawOutput(input)).resolves.toBeDefined();
      }
    });

    it("should handle very large inputs", async () => {
      const host = createHost();
      const processor = new MiOutputProcessor(host);

      const largeInputs = [
        "~\"" + "a".repeat(10000) + "\"",
        "^done," + "key=value,".repeat(1000),
        "*" + "x".repeat(5000),
      ];

      for (const input of largeInputs) {
        await expect(processor.parseRawOutput(input)).resolves.toBeDefined();
      }
    });
  });

  // Fuzz error handling - ensure no unhandled exceptions
  describe("Error handling robustness", () => {
    it("should not throw on null-like characters", async () => {
      const host = createHost();
      const processor = new MiOutputProcessor(host);

      const nullLikeInputs = ["\0", "\x00", "\x01", "\x1f"];

      for (const input of nullLikeInputs) {
        await expect(processor.parseRawOutput(input)).resolves.toBeDefined();
      }
    });

    it("should not throw on control characters", async () => {
      const host = createHost();
      const processor = new MiOutputProcessor(host);

      for (let i = 0; i <= 31; i++) {
        const input = String.fromCharCode(i);

        await expect(processor.parseRawOutput(input)).resolves.toBeDefined();
      }
    });

    it("should handle deeply nested JSON-like structures", async () => {
      const host = createHost();
      const processor = new MiOutputProcessor(host);

      let nestedStructure = "value";
      for (let i = 0; i < 50; i++) {
        nestedStructure = `{key="${nestedStructure}"}`;
      }

      const input = "^done," + nestedStructure;

      await expect(processor.parseRawOutput(input)).resolves.toBeDefined();
    });
  });

  // Partial regex match fuzz - tests that match parts of regexes but not complete patterns
  describe("Partial regex match fuzz", () => {
    describe("Console stream (~/\") regex partial matches", () => {
     const consolePartialTests = [
       // Missing closing quote
       '~"text without closing quote',
       '~"mixed\\n\\t content',
       '~"content\\nwith\\nescape',
       // Missing opening quote
       '~text with missing opening"',
       '~\nmissing opening quote"',
       // Missing both quotes
       "~text in the middle",
       // Only prefix
       "~",
       '~"',
       // Extra quotes
       '~"text"with"extra"quotes"',
       '~""empty with quotes""',
       // Mismatched quotes
       '~"text with \' single quote',
       "~'text with double quote\"",
       // Only closing quote
       '~text with only closing"',
       // Whitespace variations
       '~" "',
       '~"   "',
       '~"\\n"',
       '~"\\t"',
       '~"',
       // Special characters
       '~"\\u0041"',
       '~"line1\\nline2\\nline3"',
       '~"tab\\there"',
     ];

     it.each(consolePartialTests)("should handle partial console regex: %s", async (input) => {
       const host = createHost();
       const processor = new MiOutputProcessor(host);

       await expect(processor.parseRawOutput(input)).resolves.toBeDefined();
     });
    });

    describe("Log stream (&/\") regex partial matches", () => {
     const logPartialTests = [
       // Missing closing quote
       '&"log message without closing',
       '&"debug\\n\\terror output',
       // Missing opening quote
       '&log message with missing opening"',
       '&\nmissing opening"',
       // Missing both quotes
       "&log message in the middle",
       // Only prefix
       "&",
       '&"',
       // Extra quotes
       '&"log"with"extra"quotes"',
       '&""empty with quotes""',
       // Mismatched quotes
       '&"log with \' single quote',
       "&'log with double quote\"",
       // Only closing quote
       '&log with only closing"',
       // Whitespace variations
       '&" "',
       '&"   "',
       '&"\\n"',
       '&"\\t"',
       '&"',
       // Special characters
       '&"\\u0048"',
       '&"msg1\\nmsg2\\nmsg3"',
       '&"indent\\there"',
     ];

     it.each(logPartialTests)("should handle partial log regex: %s", async (input) => {
       const host = createHost();
       const processor = new MiOutputProcessor(host);

       await expect(processor.parseRawOutput(input)).resolves.toBeDefined();
     });
    });

    describe("Regex edge cases - boundary conditions", () => {
     const boundaryTests = [
       // Strings that almost match but have extra characters
       '~"valid"extra',
       '&"valid"extra',
       // Strings with only delimiters
       '~""',
       '&""',
       // Multiple prefix characters
       '~~"text"',
       '&&"text"',
       // Prefix followed by non-quote
       '~text"',
       '&text"',
       // Quote followed by prefix
       '"~text',
       '"&text',
       // Nested quotes
       '~"\\"nested\\""',
       '&"\\"nested\\""',
       // Incomplete escape sequences
       '~"text\\',
       '&"text\\',
       '~"text\\n"',
       '&"text\\n"',
       // Mixed valid and invalid patterns
       '~"valid" ~"another"',
       '&"valid" &"another"',
     ];

     it.each(boundaryTests)("should handle boundary condition: %s", async (input) => {
       const host = createHost();
       const processor = new MiOutputProcessor(host);

       await expect(processor.parseRawOutput(input)).resolves.toBeDefined();
     });
    });

    describe("Regex variations with escaped content", () => {
     const escapedTests = [
       // Properly escaped quotes
       '~"text with \\"escaped\\" quotes"',
       '&"text with \\"escaped\\" quotes"',
       // Escaped backslashes
       '~"path\\\\to\\\\file"',
       '&"path\\\\to\\\\file"',
       // Multiple escape sequences
       '~"\\n\\t\\r\\n\\t"',
       '&"\\n\\t\\r\\n\\t"',
       // Escaped characters without closing quote
       '~"escaped\\"but no close',
       '&"escaped\\"but no close',
       // Backslash at end without quote
       '~"text ending with\\',
       '&"text ending with\\',
       // Mixed escapes
       '~"text\\"with\\nmixed\\tescapes"',
       '&"text\\"with\\nmixed\\tescapes"',
       // Invalid escapes that pass through
       '~"text\\x\\y\\z"',
       '&"text\\x\\y\\z"',
     ];

     it.each(escapedTests)("should handle escaped content: %s", async (input) => {
       const host = createHost();
       const processor = new MiOutputProcessor(host);

       await expect(processor.parseRawOutput(input)).resolves.toBeDefined();
     });
    });

    describe("Regex with zero-width and minimal content", () => {
     const minimalTests = [
       // Zero-width content
       '~""',
       '&""',
       // Single character content
       '~"a"',
       '&"b"',
       '~"1"',
       '&"2"',
       // Single escape sequence
       '~"\\n"',
       '&"\\t"',
       '~"\\"',
       '&"\\"',
       // Single quote only
       '~"',
       '&"',
       // Repeated patterns
       '~""~""',
       '&""&""',
       // Multiple consecutive quotes
       '~"""',
       '&"""',
       '~""""',
       '&""""',
     ];

     it.each(minimalTests)("should handle minimal/zero-width patterns: %s", async (input) => {
       const host = createHost();
       const processor = new MiOutputProcessor(host);

       await expect(processor.parseRawOutput(input)).resolves.toBeDefined();
     });
    });

    describe("Regex pattern mutations", () => {
     const mutationTests = [
       // Similar prefixes
       '~"text"',
       '&"text"',
       '@"text"',
       '"~text"',
       '"&text"',
       // Offset positions
       'prefix~"text"',
       'prefix&"text"',
       '~"text"suffix',
       '&"text"suffix',
       // Duplicated patterns
       '~"~"text""',
       '&"&"text""',
       // Alternating patterns
       '~&"text"',
       '&~"text"',
       // Pattern with line breaks
       '~"line1\\nline2"',
       '&"line1\\nline2"',
       // Pattern with various whitespace
       '~"  text  "',
       '&"  text  "',
       // Greedy vs non-greedy matching
       '~"first"text"last"',
       '&"first"text"last"',
     ];

     it.each(mutationTests)("should handle pattern mutations: %s", async (input) => {
       const host = createHost();
       const processor = new MiOutputProcessor(host);

       await expect(processor.parseRawOutput(input)).resolves.toBeDefined();
     });
    });

    describe("Regex combined attack vectors", () => {
     it("should handle combination of partial matches and special characters", async () => {
       const host = createHost();
       const processor = new MiOutputProcessor(host);

       const combinedTests = [
         '~"\\x00\\x01\\x02"',
         '&"\\xff\\xfe\\xfd"',
         '~"<script>alert(1)</script>"',
         '&"${7*7}"',
         "~\"'; DROP TABLE;--\"",
         '&"`rm -rf /`"',
         "~\"` command injection `\"",
         '&"$(whoami)"',
         '~"|cat /etc/passwd"',
         '&"|| powershell"',
       ];

       for (const input of combinedTests) {
         await expect(processor.parseRawOutput(input)).resolves.toBeDefined();
       }
     });

     it("should handle rapid-fire partial matches", async () => {
       const host = createHost();
       const processor = new MiOutputProcessor(host);

       // Simulate receiving partial matches in rapid succession
       const inputs = [
         '~"incomplete',
         '~"another incomplete',
         '~""',
         '~"finally closed"',
         '&"log incomplete',
         '&"log also incomplete',
         '&""',
         '&"log finally closed"',
       ];

       for (const input of inputs) {
         await expect(processor.parseRawOutput(input)).resolves.toBeDefined();
       }
     });

     it("should handle regex catastrophic backtracking attempts", async () => {
       const host = createHost();
       const processor = new MiOutputProcessor(host);

       // Tests designed to potentially cause regex backtracking issues
       const backtrackingTests = [
         '~"' + 'a'.repeat(1000) + '\\n',
         '&"' + 'b'.repeat(1000) + '\\t',
         '~"' + 'x"y'.repeat(500),
         '&"' + 'z"w'.repeat(500),
         '~"' + '\\'.repeat(500),
         '&"' + '\\'.repeat(500),
       ];

       for (const input of backtrackingTests) {
         await expect(processor.parseRawOutput(input)).resolves.toBeDefined();
       }
     });
    });
  });

  // Aggressive edge case fuzz testing - looking for failures
  describe("Aggressive edge case fuzz testing", () => {
   describe("Regex non-greedy matching edge cases", () => {
     const nonGreedyTests = [
       // Multiple quotes - regex should stop at first closing quote
       '~"first"second"third"',
       '&"first"second"third"',
       // Quotes in the middle with escaped quotes
       '~"text with \\"quote\\" inside"',
       '&"text with \\"quote\\" inside"',
       // Consecutive escaped quotes
       '~"\\"\\"\\"\\""',
       '&"\\"\\"\\"\\""',
       // Mixed escaped and unescaped quotes
       '~"some\\"escaped\\"but not all"extra"',
       '&"some\\"escaped\\"but not all"extra"',
       // Pattern that might confuse non-greedy matching
       '~"a"b"c"d"',
       '&"a"b"c"d"',
     ];

     it.each(nonGreedyTests)("should handle non-greedy matching: %s", async (input) => {
       const host = createHost();
       const processor = new MiOutputProcessor(host);

       await expect(processor.parseRawOutput(input)).resolves.toBeDefined();
     });
   });

   describe("Escape sequence edge cases", () => {
     const escapeTests = [
       // Double backslashes
       '~"\\\\"',
       '&"\\\\"',
       '~"\\\\\\\\"',
       '&"\\\\\\\\"',
       // Backslash followed by various characters
       '~"\\a\\b\\c\\d"',
       '&"\\a\\b\\c\\d"',
       // Mixed valid and invalid escapes
       '~"\\n\\x\\t\\y"',
       '&"\\n\\x\\t\\y"',
       // Escape at end
       '~"text\\"',
       '&"text\\"',
       // Multiple escapes in sequence
       '~"\\\\\\\\\\\\\\n"',
       '&"\\\\\\\\\\\\\\n"',
       // Escaped characters that decodeMiEscapes might process
       '~"\\nnn"',
       '&"\\nnn"',
       '~"text\\nnmore"',
       '&"text\\nnmore"',
       // Only escape sequences
       '~"\\\\\\"\\t\\n"',
       '&"\\\\\\"\\t\\n"',
     ];

     it.each(escapeTests)("should handle escape sequences: %s", async (input) => {
       const host = createHost();
       const processor = new MiOutputProcessor(host);

       await expect(processor.parseRawOutput(input)).resolves.toBeDefined();
     });
   });

   describe("Decode escape function edge cases", () => {
     const decodeTests = [
       // The decodeMiEscapes function handles: \\nnn, \", \t, \n
       '~"test\\nnninside"',
       '&"test\\nnninside"',
       // Incomplete escape sequences
       '~"text\\n"',
       '&"text\\n"',
       // Multiple \\nnn patterns
       '~"\\nnn\\nnn\\nnn"',
       '&"\\nnn\\nnn\\nnn"',
       // \\nnn followed by regular characters
       '~"\\nnntext"',
       '&"\\nnntext"',
       // Text before and after \\nnn
       '~"start\\nnnend"',
       '&"start\\nnnend"',
       // Just \\nnn
       '~"\\nnn"',
       '&"\\nnn"',
       // Escaped quote followed by \\nnn
       '~"\\"\\nnn"',
       '&"\\"\\nnn"',
     ];

     it.each(decodeTests)("should handle decode edge cases: %s", async (input) => {
       const host = createHost();
       const processor = new MiOutputProcessor(host);

       await expect(processor.parseRawOutput(input)).resolves.toBeDefined();
     });
   });

   describe("Very long and deeply nested patterns", () => {
     it("should handle extremely long quoted strings", async () => {
       const host = createHost();
       const processor = new MiOutputProcessor(host);

       const longTests = [
         '~"' + 'a'.repeat(50000) + '"',
         '&"' + 'b'.repeat(50000) + '"',
         '~"' + 'x"y'.repeat(5000),
         '&"' + 'z"w'.repeat(5000),
       ];

       for (const input of longTests) {
         await expect(processor.parseRawOutput(input)).resolves.toBeDefined();
       }
     });

     it("should handle deeply nested escape sequences", async () => {
       const host = createHost();
       const processor = new MiOutputProcessor(host);

       // Create a string with many escape sequences
       let escapedString = '';
       for (let i = 0; i < 500; i++) {
         escapedString += '\\n\\t\\"';
       }

       const inputs = [
         '~"' + escapedString + '"',
         '&"' + escapedString + '"',
       ];

       for (const input of inputs) {
         await expect(processor.parseRawOutput(input)).resolves.toBeDefined();
       }
     });

     it("should handle alternating valid patterns", async () => {
       const host = createHost();
       const processor = new MiOutputProcessor(host);

       // Alternating valid and invalid patterns
       let alternating = '';
       for (let i = 0; i < 100; i++) {
         alternating += (i % 2 === 0) ? '~"text"' : '"text"~';
       }

       await expect(processor.parseRawOutput(alternating)).resolves.toBeDefined();
     });
   });

   describe("Incomplete and malformed patterns at boundaries", () => {
     const malformedTests = [
       // Patterns missing final components
       '~"',
       '&"',
       '~',
       '&',
       // Patterns with only escape at boundary
       '~"\\',
       '&"\\',
       // Multiple quotes with spaces
       '~"  "  "',
       '&"  "  "',
       // Quote sandwich patterns
       '"~"text"~"',
       '"&"text"&"',
       // Prefix repetition
       '~~~"text"',
       '&&&"text"',
       // Alternating prefixes
       '~&~"text"',
       '&~&"text"',
       // Unicode prefix attempts
       'Ã~"text"',
       'Ã&"text"',
     ];

     it.each(malformedTests)("should handle malformed patterns: %s", async (input) => {
       const host = createHost();
       const processor = new MiOutputProcessor(host);

       await expect(processor.parseRawOutput(input)).resolves.toBeDefined();
     });
   });

   describe("Combinations that stress the regex engine", () => {
     it("should handle potential regex bomb patterns", async () => {
       const host = createHost();
       const processor = new MiOutputProcessor(host);

       const regexBombPatterns = [
         // Alternating quote patterns that might cause backtracking
         '~"' + '"'.repeat(1000),
         '&"' + '"'.repeat(1000),
         // Escaped quotes repeated
         '~"' + '\\"'.repeat(500) + '"',
         '&"' + '\\"'.repeat(500) + '"',
         // Backslash patterns
         '~"' + '\\'.repeat(1000),
         '&"' + '\\'.repeat(1000),
         // Mixed quote and backslash
         '~"' + '\\"'.repeat(100) + '\\'.repeat(100),
         '&"' + '\\"'.repeat(100) + '\\'.repeat(100),
       ];

       for (const input of regexBombPatterns) {
         await expect(processor.parseRawOutput(input)).resolves.toBeDefined();
       }
     });

     it("should handle pathological case combinations", async () => {
       const host = createHost();
       const processor = new MiOutputProcessor(host);

       const pathologicalCases = [
         // Escaped backslash followed by quote
         '~"\\\\\\"',
         '&"\\\\\\"',
         // Escaped escape followed by newline
         '~"\\\\\\n"',
         '&"\\\\\\n"',
         // Complex escape mixture
         '~"\\t\\n\\t\\n\\t\\n"',
         '&"\\t\\n\\t\\n\\t\\n"',
         // Escaped quotes mixed with newlines
         '~"\\"\\n\\"\\n\\""',
         '&"\\"\\n\\"\\n\\""',
       ];

       for (const input of pathologicalCases) {
         await expect(processor.parseRawOutput(input)).resolves.toBeDefined();
       }
     });
   });

   describe("Potential parsing issues with specific characters", () => {
     it("should handle null bytes and control characters in quoted strings", async () => {
       const host = createHost();
       const processor = new MiOutputProcessor(host);

       const controlCharTests = [
         '~"' + String.fromCharCode(0) + '"',
         '&"' + String.fromCharCode(0) + '"',
         '~"' + String.fromCharCode(1) + String.fromCharCode(2) + '"',
         '&"' + String.fromCharCode(3) + String.fromCharCode(4) + '"',
         '~"text' + String.fromCharCode(0) + 'more"',
         '&"log' + String.fromCharCode(1) + 'text"',
       ];

       for (const input of controlCharTests) {
         await expect(processor.parseRawOutput(input)).resolves.toBeDefined();
       }
     });

     it("should handle unusual Unicode patterns", async () => {
       const host = createHost();
       const processor = new MiOutputProcessor(host);

       const unicodeTests = [
         '~"' + '𝐀'.repeat(100) + '"', // Mathematical alphanumeric symbols
         '&"' + '✓'.repeat(100) + '"', // Dingbats
         '~"' + '\u202E' + 'text' + '"', // Right-to-left override
         '&"' + '\u200B' + 'text' + '"', // Zero-width space
         '~"emoji' + '😀😁😂😃😄😅😆😇😈😉' + '"',
         '&"symbols' + '▀▁▂▃▄▅▆▇█' + '"',
       ];

       for (const input of unicodeTests) {
         await expect(processor.parseRawOutput(input)).resolves.toBeDefined();
       }
     });

     it("should handle whitespace edge cases", async () => {
       const host = createHost();
       const processor = new MiOutputProcessor(host);

       const whitespaceTests = [
         '~" "', // single space
         '&" "',
         '~"' + ' '.repeat(1000) + '"', // many spaces
         '&"' + ' '.repeat(1000) + '"',
         '~"\t"', // tab
         '&"\t"',
         '~"' + '\t'.repeat(500) + '"', // many tabs
         '&"' + '\t'.repeat(500) + '"',
         '~"' + '\n' + '"', // newline (if allowed)
         '&"' + '\n' + '"',
         '~"' + ' \t \n \t ' + '"', // mixed whitespace
         '&"' + ' \t \n \t ' + '"',
       ];

       for (const input of whitespaceTests) {
         await expect(processor.parseRawOutput(input)).resolves.toBeDefined();
       }
     });
   });

   describe("Statistical fuzzing with computed patterns", () => {
     it("should survive 500 random pattern combinations", async () => {
       const host = createHost();
       const processor = new MiOutputProcessor(host);

       const chars = ['~', '&', '@', '"', '\\', 'a', 'b', '1', '2', '\n', '\t'];
       const lengths = [1, 2, 5, 10, 50, 100, 500];

       for (let i = 0; i < 500; i++) {
         let pattern = '';
         const length = lengths[Math.floor(Math.random() * lengths.length)];
         for (let j = 0; j < length; j++) {
           pattern += chars[Math.floor(Math.random() * chars.length)];
         }

         await expect(processor.parseRawOutput(pattern)).resolves.toBeDefined();
       }
     });

     it("should handle mutation of valid patterns", async () => {
       const host = createHost();
       const processor = new MiOutputProcessor(host);

       const basePatterns = ['~"text"', '&"log"', '~"\\n"', '&"\\t"'];
       const mutations = ['', 'x', '"', '\\', '\0', '😀', '...'];

       for (const base of basePatterns) {
         for (const mutation of mutations) {
           // Insert mutation at various positions
           for (let pos = 0; pos <= base.length; pos++) {
             const mutated = base.slice(0, pos) + mutation + base.slice(pos);
             await expect(processor.parseRawOutput(mutated)).resolves.toBeDefined();
           }
         }
       }
     });
   });
  });
});
