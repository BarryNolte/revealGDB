/**
 * Implements ToolWindowsHostErrorBoundary.test for revealGDB.
 *
 * @remarks
 * Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ToolWindowsHostErrorBoundary } from "../../../../src/renderer/Errors/ToolWindowsHostErrorBoundary";

// Suppress React's expected console.error output for error boundary tests
/**
 * Performs suppressErrorOutput as part of this module's internal workflow.
 *
 * @returns The computed result produced by this operation.
 */
const suppressErrorOutput = () => vi.spyOn(console, "error").mockImplementation(() => undefined);
/**
 * Performs ThrowingChild as part of this module's internal workflow.
 *
 * @param { shouldThrow } - { shouldThrow } parameter.
 * @returns The computed result produced by this operation.
 */

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("host render failure");
  }
  return <div data-testid="child-content">child content</div>;
}

describe("ToolWindowsHostErrorBoundary", () => {
  it("renders children when no error occurs", () => {
    render(
      <ToolWindowsHostErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </ToolWindowsHostErrorBoundary>,
    );

    expect(screen.getByTestId("child-content")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders the error fallback when a child throws", () => {
    suppressErrorOutput();

    render(
      <ToolWindowsHostErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ToolWindowsHostErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(/Tool windows are temporarily unavailable/)).toBeTruthy();
    expect(screen.getByText("host render failure")).toBeTruthy();
  });

  it("shows a Retry button in the fallback UI", () => {
    suppressErrorOutput();

    render(
      <ToolWindowsHostErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ToolWindowsHostErrorBoundary>,
    );

    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
  });

  it("getDerivedStateFromError captures the error message", () => {
    suppressErrorOutput();

    render(
      <ToolWindowsHostErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ToolWindowsHostErrorBoundary>,
    );

    expect(screen.getByText("host render failure")).toBeTruthy();
  });

  it("Retry button resets the error state so children render again", () => {
    suppressErrorOutput();

    // We need a component whose error state we can toggle
    let forceThrow = true;
/**
 * Performs ConditionalChild as part of this module's internal workflow.
 *
 * @returns The computed result produced by this operation.
 */
    function ConditionalChild() {
      if (forceThrow) throw new Error("recoverable error");
      return <div data-testid="recovered">recovered</div>;
    }

    const { rerender } = render(
      <ToolWindowsHostErrorBoundary>
        <ConditionalChild />
      </ToolWindowsHostErrorBoundary>,
    );

    // Confirm fallback is showing
    expect(screen.getByRole("alert")).toBeTruthy();

    // Stop throwing and click Retry
    forceThrow = false;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    rerender(
      <ToolWindowsHostErrorBoundary>
        <ConditionalChild />
      </ToolWindowsHostErrorBoundary>,
    );

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByTestId("recovered")).toBeTruthy();
  });

  it("shows fallback with unknown error message when error has no message", () => {
    suppressErrorOutput();
/**
 * Performs NoMessageThrow as part of this module's internal workflow.
 *
 * @returns The computed result produced by this operation.
 */

    function NoMessageThrow() {
      const err = new Error();
      err.message = "";
      throw err;
    }

    render(
      <ToolWindowsHostErrorBoundary>
        <NoMessageThrow />
      </ToolWindowsHostErrorBoundary>,
    );

    expect(screen.getByText("Unknown render failure.")).toBeTruthy();
  });
});
