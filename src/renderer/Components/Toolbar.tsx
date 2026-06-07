/**
 * Defines the toolbar renderer component and supporting presentation logic.
 *
 * @remarks
 * Exported symbols include `RevealToolbar`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import type { ItemModel } from "@syncfusion/ej2-react-navigations";
import { ToolbarComponent } from "@syncfusion/ej2-react-navigations";
import { SplitButtonComponent } from "@syncfusion/ej2-react-splitbuttons";
import { JSX } from "react";
import "./Toolbar.css";
import {
  type RevealToolbarProps,
  type ToolbarController,
  useToolbarController,
} from "./useToolbarController";

export type { RevealToolbarProps };
/**
 * Performs buildControlItems as part of this module's internal workflow.
 *
 * @param ctrl - ctrl parameter.
 * @returns The computed result produced by this operation.
 */

function buildControlItems(ctrl: ToolbarController): ItemModel[] {
  const { disconnectAvailable, onConnect, onDisconnect, onContinue, onPause, onStop } = ctrl;
  return [
    {
      id: "toolbar-connect",
      click: onConnect,
      prefixIcon: "tb-icon tb-connected",
      tooltipText: "Connect",
      text: "Connect",
      disabled: disconnectAvailable,
    },
    {
      id: "toolbar-disconnect",
      click: onDisconnect,
      prefixIcon: "tb-icon tb-disconnected",
      tooltipText: "Disconnect",
      text: "Disconnect",
      disabled: !disconnectAvailable,
    },
    { type: "Separator" as const },
    {
      id: "toolbar-continue",
      click: onContinue,
      prefixIcon: "tb-icon tb-go",
      tooltipText: "Continue",
      text: "Continue",
      disabled: !disconnectAvailable,
    },
    {
      id: "toolbar-pause",
      click: onPause,
      prefixIcon: "tb-icon tb-pause",
      tooltipText: "Pause",
      text: "Pause",
      disabled: !disconnectAvailable,
    },
    {
      id: "toolbar-stop",
      click: onStop,
      prefixIcon: "tb-icon tb-stop",
      tooltipText: "Stop",
      text: "Stop",
      disabled: !disconnectAvailable,
    },
  ];
}
/**
 * Performs buildStepItems as part of this module's internal workflow.
 *
 * @param ctrl - ctrl parameter.
 * @returns The computed result produced by this operation.
 */

function buildStepItems(ctrl: ToolbarController): ItemModel[] {
  // prettier-ignore
  const { disconnectAvailable, onStepOver, onStepIn, onStepOut, onConnectionManager, onSettings } = ctrl;
  return [
    { type: "Separator" as const },
    {
      id: "toolbar-step-over",
      click: onStepOver,
      prefixIcon: "tb-icon tb-step-over",
      tooltipText: "Step Over",
      text: "Step Over",
      disabled: !disconnectAvailable,
    },
    {
      id: "toolbar-step-in",
      click: onStepIn,
      prefixIcon: "tb-icon tb-step-in",
      tooltipText: "Step In",
      text: "Step In",
      disabled: !disconnectAvailable,
    },
    {
      id: "toolbar-step-out",
      click: onStepOut,
      prefixIcon: "tb-icon tb-step-out",
      tooltipText: "Step Out",
      text: "Step Out",
      disabled: !disconnectAvailable,
    },
    { type: "Separator" as const },
    {
      id: "toolbar-connections",
      click: onConnectionManager,
      prefixIcon: "tb-icon tb-connect",
      tooltipText: "Connection Manager",
      text: "Connections",
    },
    {
      id: "toolbar-settings",
      click: onSettings,
      prefixIcon: "tb-icon tb-settings",
      tooltipText: "Settings",
      text: "Settings",
    },
  ];
}
/**
 * Performs getToolbarItems as part of this module's internal workflow.
 *
 * @param ctrl - ctrl parameter.
 * @returns The computed result produced by this operation.
 */

function getToolbarItems(ctrl: ToolbarController): ItemModel[] {
  return [...buildControlItems(ctrl), ...buildStepItems(ctrl)];
}

/**
 * Performs reveal toolbar as part of this module's public API.
 *
 * @param props - Value for `props` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
export default function RevealToolbar(props: RevealToolbarProps): JSX.Element {
  const ctrl = useToolbarController(props);
  return (
    <div className="flex-container-row" data-testid="toolbar-root">
      <ToolbarComponent id="toolbar" className="flex-item-grow" items={getToolbarItems(ctrl)} />
      <SplitButtonComponent
        id="toolbar-window-menu"
        className="flex-item-grow"
        items={ctrl.items}
        content="Windows"
        select={ctrl.onSelectWindow}
        open={ctrl.onOpenWindow}
      />
    </div>
  );
}
