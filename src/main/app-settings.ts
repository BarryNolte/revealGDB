/**
 * Application settings service for the main process.
 *
 * @remarks
 * Keeps an in-memory cache loaded at startup so reads avoid repeated disk access.
 */
import { app } from "electron";
import ElectronStore from "electron-store";

type StoreInstance = {
  store: SettingsObject;
  set: (key: string, value: unknown) => void;
  delete: (key: string) => void;
  path: string;
};

type StoreConstructor = new (options?: Record<string, unknown>) => StoreInstance;
const Store = ElectronStore as unknown as StoreConstructor;

if (typeof Store !== "function") {
  throw new Error("electron-store did not expose a valid constructor at runtime.");
}

type SettingsObject = Record<string, unknown>;

export type AppSettingsLike = {
  initialize: () => void;
  getSync: (key: string) => unknown;
  setSync: (key: string, value: unknown) => void;
  unsetSync: (key: string) => void;
  hasSync: (key: string) => boolean;
  file: () => string;
};

class AppSettingsStore implements AppSettingsLike {
  private store: StoreInstance | null = null;
  private cache: SettingsObject = {};

  public initialize(): void {
    if (this.store) {
      return;
    }

    this.store = new Store({
      name: "settings",
      cwd: app.getPath("userData"),
      accessPropertiesByDotNotation: true,
      clearInvalidConfig: false,
      serialize: (value: SettingsObject): string => JSON.stringify(value, null, 2),
      deserialize: (value: string): SettingsObject => JSON.parse(value) as SettingsObject,
    });

    this.cache = deepClone(this.store.store);
  }

  public getSync(key: string): unknown {
    this.ensureInitialized();
    return getByPath(this.cache, key);
  }

  public setSync(key: string, value: unknown): void {
    this.ensureInitialized();
    setByPath(this.cache, key, value);
    this.store!.set(key, value);
  }

  public unsetSync(key: string): void {
    this.ensureInitialized();
    unsetByPath(this.cache, key);
    this.store!.delete(key);
  }

  public hasSync(key: string): boolean {
    this.ensureInitialized();
    return hasByPath(this.cache, key);
  }

  public file(): string {
    this.ensureInitialized();
    return this.store!.path;
  }

  private ensureInitialized(): void {
    if (!this.store) {
      throw new Error("AppSettings.initialize() must run during startup before settings access.");
    }
  }
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is SettingsObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function splitPath(path: string): string[] {
  return path.split(".").filter((segment) => segment.length > 0);
}

function getByPath(root: SettingsObject, path: string): unknown {
  const segments = splitPath(path);
  let current: unknown = root;
  for (const segment of segments) {
    if (!isRecord(current) || !(segment in current)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

function hasByPath(root: SettingsObject, path: string): boolean {
  const segments = splitPath(path);
  let current: unknown = root;
  for (const segment of segments) {
    if (!isRecord(current) || !(segment in current)) {
      return false;
    }
    current = current[segment];
  }
  return true;
}

function setByPath(root: SettingsObject, path: string, value: unknown): void {
  const segments = splitPath(path);
  if (segments.length === 0) {
    return;
  }

  let current: SettingsObject = root;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i];
    const next = current[segment];
    if (!isRecord(next)) {
      const replacement: SettingsObject = {};
      current[segment] = replacement;
      current = replacement;
      continue;
    }
    current = next;
  }

  current[segments[segments.length - 1]] = value;
}

function unsetByPath(root: SettingsObject, path: string): void {
  const segments = splitPath(path);
  if (segments.length === 0) {
    return;
  }

  const stack: Array<{ owner: SettingsObject; key: string }> = [];
  let current: SettingsObject = root;

  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i];
    const next = current[segment];
    if (!isRecord(next)) {
      return;
    }
    stack.push({ owner: current, key: segment });
    current = next;
  }

  delete current[segments[segments.length - 1]];

  for (let i = stack.length - 1; i >= 0; i -= 1) {
    const { owner, key } = stack[i];
    const child = owner[key];
    if (!isRecord(child) || Object.keys(child).length > 0) {
      break;
    }
    delete owner[key];
  }
}

export const AppSettings: AppSettingsLike = new AppSettingsStore();
