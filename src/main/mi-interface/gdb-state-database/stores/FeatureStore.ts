import { gdbFeature } from "../types/gdbStateTypes";

export class FeatureStore {
  readonly features: Map<string, gdbFeature> = new Map<string, gdbFeature>();

  add(feature: string): void {
    this.features.set(feature, { feature: feature, available: true });
  }

  remove(feature: string): void {
    this.features.delete(feature);
  }

  has(feature: string): boolean {
    return this.features.get(feature)?.available || false;
  }

  list(): gdbFeature[] {
    return Array.from(this.features.values());
  }

  clear(): void {
    this.features.clear();
  }
}
