/**
 * ElectronStateStore
 *
 * Persistence layer for workspace state using electron-store
 */

import { Workspace } from "../common/workspace-types";

const WORKSPACE_SETTINGS_KEY = "gdb.gui.workspace";
const WINDOW_CONFIGS_SETTINGS_KEY = "gdb.gui.windowConfigs";
const LEGACY_HOST_LAYOUTS_SETTINGS_KEY = "gdb.gui.hostLayouts";

type WorkspaceStoreLike = {
  get?: (key: string) => unknown;
  set?: (key: string, value: unknown) => void;
  delete?: (key: string) => void;
  getSync?: (key: string) => unknown;
  setSync?: (key: string, value: unknown) => void;
  unsetSync?: (key: string) => void;
};

function readStoreValue(store: WorkspaceStoreLike, key: string): unknown {
  const reader =
    typeof store.get === "function"
      ? store.get.bind(store)
      : typeof store.getSync === "function"
        ? store.getSync.bind(store)
        : undefined;

  if (!reader) {
    throw new TypeError("Workspace settings store is missing both get() and getSync().");
  }

  return reader(key);
}

function writeStoreValue(store: WorkspaceStoreLike, key: string, value: unknown): void {
  const writer =
    typeof store.set === "function"
      ? store.set.bind(store)
      : typeof store.setSync === "function"
        ? store.setSync.bind(store)
        : undefined;

  if (!writer) {
    throw new TypeError("Workspace settings store is missing both set() and setSync().");
  }

  writer(key, value);
}

function deleteStoreValue(store: WorkspaceStoreLike, key: string): void {
  const deleter =
    typeof store.delete === "function"
      ? store.delete.bind(store)
      : typeof store.unsetSync === "function"
        ? store.unsetSync.bind(store)
        : undefined;

  if (!deleter) {
    throw new TypeError("Workspace settings store is missing both delete() and unsetSync().");
  }

  deleter(key);
}

function isEmptyLegacySettingValue(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim().length === 0;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).length === 0;
  }

  return false;
}

export function cleanupLegacyWorkspaceSettings(store: WorkspaceStoreLike): void {
  for (const key of [WINDOW_CONFIGS_SETTINGS_KEY, LEGACY_HOST_LAYOUTS_SETTINGS_KEY]) {
    const value = readStoreValue(store, key);
    if (value === undefined) {
      continue;
    }

    if (isEmptyLegacySettingValue(value)) {
      deleteStoreValue(store, key);
      continue;
    }

    deleteStoreValue(store, key);
  }
}

function createDefaultWorkspaceStore(): WorkspaceStoreLike {
  const backingStore = new Map<string, unknown>();
  return {
    get: (key: string) => backingStore.get(key),
    set: (key: string, value: unknown) => {
      backingStore.set(key, value);
    },
    delete: (key: string) => {
      backingStore.delete(key);
    },
  };
}

function createFallbackWorkspace(): Workspace {
  return {
    version: 1,
    windows: [
      {
        id: "window-recovered-main",
        type: "main",
        bounds: { x: 0, y: 0, width: 1200, height: 800 },
        layout: {
          id: "layout-recovered-main",
          root: {
            id: "pane-recovered-main",
            windowIds: [],
            size: 1,
          },
        },
        isMinimized: false,
        isMaximized: false,
      },
    ],
    groups: [
      { name: "documents", type: "SourceFileWindow", windows: [] },
      { name: "toolwindows", type: "ToolWindow", windows: [] },
    ],
    activeWindowId: "window-recovered-main",
    metadata: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      appVersion: "1.0.0",
    },
  };
}

export function isUsableHostLayout(layout: unknown): layout is Record<string, unknown> {
  return !!layout && typeof layout === "object" && Object.keys(layout).length > 0;
}

export function recoverWorkspaceFromSnapshots(savedWorkspace: unknown): Workspace {
  const fallbackWorkspace = createFallbackWorkspace();
  const baseWorkspace =
    savedWorkspace && typeof savedWorkspace === "object"
      ? (JSON.parse(JSON.stringify(savedWorkspace)) as Workspace)
      : fallbackWorkspace;

  const workspace =
    typeof baseWorkspace.version === "number" &&
    Array.isArray(baseWorkspace.windows) &&
    Array.isArray(baseWorkspace.groups)
      ? baseWorkspace
      : fallbackWorkspace;

  workspace.metadata = workspace.metadata ?? {
    createdAt: Date.now(),
    updatedAt: Date.now(),
    appVersion: "1.0.0",
  };

  if (!workspace.hosts || workspace.hosts.length === 0) {
    workspace.hosts = [
      {
        id: "main",
        label: "Main Window",
        isVisible: true,
        createdAt: Date.now(),
      },
    ];
  }

  workspace.hosts = workspace.hosts.map((host) =>
    host.id === "main" ? { ...host, label: host.label || "Main Window", isVisible: true } : host,
  );

  const validHostIds = new Set(workspace.hosts.map((host) => host.id));
  workspace.hostLayouts = Object.fromEntries(
    Object.entries(workspace.hostLayouts ?? {}).filter(
      ([hostId, layout]) => validHostIds.has(hostId) && isUsableHostLayout(layout),
    ),
  );

  return workspace;
}

