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

interface ConfigureOptions {
  atomicSave: boolean;
  fileName: string;
  numSpaces: number;
  prettify: boolean;
}

class AppSettingsWrapper {
  private store: typeof Store;

  constructor() {
    this.store = new Store({
      projectName: APP_PROJECT_NAME,
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
