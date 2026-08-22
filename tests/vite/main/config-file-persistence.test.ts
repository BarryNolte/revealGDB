/**
 * @vitest-environment node
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AppSettings } from "../../../src/main/app-settings";
import { WorkspacePersistence } from "../../../src/main/workspace-persistence";
import { WorkspaceService } from "../../../src/main/workspaceService";

describe("config file persistence contract", () => {
  it("uses the same config file for app settings and workspace metadata", () => {
    const persistence = new WorkspacePersistence();

    expect(persistence.getStore().path).toBe(AppSettings.file());
  });

  it("stores host layouts only under workspace.hostLayouts and does not duplicate them in gdb.gui.dockLayout", () => {
    const configPath = AppSettings.file();
    expect(configPath.toLowerCase()).toMatch(/config\.json$/i);

    const persistence = new WorkspacePersistence();
    const originalState = persistence.load();

    try {
      const layoutMain = {
        version: 1,
        panels: [{ id: "source", title: "Source" }],
      };
      const layoutDock1 = {
        version: 1,
        panels: [{ id: "locals", title: "Locals" }],
      };

      const updatedState = {
        ...originalState,
        hosts: [
          { id: "main", label: "Main Window", visibleWindows: [] },
          { id: "dock-1", label: "Dock Window 1", visibleWindows: [] },
        ],
        hostLayouts: {
          main: layoutMain,
          "dock-1": layoutDock1,
        },
      };

      persistence.save(updatedState);

      const serialized = readFileSync(configPath, "utf8");
      const persisted = JSON.parse(serialized) as Record<string, unknown>;

      expect((persisted.workspace as Record<string, unknown>).hostLayouts).toMatchObject({
        main: layoutMain,
        "dock-1": layoutDock1,
      });
      expect((persisted.gdb as Record<string, unknown>)?.gui).not.toHaveProperty("dockLayout");
    } finally {
      AppSettings.delete("gdb.gui.dockLayout");
      persistence.save(originalState);
    }
  });

  it("persists secondary hosts and hostLayouts under the workspace block so they can be restored", () => {
    const configPath = AppSettings.file();
    const persistence = new WorkspacePersistence();
    const originalState = persistence.load();

    try {
      const workspaceState = {
        ...WorkspaceService.createEmptyWorkspace("workspace-restore-test"),
        hosts: [
          { id: "main", label: "Main Window", visibleWindows: [] },
          { id: "dock-1", label: "Dock Window 1", visibleWindows: [] },
        ],
        hostLayouts: {
          "dock-1": {
            version: 1,
            panels: [{ id: "locals", title: "Locals" }],
          },
        },
      };

      persistence.save(workspaceState);

      const serialized = readFileSync(configPath, "utf8");
      const persisted = JSON.parse(serialized) as Record<string, unknown>;

      expect(persisted).toHaveProperty("workspace");
      expect((persisted.workspace as Record<string, unknown>).hosts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "main" }),
          expect.objectContaining({ id: "dock-1" }),
        ]),
      );
      expect((persisted.workspace as Record<string, unknown>).hostLayouts).toMatchObject({
        "dock-1": { version: 1, panels: [{ id: "locals", title: "Locals" }] },
      });
    } finally {
      persistence.save(originalState);
    }
  });
});
