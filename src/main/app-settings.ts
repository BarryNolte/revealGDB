/**
 * Application settings singleton for the main process.
 *
 * @remarks
 * Re-exported here to break the circular dependency between mi-interface and main.ts.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const StoreModule = require("electron-store");
// Handle both default and named exports from CommonJS module
const Store = StoreModule.default || StoreModule;

const APP_PROJECT_NAME = "revealgdb";

function resolveUserDataDirectory(): string | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const electronApp = require("electron").app as
      | { getPath?: (name: string) => string }
      | undefined;
    const userDataDir = electronApp?.getPath?.("userData");
    return userDataDir && userDataDir.trim().length > 0 ? userDataDir : undefined;
  } catch {
    return undefined;
  }
}

interface ConfigureOptions {
  atomicSave: boolean;
  fileName: string;
  numSpaces: number;
  prettify: boolean;
}

class AppSettingsWrapper {
  private store: typeof Store;

  constructor() {
    const userDataDirectory = resolveUserDataDirectory();
    this.store = new Store({
      projectName: APP_PROJECT_NAME,
      ...(userDataDirectory ? { cwd: userDataDirectory } : {}),
    });
  }

  configure(_opts: ConfigureOptions): void {
    // electron-store handles these settings automatically
    // This method is a no-op for compatibility
  }

  file(): string {
    // Return the path to the settings file
    return this.store.path as string;
  }

  getSync(key: string): unknown {
    return this.store.get(key);
  }

  setSync(key: string, value: unknown): void {
    this.store.set(key, value);
  }

  hasSync(key: string): boolean {
    return this.store.has(key);
  }

  get(key: string, defaultValue?: unknown): unknown {
    return this.store.get(key, defaultValue);
  }

  set(key: string, value: unknown): void {
    this.store.set(key, value);
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

export const AppSettings = new AppSettingsWrapper();
