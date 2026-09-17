/**
 * Application settings singleton for the main process.
 *
 * @remarks
 * Re-exported here to break the circular dependency between mi-interface and main.ts.
 */
import StoreModule from "electron-store";

// electron-store is ESM-only, but the bundled main output is loaded through CJS.
// Normalize the module shape so both direct default imports and `require()` interop work.
const Store = ((StoreModule as unknown as { default?: typeof StoreModule }).default ??
  StoreModule) as typeof StoreModule;

export type AppSettingsStore = InstanceType<typeof Store> & {
  file: () => string;
  getSync: <T = unknown>(key: string) => T;
  setSync: (key: string, value: unknown) => void;
  hasSync: (key: string) => boolean;
  unsetSync: (key: string) => void;
};

const appSettings = new Store<Record<string, unknown>>({
  name: "settings",
  fileExtension: "json",
  serialize: (value) => JSON.stringify(value, null, 2),
  deserialize: JSON.parse,
});

export const AppSettings = appSettings as AppSettingsStore;

const appSettingsCompat = AppSettings as AppSettingsStore & {
  get?: (key: string) => unknown;
  set?: (key: string, value: unknown) => void;
  has?: (key: string) => boolean;
  delete?: (key: string) => void;
  getSync?: <T = unknown>(key: string) => T;
  setSync?: (key: string, value: unknown) => void;
  hasSync?: (key: string) => boolean;
  unsetSync?: (key: string) => void;
};

const existingGetSync = appSettingsCompat.getSync?.bind(appSettingsCompat);
const existingSetSync = appSettingsCompat.setSync?.bind(appSettingsCompat);
const existingHasSync = appSettingsCompat.hasSync?.bind(appSettingsCompat);
const existingUnsetSync = appSettingsCompat.unsetSync?.bind(appSettingsCompat);

const getValue = appSettingsCompat.get?.bind(appSettingsCompat) ?? existingGetSync;
const setValue = appSettingsCompat.set?.bind(appSettingsCompat) ?? existingSetSync;
const hasValue = appSettingsCompat.has?.bind(appSettingsCompat) ?? existingHasSync;
const deleteValue = appSettingsCompat.delete?.bind(appSettingsCompat) ?? existingUnsetSync;

// Polyfill sync-style helpers expected by the existing main-process settings code.
AppSettings.file = () => AppSettings.path;
AppSettings.getSync = <T = unknown>(key: string) => {
  if (!getValue) {
    throw new TypeError("AppSettings is missing both get() and getSync() implementations.");
  }
  return getValue(key) as T;
};
AppSettings.setSync = (key: string, value: unknown) => {
  if (!setValue) {
    throw new TypeError("AppSettings is missing both set() and setSync() implementations.");
  }
  setValue(key, value);
};
AppSettings.hasSync = (key: string) => {
  if (!hasValue) {
    throw new TypeError("AppSettings is missing both has() and hasSync() implementations.");
  }
  return hasValue(key);
};
AppSettings.unsetSync = (key: string) => {
  if (!deleteValue) {
    throw new TypeError("AppSettings is missing both delete() and unsetSync() implementations.");
  }
  deleteValue(key);
};
