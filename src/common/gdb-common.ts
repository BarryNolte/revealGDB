/**
 * Type definitions for gdb
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GdbAny = any;

/* Debug Only */
export function wait(ms: number): void {
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

export type Step = "starting-shell" | "running-commands" | "target-running";
export type StepState = "pending" | "in-progress" | "completed" | "failed";

export type StepAndState = {
  step: number;
  name: string;
  state: StepState;
};
