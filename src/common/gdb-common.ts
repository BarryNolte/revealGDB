/**
 * Type definitions for gdb shared across modules.
 */

// Used for external API surfaces where gdb returns untyped payloads.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GdbAny = any;

/* Debug Only */
export function wait(ms: number): void {
  // Busy-wait helper to simulate timing delays during debugging.
  console.log("Start waiting for " + ms + " milliseconds...");
  let x,
    y = 0;
  const start = Date.now();
  while (Date.now() - start < ms) {
    // Do nothing, just wait
    x = y++;
    y = x++;
  }
  console.log("Waited for " + ms + " milliseconds.");
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
