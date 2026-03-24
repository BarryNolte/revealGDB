import { JSX, ReactNode } from "react";
import { ToolWindowErrorBoundary } from "../Errors/ToolWindowErrorBoundary";

type ToolWindowContentProps = {
  title: string;
  children: ReactNode;
};

export function ToolWindowContent({ title, children }: ToolWindowContentProps): JSX.Element {
  return <ToolWindowErrorBoundary title={title}>{children}</ToolWindowErrorBoundary>;
}
