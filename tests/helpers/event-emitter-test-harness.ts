/**
 * event-emitter-test-harness module.
 *
 * @remarks
 * Source module for event-emitter-test-harness.
 */

/**
 * @file event-emitter-test-harness.ts
 * @description Source module for event-emitter-test-harness.
 */

import { vi } from "vitest";

export type EventHandler = () => void;
/**
 * Performs createEventEmitterHarness as part of this module's internal workflow.
 *
 * @returns The computed result produced by this operation.
 */

export function createEventEmitterHarness() {
  const handlers = new Map<string, EventHandler>();

  return {
    on: vi.fn((event: string, handler: EventHandler) => {
      handlers.set(event, handler);
    }),
    emit(event: string) {
      handlers.get(event)?.();
    },
  };
}
