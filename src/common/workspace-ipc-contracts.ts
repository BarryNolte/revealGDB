/**
 * IPC contract for workspace operations.
 *
 * @remarks
 * Defines channel names and request/response types for workspace-related IPC.
 * Ported from DockManager reference implementation.
 */

/**
 * IPC channel names for workspace operations.
 */
export const WORKSPACE_IPC_CHANNELS = {
  /** Query: Get current workspace state. Request: void. Response: WorkspaceState */
  workspaceGetState: "workspace:get-state",

  /** Command: Create a new window. Request: CreateWindowRequest. Response: WorkspaceState */
  workspaceCreateWindow: "workspace:create-window",

  /** Command: Move window to different group. Request: MoveWindowRequest. Response: WorkspaceState */
  workspaceMoveWindow: "workspace:move-window",

  /** Command: Set window visibility. Request: SetWindowVisibilityRequest. Response: WorkspaceState */
  workspaceSetWindowVisibility: "workspace:set-window-visibility",

  /** Command: Save dock layout for a host. Request: SaveHostLayoutRequest. Response: WorkspaceState */
  workspaceSaveHostLayout: "workspace:save-host-layout",

  /** Command: Open a new satellite host window. Request: { label?: string }. Response: { hostId: string; host: DockHost } */
  workspaceOpenHostWindow: "workspace:open-host-window",

  /** Command: Close a satellite host window. Request: { hostId: string }. Response: { success: boolean } */
  workspaceCloseHostWindow: "workspace:close-host-window",

  /** Query: List all hosts (main + satellites). Request: void. Response: DockHost[] */
  workspaceListHosts: "workspace:list-hosts",

  /** Notification: Workspace has been updated. Payload: WorkspaceState */
  workspaceUpdated: "workspace:updated",
} as const;

/**
 * IPC channel names for monitor profile operations.
 */
export const MONITOR_PROFILE_IPC_CHANNELS = {
  /** Query: Get all monitor profiles. Request: void. Response: MonitorProfiles */
  monitorGetProfiles: "monitor:get-profiles",

  /** Command: Create a new monitor profile. Request: CreateMonitorProfileRequest. Response: { profileId: string } */
  monitorCreateProfile: "monitor:create-profile",

  /** Command: Apply a monitor profile. Request: ApplyMonitorProfileRequest. Response: { success: boolean } */
  monitorApplyProfile: "monitor:apply-profile",

  /** Command: Delete a monitor profile. Request: DeleteMonitorProfileRequest. Response: { success: boolean } */
  monitorDeleteProfile: "monitor:delete-profile",

  /** Query: Auto-detect and apply best-matching profile. Request: void. Response: ProfileDetectionResult */
  monitorDetectProfile: "monitor:detect-profile",

  /** Notification: Monitor configuration changed. Payload: DisplaySnapshot[] */
  monitorConfigChanged: "monitor:config-changed",
} as const;
