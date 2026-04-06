/**
 * Implements feature store logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `FeatureStore`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { gdbFeature } from "../types/gdbStateTypes";

export class FeatureStore {
  readonly features: Map<string, gdbFeature> = new Map<string, gdbFeature>();

  /**
   * Performs add as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param feature - Value for `feature` consumed by this operation.
   */
  add(feature: string): void {
    this.features.set(feature, { feature: feature, available: true });
  }

  /**
   * Removes the operation from managed state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param feature - Value for `feature` consumed by this operation.
   */
  remove(feature: string): void {
    this.features.delete(feature);
  }

  /**
   * Performs has as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param feature - Value for `feature` consumed by this operation.
   * @returns True when the operation succeeds; otherwise false.
   */
  has(feature: string): boolean {
    return this.features.get(feature)?.available || false;
  }

  /**
   * Performs list as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @returns The resulting collection produced by this operation.
   */
  list(): gdbFeature[] {
    return Array.from(this.features.values());
  }

  /**
   * Clears the operation from managed state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  clear(): void {
    this.features.clear();
  }
}
