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

  static getDerivedStateFromError(error: Error): ToolWindowsHostErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[ToolWindowsHostErrorBoundary] Tool window host failed", error, errorInfo);
  }

  private readonly handleRetry = (): void => {
    this.setState({ hasError: false, errorMessage: "" });
  };

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
