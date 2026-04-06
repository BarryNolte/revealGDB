import { vi } from "vitest";

export type EventHandler = () => void;

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
