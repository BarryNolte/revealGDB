/**
 * Implements tool windows host error boundary for revealGDB runtime behavior.
 *
 * @remarks
 * Exported symbols include `ToolWindowsHostErrorBoundary`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { Component, ErrorInfo, ReactNode } from "react";
import "./error-boundaries.css";

type ToolWindowsHostErrorBoundaryProps = {
  children: ReactNode;
};

type ToolWindowsHostErrorBoundaryState = {
  hasError: boolean;
  errorMessage: string;
};

export class ToolWindowsHostErrorBoundary extends Component<
  ToolWindowsHostErrorBoundaryProps,
  ToolWindowsHostErrorBoundaryState
> {
  override state: ToolWindowsHostErrorBoundaryState = {
    hasError: false,
    errorMessage: "",
  };

  /**
   * Returns derived state from error from current state.
   *
   * @param error - Value for `error` consumed by this operation.
   * @returns The computed result produced by this operation.
   */
  static getDerivedStateFromError(error: Error): ToolWindowsHostErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message,
    };
  }

  /**
   * Performs component did catch as part of this module's public API.
   *
   * @param error - Value for `error` consumed by this operation.
   * @param errorInfo - Value for `errorInfo` consumed by this operation.
   */
  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[ToolWindowsHostErrorBoundary] Tool window host failed", error, errorInfo);
  }

  private readonly handleRetry = (): void => {
    this.setState({ hasError: false, errorMessage: "" });
  };

  /**
   * Renders the operation for display.
   *
   * @returns The computed result produced by this operation.
   */
  override render(): ReactNode {
    if (this.state.hasError) {
      const message = this.state.errorMessage || "Unknown render failure.";
      return (
        <div role="alert" className="toolwindows-host-error-boundary-fallback">
          <strong>Tool windows are temporarily unavailable.</strong>
          <span>{message}</span>
          <button
            type="button"
            className="toolwindow-error-boundary-retry"
            onClick={this.handleRetry}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
