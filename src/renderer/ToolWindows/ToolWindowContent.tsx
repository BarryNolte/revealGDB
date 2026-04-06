/**
 * Implements tool window content behavior for debugger tool-window rendering and interactions.
 *
 * @remarks
 * Exported symbols include `ToolWindowContent`. It coordinates live debugger data with user interactions in docked tool-window views.
 */
import { JSX, ReactNode } from "react";
import { ToolWindowErrorBoundary } from "../Errors/ToolWindowErrorBoundary";

type ToolWindowContentProps = {
  title: string;
  children: ReactNode;
};

/**
 * Performs tool window content as part of this module's public API.
 *
 * @remarks
 * Supports debugger tool-window rendering, interaction handling, or data synchronization.
 *
 * @param param1 - Value for `param1` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
export function ToolWindowContent({ title, children }: ToolWindowContentProps): JSX.Element {
  return <ToolWindowErrorBoundary title={title}>{children}</ToolWindowErrorBoundary>;
}
