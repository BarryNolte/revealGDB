/**
 * CommandHistory.test module.
 *
 * @remarks
 * Source module for CommandHistory.test.
 */

/**
 * @file CommandHistory.test.ts
 * @description Source module for CommandHistory.test.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { CommandHistory } from "../../../../src/renderer/utilities/CommandHistory";

describe("CommandHistory class", () => {
  let history: CommandHistory;

  beforeEach(() => {
    history = new CommandHistory();
  });

  describe("constructor and initialization", () => {
    it("should initialize with empty history", () => {
      expect(history.commandHistory).toEqual([]);
    });
  });

  describe("add method", () => {
    it("should add a command to history", () => {
      history.add("command1");
      expect(history.commandHistory).toEqual(["command1"]);
    });

    it("should add multiple commands in order", () => {
      history.add("cmd1");
      history.add("cmd2");
      history.add("cmd3");
      expect(history.commandHistory).toEqual(["cmd1", "cmd2", "cmd3"]);
    });

    it("should not add empty strings", () => {
      history.add("");
      expect(history.commandHistory).toEqual([]);
    });

    it("should not add strings with only spaces", () => {
      history.add("   ");
      expect(history.commandHistory).toEqual([]);
    });

    it("should add strings with tabs or newlines (not filtered)", () => {
      history.add("\t");
      history.add("\n");
      expect(history.commandHistory).toHaveLength(2);
    });

    it("should remove duplicate command and re-add at the end", () => {
      history.add("cmd1");
      history.add("cmd2");
      history.add("cmd1");
      expect(history.commandHistory).toEqual(["cmd2", "cmd1"]);
    });

    it("should move duplicate to end when added multiple times", () => {
      history.add("cmd1");
      history.add("cmd2");
      history.add("cmd3");
      history.add("cmd1");
      expect(history.commandHistory).toEqual(["cmd2", "cmd3", "cmd1"]);
    });

    it("should limit history to 100 commands", () => {
      for (let i = 0; i < 105; i++) {
        history.add(`cmd${i}`);
      }
      expect(history.commandHistory).toHaveLength(100);
      // Should remove the first 5 commands (cmd0 to cmd4)
      expect(history.commandHistory[0]).toBe("cmd5");
      expect(history.commandHistory[99]).toBe("cmd104");
    });

    it("should set historyIndex to end of history after adding", () => {
      history.add("cmd1");
      history.add("cmd2");
      // After adding, getPrevious should return the last added command
      expect(history.getPrevious()).toBe("cmd2");
    });

    it("should only filter spaces, not other whitespace characters", () => {
      history.add("  ");
      expect(history.commandHistory).toEqual([]);
      // tabs and newlines are not filtered, only spaces
      history.add("\t\t\t");
      history.add("\n");
      expect(history.commandHistory).toHaveLength(2);
    });

    it("should preserve internal whitespace in commands", () => {
      history.add("cmd with spaces");
      expect(history.commandHistory).toEqual(["cmd with spaces"]);
    });
  });

  describe("getPrevious method", () => {
    beforeEach(() => {
      history.add("cmd1");
      history.add("cmd2");
      history.add("cmd3");
    });

    it("should return the previous command", () => {
      expect(history.getPrevious()).toBe("cmd3");
      expect(history.getPrevious()).toBe("cmd2");
      expect(history.getPrevious()).toBe("cmd1");
    });

    it("should return undefined at the start of history", () => {
      history.getPrevious(); // cmd3
      history.getPrevious(); // cmd2
      history.getPrevious(); // cmd1
      expect(history.getPrevious()).toBeUndefined();
    });

    it("should allow navigation backwards through all commands", () => {
      const cmd3 = history.getPrevious();
      const cmd2 = history.getPrevious();
      const cmd1 = history.getPrevious();
      const before = history.getPrevious();

      expect(cmd3).toBe("cmd3");
      expect(cmd2).toBe("cmd2");
      expect(cmd1).toBe("cmd1");
      expect(before).toBeUndefined();
    });

    it("should work with single command in history", () => {
      const singleHistory = new CommandHistory();
      singleHistory.add("onlyCmd");
      expect(singleHistory.getPrevious()).toBe("onlyCmd");
      expect(singleHistory.getPrevious()).toBeUndefined();
    });

    it("should not go below index 0", () => {
      history.getPrevious(); // cmd3
      history.getPrevious(); // cmd2
      history.getPrevious(); // cmd1
      const atStart1 = history.getPrevious();
      const atStart2 = history.getPrevious();

      expect(atStart1).toBeUndefined();
      expect(atStart2).toBeUndefined();
    });
  });

  describe("getNext method", () => {
    beforeEach(() => {
      history.add("cmd1");
      history.add("cmd2");
      history.add("cmd3");
    });

    it("should return the next command after going previous", () => {
      history.getPrevious(); // cmd3
      history.getPrevious(); // cmd2
      expect(history.getNext()).toBe("cmd3");
    });

    it("should return undefined when at the end of history", () => {
      history.getPrevious(); // Move into history
      const next = history.getNext(); // Should go back to end
      expect(next).toBeUndefined();
    });

    it("should navigate forward after navigating backward", () => {
      history.getPrevious(); // cmd3
      history.getPrevious(); // cmd2
      history.getPrevious(); // cmd1
      expect(history.getNext()).toBe("cmd2");
      expect(history.getNext()).toBe("cmd3");
      expect(history.getNext()).toBeUndefined();
    });

    it("should not move forward if already at the end", () => {
      const result1 = history.getNext();
      const result2 = history.getNext();

      expect(result1).toBeUndefined();
      expect(result2).toBeUndefined();
    });

    it("should work after reset", () => {
      history.getPrevious(); // cmd3
      history.reset();
      expect(history.getNext()).toBeUndefined();
    });
  });

  describe("reset method", () => {
    beforeEach(() => {
      history.add("cmd1");
      history.add("cmd2");
      history.add("cmd3");
    });

    it("should reset history index to end of history", () => {
      history.getPrevious(); // cmd3
      history.getPrevious(); // cmd2
      history.reset();
      expect(history.getPrevious()).toBe("cmd3");
    });

    it("should make getNext return undefined after reset", () => {
      history.getPrevious(); // cmd3
      history.reset();
      expect(history.getNext()).toBeUndefined();
    });

    it("should allow re-navigating history after reset", () => {
      history.getPrevious();
      history.reset();
      expect(history.getPrevious()).toBe("cmd3");
      expect(history.getPrevious()).toBe("cmd2");
    });

    it("should reset even with empty history", () => {
      const emptyHistory = new CommandHistory();
      emptyHistory.reset();
      expect(emptyHistory.getPrevious()).toBeUndefined();
    });
  });

  describe("clearHistory method", () => {
    beforeEach(() => {
      history.add("cmd1");
      history.add("cmd2");
      history.add("cmd3");
    });

    it("should clear all commands from history", () => {
      history.clearHistory();
      expect(history.commandHistory).toEqual([]);
    });

    it("should reset history index when clearing", () => {
      history.getPrevious();
      history.clearHistory();
      expect(history.getPrevious()).toBeUndefined();
    });

    it("should allow adding commands after clearing", () => {
      history.clearHistory();
      history.add("newCmd");
      expect(history.commandHistory).toEqual(["newCmd"]);
    });
  });

  describe("dispose method", () => {
    beforeEach(() => {
      history.add("cmd1");
      history.add("cmd2");
    });

    it("should clear history like clearHistory", () => {
      history.dispose();
      expect(history.commandHistory).toEqual([]);
    });

    it("should reset history index", () => {
      history.getPrevious();
      history.dispose();
      expect(history.getPrevious()).toBeUndefined();
    });

    it("should allow adding commands after dispose", () => {
      history.dispose();
      history.add("afterDispose");
      expect(history.commandHistory).toEqual(["afterDispose"]);
    });
  });

  describe("commandHistory getter", () => {
    it("should return the history array", () => {
      history.add("cmd1");
      history.add("cmd2");
      const hist = history.commandHistory;
      expect(hist).toEqual(["cmd1", "cmd2"]);
    });

    it("should return empty array initially", () => {
      expect(history.commandHistory).toEqual([]);
    });
  });

  describe("integrated navigation scenarios", () => {
    beforeEach(() => {
      history.add("ls");
      history.add("cd /home");
      history.add("pwd");
      history.add("echo test");
    });

    it("should navigate backward through entire history then reset", () => {
      expect(history.getPrevious()).toBe("echo test");
      expect(history.getPrevious()).toBe("pwd");
      expect(history.getPrevious()).toBe("cd /home");
      expect(history.getPrevious()).toBe("ls");
      expect(history.getPrevious()).toBeUndefined();

      history.reset();
      expect(history.getPrevious()).toBe("echo test");
    });

    it("should handle mixed navigation (forward and backward)", () => {
      history.getPrevious(); // echo test
      history.getPrevious(); // pwd
      expect(history.getNext()).toBe("echo test");
      expect(history.getPrevious()).toBe("pwd");
      expect(history.getPrevious()).toBe("cd /home");
      expect(history.getNext()).toBe("pwd");
    });

    it("should handle adding after partial navigation", () => {
      history.getPrevious(); // echo test
      history.getPrevious(); // pwd
      history.add("new command");

      // After adding, history index should be at the end
      expect(history.getPrevious()).toBe("new command");
    });

    it("should handle duplicate addition during navigation", () => {
      history.getPrevious(); // echo test
      history.add("echo test"); // Re-add existing command

      // The duplicate should be moved to the end
      expect(history.commandHistory[3]).toBe("echo test");
      expect(history.getPrevious()).toBe("echo test");
    });
  });

  describe("edge cases", () => {
    it("should handle rapid consecutive additions", () => {
      for (let i = 0; i < 10; i++) {
        history.add(`cmd${i}`);
      }
      expect(history.commandHistory).toHaveLength(10);
    });

    it("should handle command with special characters", () => {
      history.add("echo 'hello|world'");
      history.add("grep -r *.js");
      history.add("ls -la");
      expect(history.commandHistory).toHaveLength(3);
    });

    it("should maintain order with many duplicates", () => {
      history.add("cmd");
      history.add("cmd");
      history.add("cmd");
      expect(history.commandHistory).toEqual(["cmd"]);
    });

    it("should handle history size exactly at 100", () => {
      for (let i = 0; i < 100; i++) {
        history.add(`cmd${i}`);
      }
      expect(history.commandHistory).toHaveLength(100);
      expect(history.commandHistory[0]).toBe("cmd0");
    });

    it("should handle history size at 101", () => {
      for (let i = 0; i < 101; i++) {
        history.add(`cmd${i}`);
      }
      expect(history.commandHistory).toHaveLength(100);
      expect(history.commandHistory[0]).toBe("cmd1");
      expect(history.commandHistory[99]).toBe("cmd100");
    });
  });
});