/**
 * Handles persistence of workspace state to disk
 */
export class ElectronStateStore {
  constructor(private store: WorkspaceStoreLike = createDefaultWorkspaceStore()) {}
  /**
   * Save workspace state to settings
   */
  save(workspace: Workspace): Promise<void> {
    try {
      cleanupLegacyWorkspaceSettings(this.store);

      // Ensure metadata exists before saving
      if (!workspace.metadata) {
        workspace.metadata = {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          appVersion: "1.0.0",
        };
      }
      writeStoreValue(this.store, WORKSPACE_SETTINGS_KEY, workspace);
      return Promise.resolve();
    } catch (error) {
      console.error("Failed to save workspace state:", error);
      return Promise.reject(error);
    }
  }

  /**
   * Load workspace state from settings
   */
  load(): Promise<Workspace | null> {
    try {
      const workspace = readStoreValue(this.store, WORKSPACE_SETTINGS_KEY);
      return Promise.resolve(workspace as Workspace | null);
    } catch (error) {
      console.error("Failed to load workspace state:", error);
      return Promise.resolve(null);
    }
  }

  /**
   * Delete workspace state from settings
   */
  delete(): Promise<void> {
    try {
      deleteStoreValue(this.store, WORKSPACE_SETTINGS_KEY);
      return Promise.resolve();
    } catch (error) {
      console.error("Failed to delete workspace state:", error);
      return Promise.reject(error);
    }
  }

  /**
   * Check if workspace state exists
   */
  exists(): Promise<boolean> {
    try {
      const workspace = readStoreValue(this.store, WORKSPACE_SETTINGS_KEY);
      return Promise.resolve(workspace !== undefined && workspace !== null);
    } catch (error) {
      console.error("Failed to check workspace state:", error);
      return Promise.resolve(false);
    }
  }

  /**
   * Validate workspace state format
   */
  validateWorkspace(workspace: unknown): workspace is Workspace {
    if (!workspace || typeof workspace !== "object") {
      return false;
    }

    const w = workspace as Record<string, unknown>;
    return typeof w.version === "number" && Array.isArray(w.windows) && Array.isArray(w.groups);
  }

  /**
   * Recover from corrupted or missing state
   * Returns null if recovery fails, indicating default state should be used
   */
  async recover(): Promise<Workspace | null> {
    try {
      const workspace = await this.load();

      // If no state exists, return null (will use default)
      if (!workspace) {
        return null;
      }

      // If state is corrupted, return null
      if (!this.validateWorkspace(workspace)) {
        console.warn("Corrupted workspace state detected, will use default");
        return null;
      }

      // If state has version mismatch, try migration
      if (workspace.version && typeof workspace.version === "number") {
        return this.migrateState(workspace);
      }

      return workspace;
    } catch (error) {
      console.error("Failed to recover workspace state:", error);
      return null;
    }
  }

  /**
   * Handle version migrations for workspace state
   */
  private migrateState(workspace: Workspace): Workspace {
    // Current version
    const currentVersion = 1;

    if (workspace.version < currentVersion) {
      console.log(
        `Migrating workspace state from version ${workspace.version} to ${currentVersion}`,
      );

      // Add migration logic here for future versions
      // For now, just ensure all required fields exist
      if (!workspace.metadata) {
        workspace.metadata = {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          appVersion: "1.0.0",
        };
      }

      workspace.version = currentVersion;
    }

    return workspace;
  }

  /**
   * Export state for debugging/backup
   */
  async export(): Promise<string> {
    try {
      const workspace = await this.load();
      return JSON.stringify(workspace, null, 2);
    } catch (error) {
      console.error("Failed to export workspace state:", error);
      throw error;
    }
  }

  /**
   * Import state from JSON (for restore/testing)
   */
  async import(json: string): Promise<void> {
    try {
      const workspace = JSON.parse(json);
      if (!this.validateWorkspace(workspace)) {
        throw new Error("Invalid workspace format");
      }
      await this.save(workspace);
    } catch (error) {
      console.error("Failed to import workspace state:", error);
      throw error;
    }
  }
}
