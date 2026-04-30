// @vitest-environment node
/**
 * Tests for gdbSourceFileCache behavior.
 */
import * as fs from "fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gdbSourceFileCache } from "../../../../../src/main/mi-interface/gdb-state-database/gdbSourceFileCache";

// Mock the fs/promises module
vi.mock("fs/promises", () => {
  return {
    readFile: vi.fn(),
  };
});

describe("gdbSourceFileCache class", () => {
  let cache: gdbSourceFileCache;

  beforeEach(() => {
    cache = new gdbSourceFileCache();
    cache.setFilePrefix("//wsl$/Ubuntu");
    vi.clearAllMocks();
  });

  afterEach(() => {
    cache.removeAllListeners();
  });

  describe("constructor", () => {
    it("should create an instance with empty cache", () => {
      expect(cache).toBeInstanceOf(gdbSourceFileCache);
      expect(cache.hasSourceFile("anyfile.c")).toBe(false);
    });

    it("should extend EventEmitter", () => {
      expect(cache.on).toBeDefined();
      expect(cache.emit).toBeDefined();
    });
  });

  describe("hasSourceFile method", () => {
    it("should return false for non-existent files", () => {
      expect(cache.hasSourceFile("test.c")).toBe(false);
      expect(cache.hasSourceFile("main.cpp")).toBe(false);
    });

    it("should return true after file is cached", async () => {
      const mockContent = "int main() { return 0; }";
      vi.mocked(fs.readFile).mockResolvedValue(mockContent);

      await cache.getSourceFileContents("/home/test/main.c");

      expect(cache.hasSourceFile("/home/test/main.c")).toBe(true);
    });

    it("should handle empty string file names", () => {
      expect(cache.hasSourceFile("")).toBe(false);
    });
  });

  describe("getSourceFileContents method", () => {
    it("should read file from disk on first access", async () => {
      const mockContent = "#include <stdio.h>\nint main() {}";
      vi.mocked(fs.readFile).mockResolvedValue(mockContent);

      const result = await cache.getSourceFileContents("/home/user/test.c");

      expect(result).toBe(mockContent);
      expect(fs.readFile).toHaveBeenCalledWith("//wsl$/Ubuntu/home/user/test.c", "utf-8");
      expect(fs.readFile).toHaveBeenCalledTimes(1);
    });

    it("should return cached content on subsequent accesses", async () => {
      const mockContent = "void foo() { bar(); }";
      vi.mocked(fs.readFile).mockResolvedValue(mockContent);

      const result1 = await cache.getSourceFileContents("/path/to/file.c");
      const result2 = await cache.getSourceFileContents("/path/to/file.c");

      expect(result1).toBe(mockContent);
      expect(result2).toBe(mockContent);
      expect(fs.readFile).toHaveBeenCalledTimes(1);
    });

    it("should return undefined for empty file content", async () => {
      vi.mocked(fs.readFile).mockResolvedValue("");

      const result = await cache.getSourceFileContents("/empty/file.c");

      expect(result).toBeUndefined();
    });

    it("should return undefined for empty file path", async () => {
      const result = await cache.getSourceFileContents("");

      expect(result).toBeUndefined();
      expect(fs.readFile).not.toHaveBeenCalled();
    });

    it("should emit error-stream event on file read error", async () => {
      const errorMessage = "ENOENT: no such file or directory";
      vi.mocked(fs.readFile).mockRejectedValue(new Error(errorMessage));

      const errorListener = vi.fn();
      cache.on("error-stream", errorListener);

      const result = await cache.getSourceFileContents("/nonexistent/file.c");

      expect(result).toBeUndefined();
      expect(errorListener).toHaveBeenCalledTimes(1);
      expect(errorListener).toHaveBeenCalledWith(expect.stringContaining("Error reading file"));
      expect(errorListener).toHaveBeenCalledWith(expect.stringContaining("/nonexistent/file.c"));
    });

    it("should handle multiple different files", async () => {
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce("content1")
        .mockResolvedValueOnce("content2")
        .mockResolvedValueOnce("content3");

      const result1 = await cache.getSourceFileContents("/file1.c");
      const result2 = await cache.getSourceFileContents("/file2.c");
      const result3 = await cache.getSourceFileContents("/file3.c");

      expect(result1).toBe("content1");
      expect(result2).toBe("content2");
      expect(result3).toBe("content3");
      expect(fs.readFile).toHaveBeenCalledTimes(3);
    });

    it("should use WSL Ubuntu path prefix", async () => {
      vi.mocked(fs.readFile).mockResolvedValue("content");

      await cache.getSourceFileContents("/home/test/file.c");

      expect(fs.readFile).toHaveBeenCalledWith("//wsl$/Ubuntu/home/test/file.c", "utf-8");
    });

    it("should cache files after successful read", async () => {
      vi.mocked(fs.readFile).mockResolvedValue("cached content");

      const file = "/test/cache.c";
      expect(cache.hasSourceFile(file)).toBe(false);

      await cache.getSourceFileContents(file);

      expect(cache.hasSourceFile(file)).toBe(true);
    });

    it("should not cache files that fail to read", async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error("Read error"));

      const file = "/test/error.c";
      await cache.getSourceFileContents(file);

      expect(cache.hasSourceFile(file)).toBe(false);
    });

    it("should handle files with special characters in path", async () => {
      const specialPath = "/home/user/my file (test).c";
      vi.mocked(fs.readFile).mockResolvedValue("content");

      await cache.getSourceFileContents(specialPath);

      expect(fs.readFile).toHaveBeenCalledWith(`//wsl$/Ubuntu${specialPath}`, "utf-8");
    });

    it("should handle large file content", async () => {
      const largeContent = "x".repeat(1000000);
      vi.mocked(fs.readFile).mockResolvedValue(largeContent);

      const result = await cache.getSourceFileContents("/large/file.c");

      expect(result).toBe(largeContent);
      expect(result?.length).toBe(1000000);
    });
  });

  describe("dump method", () => {
    it("should log cache contents to console", async () => {
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce("content1")
        .mockResolvedValueOnce("longer content here");

      await cache.getSourceFileContents("/file1.c");
      await cache.getSourceFileContents("/file2.c");

      const lines = cache.dump();

      expect(lines).toHaveLength(2);
      expect(lines.some((l) => l.includes("/file1.c"))).toBe(true);
      expect(lines.some((l) => l.includes("/file2.c"))).toBe(true);
      expect(lines.some((l) => l.includes("8"))).toBe(true);
      expect(lines.some((l) => l.includes("19"))).toBe(true);
    });

    it("should not log anything for empty cache", () => {
      const lines = cache.dump();

      expect(lines).toHaveLength(0);
    });

    it("should format file sizes with padding", async () => {
      vi.mocked(fs.readFile).mockResolvedValue("x");
      await cache.getSourceFileContents("/test.c");

      const lines = cache.dump();

      expect(lines[0]).toMatch(/^\s+1 =>/);
    });
  });

  describe("event emitter functionality", () => {
    it("should allow subscribing to error-stream events", async () => {
      const listener = vi.fn();
      cache.on("error-stream", listener);

      vi.mocked(fs.readFile).mockRejectedValue(new Error("Test error"));
      await cache.getSourceFileContents("/error/file.c");

      expect(listener).toHaveBeenCalled();
    });

    it("should allow multiple listeners", async () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      cache.on("error-stream", listener1);
      cache.on("error-stream", listener2);

      vi.mocked(fs.readFile).mockRejectedValue(new Error("Test error"));
      await cache.getSourceFileContents("/error/file.c");

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it("should allow removing listeners", async () => {
      const listener = vi.fn();
      cache.on("error-stream", listener);
      cache.off("error-stream", listener);

      vi.mocked(fs.readFile).mockRejectedValue(new Error("Test error"));
      await cache.getSourceFileContents("/error/file.c");

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("should handle null-like errors gracefully", async () => {
      vi.mocked(fs.readFile).mockRejectedValue(null);

      const listener = vi.fn();
      cache.on("error-stream", listener);

      const result = await cache.getSourceFileContents("/test.c");

      expect(result).toBeUndefined();
      expect(listener).toHaveBeenCalled();
    });

    it("should handle concurrent requests for same file", async () => {
      vi.mocked(fs.readFile).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve("delayed content"), 10);
          }),
      );

      const promise1 = cache.getSourceFileContents("/concurrent.c");
      const promise2 = cache.getSourceFileContents("/concurrent.c");

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // First call reads from disk, second gets from cache
      expect(result1).toBe("delayed content");
      expect(result2).toBe("delayed content");
    });

    it("should handle very long file paths", async () => {
      const longPath = "/very/long/path/" + "a".repeat(200) + "/file.c";
      vi.mocked(fs.readFile).mockResolvedValue("content");

      const result = await cache.getSourceFileContents(longPath);

      expect(result).toBe("content");
      expect(fs.readFile).toHaveBeenCalledWith(`//wsl$/Ubuntu${longPath}`, "utf-8");
    });

    it("should handle files with Unicode characters", async () => {
      const unicodePath = "/home/用户/файл.c";
      vi.mocked(fs.readFile).mockResolvedValue("content");

      const result = await cache.getSourceFileContents(unicodePath);

      expect(result).toBe("content");
    });
  });
});


/**
 * @file gdbSourceFileCache.test.ts
 * @description Source module for gdbSourceFileCache.test.
 */


/**
 * gdbSourceFileCache.test module.
 *
 * @remarks
 * Source module for gdbSourceFileCache.test.
 */
