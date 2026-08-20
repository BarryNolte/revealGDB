/**
 * @vitest-environment node
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AppSettings } from "../../../src/main/app-settings";
import { WorkspacePersistence } from "../../../src/main/workspace-persistence";
import { WorkspaceService } from "../../../src/main/workspaceService";

describe("config file persistence contract", () => {
  it("writes the dock layout under gdb.gui.dockLayout in the config file", () => {
    const configPath = AppSettings.file();
    expect(configPath.toLowerCase()).toMatch(/config\.json$/i);

    const originalTheme = AppSettings.getSync("gdb.gui.applicationTheme");
    const persistence = new WorkspacePersistence();
    const originalState = persistence.load();

    try {
      AppSettings.setSync("gdb.gui.applicationTheme", "Dark");
      expect(AppSettings.getSync("gdb.gui.applicationTheme")).toBe("Dark");

      const layout = {
        version: 1,
        panels: [{ id: "source", title: "Source" }],
      };

      AppSettings.setSync("gdb.gui.dockLayout", layout);
      const updatedState = WorkspaceService.setHostLayout(originalState, "main", layout);
      persistence.save(updatedState);

      const serialized = readFileSync(configPath, "utf8");
      const persisted = JSON.parse(serialized) as Record<string, unknown>;

      expect((persisted as Record<string, unknown>).gdb).toBeTruthy();
      expect((persisted as Record<string, unknown>).dockLayout).toBeUndefined();
      expect((persisted as Record<string, unknown>).gdb).toHaveProperty("gui");
      expect((persisted.gdb as Record<string, unknown>).gui).toMatchObject({
        dockLayout: layout,
      });
    } finally {
      AppSettings.setSync("gdb.gui.applicationTheme", originalTheme ?? "Auto");
      AppSettings.delete("gdb.gui.dockLayout");
      persistence.save(originalState);
    }
  });
});
