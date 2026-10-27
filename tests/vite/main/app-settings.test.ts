/**
 * Regression tests for startup settings persistence behavior.
 */
// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockStoreCtor = vi.hoisted(() => {
  return class MockStore {
    static instances: MockStore[] = [];

    public store: Record<string, unknown>;
    public path: string;

    constructor(options: { name?: string; cwd?: string; accessPropertiesByDotNotation?: boolean }) {
      this.store = {};
      this.path = `${options.cwd ?? ""}/${options.name ?? "settings"}.json`;
      MockStore.instances.push(this);
    }

    public set(key: string, value: unknown): void {
      this.store[key] = value;
    }

    public delete(key: string): void {
      delete this.store[key];
    }
  };
});

vi.mock("electron-store", () => ({
  __esModule: true,
  default: mockStoreCtor,
}));

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn(() => process.cwd()),
  },
}));

import { AppSettings } from "../../../src/main/app-settings";

describe("AppSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes the settings store when the package exposes the constructor on default", () => {
    expect(() => AppSettings.initialize()).not.toThrow();
    expect(AppSettings.file()).toContain("settings.json");
  });
});
