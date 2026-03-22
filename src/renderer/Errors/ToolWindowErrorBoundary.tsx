import { Component, ErrorInfo, ReactNode } from "react";
import "./error-boundaries.css";

type ToolWindowErrorBoundaryProps = {
  title: string;
  children: ReactNode;
};

type ToolWindowErrorBoundaryState = {
  hasError: boolean;
  errorMessage: string;
};

export class ToolWindowErrorBoundary extends Component<
  ToolWindowErrorBoundaryProps,
  ToolWindowErrorBoundaryState
> {
  override state: ToolWindowErrorBoundaryState = {
    hasError: false,
    errorMessage: "",
  };

  static getDerivedStateFromError(error: Error): ToolWindowErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`[ToolWindowErrorBoundary] ${this.props.title} failed`, error, errorInfo);
  }

  private readonly handleRetry = (): void => {
    this.setState({ hasError: false, errorMessage: "" });
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      const message = this.state.errorMessage || "Unknown render failure.";
      return (
        <div role="alert" className="toolwindow-error-boundary-fallback">
          <p className="toolwindow-error-boundary-title">
            {this.props.title} encountered an error.
          </p>
          <p className="toolwindow-error-boundary-message">{message}</p>
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
