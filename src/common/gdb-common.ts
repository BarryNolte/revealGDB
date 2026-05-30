/**
 * Implements gdb common for revealGDB runtime behavior.
 *
 * @remarks
 * Exported symbols include `GdbAny`, `SelectedConnection`, `wait`, `Step`, `StepState`, `StepAndState`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GdbAny = any;

// SelectedConnection is now an alias for NormalizedConnection — kept for backward compatibility.
export type { NormalizedConnection as SelectedConnection } from "./connection-types";

/* Debug Only */
/**
 * Performs wait as part of this module's public API.
 *
 * @param ms - Value for `ms` consumed by this operation.
 */
export function wait(ms: number): void {
  // Busy-wait helper to simulate timing delays during debugging.
  // console.log("Start waiting for " + ms + " milliseconds...");
  let x,
    y = 0;
  const start = Date.now();
  while (Date.now() - start < ms) {
    // Do nothing, just wait
    x = y++;
    y = x++;
  }
  // console.log("Waited for " + ms + " milliseconds.");
}

// High-level phases in a gdb connection lifecycle.
export type Step = "starting-shell" | "running-commands" | "target-running";
export type StepState = "pending" | "in-progress" | "completed" | "failed";

// A Step paired with its current state for UI or logging.
export type StepAndState = {
  step: number;
  name: string;
  state: StepState;
};
