/**
 * Implements app for revealGDB runtime behavior.
 *
 * @remarks
 * Exported symbols include `AppMainVersionInfo`, `App`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */

import type { ForwardRefExoticComponent, RefAttributes } from "react";
import { JSX, RefObject, Suspense, lazy, useEffect, useRef, useState } from "react";
import type { NotifyRenderMessage } from "../common/ipc-contracts";
import type { GdbSettings } from "../common/settings-types";
import type { WorkspaceState } from "../common/workspace-types";
import { DockWorkspace } from "./components/DockWorkspace";
import { AppTheme, applyTheme } from "./theme-manager";
import { setAppMainVersionInfo } from "./utilities/app-version-state";

/* Dialogs */
import type { AboutBoxHandle } from "./Dialogs/AboutBox";
import type {
  ConnectionDialogProps,
  WhileConnectingDialogHandle,
} from "./Dialogs/ConnectionDialog.jsx";
import type { ConnectionManagerHandle } from "./Dialogs/ConnectionManager";
import type { SectionsViewHandle } from "./Dialogs/SectionsView";

/* Tool Windows */
import RevealToolbar from "./Components/Toolbar.jsx";
import type { SettingsHandle } from "./Dialogs/Settings.jsx";

const AboutBox = lazy(() =>
  import("./Dialogs/AboutBox.js").then((module) => ({
    default: module.AboutBox as unknown as () => JSX.Element,
  })),
) as unknown as ForwardRefExoticComponent<RefAttributes<AboutBoxHandle>>;
const Settings = lazy(() =>
  import("./Dialogs/Settings.js").then((module) => ({
    default: module.default as unknown as () => JSX.Element,
  })),
) as unknown as ForwardRefExoticComponent<RefAttributes<SettingsHandle>>;
const ConnectionManager = lazy(() =>
  import("./Dialogs/ConnectionManager.js").then((module) => ({
    default: module.ConnectionManager as unknown as () => JSX.Element,
  })),
) as unknown as ForwardRefExoticComponent<RefAttributes<ConnectionManagerHandle>>;
const ConnectionDialog = lazy(() =>
  import("./Dialogs/ConnectionDialog.js").then((module) => ({
    default: module.ConnectionDialog as unknown as () => JSX.Element,
  })),
) as unknown as ForwardRefExoticComponent<
  ConnectionDialogProps & RefAttributes<WhileConnectingDialogHandle>
>;
const SectionsView = lazy(() =>
  import("./Dialogs/SectionsView.js").then((module) => ({
    default: module.SectionsView as unknown as () => JSX.Element,
  })),
) as unknown as ForwardRefExoticComponent<RefAttributes<SectionsViewHandle>>;
/**
 * Performs lazy window as part of this module's internal workflow.
 *
 * @remarks
 * Performs asynchronous work and should be used with completion ordering in mind.
 *
 * @param importer - Callback invoked when the associated event occurs.
 */
/**
 * Performs lazyWindow as part of this module's internal workflow.
 *
 * @param importer - importer parameter.
 * @returns The computed result produced by this operation.
 */
// Note: lazyWindow and tool window lazy imports are now managed by DockWorkspace component
// const GdbBreakPointWindow = lazyWindow(() => import("./ToolWindows/GdbBreakpointsWindow.js"));
// const GdbCallStackWindow = lazyWindow(() => import("./ToolWindows/GdbCallstackWindow.js"));
// const GdbDisassemblerWindow = lazyWindow(() => import("./ToolWindows/GdbDisassemblerWindow.js"));
// const GdbLocalsWindow = lazyWindow(() => import("./ToolWindows/GdbLocalsWindow.js"));
// const GdbMemoryWindow = lazyWindow(() => import("./ToolWindows/GdbMemoryWindow.js"));
// const GdbRegistersWindow = lazyWindow(() => import("./ToolWindows/GdbRegistersWindow.js"));
// const GdbThreadsWindow = lazyWindow(() => import("./ToolWindows/GdbThreadsWindow.js"));

/* Dock Manager - Managed by DockWorkspace component */
/**
 * Note: The DockManager instance is now managed within the DockWorkspace component.
 * For workspace-level state and multi-host support, queries are sent via IPC.
 */

// Note: DeferredWindow is now managed by DockWorkspace component
// function DeferredWindow({
//   title,
//   children,
// }: {
//   title: string;
//   children: JSX.Element;
// }): JSX.Element {
//   return (
//     <ToolWindowErrorBoundary title={title}>
//       <Suspense fallback={null}>{children}</Suspense>
//     </ToolWindowErrorBoundary>
//   );
// }

/* Icon Assets - Tool window icons loaded as static assets */
// Note: Icon assets are now managed by DockWorkspace component
// const iconCmd = import("./icons/icons8-command-line-48.png?asset");
// const iconRegister = import("./icons/icons8-cpu-48.png?asset");
// const iconDisa = import("./icons/icons8-disassembly-48.png?asset");
// const iconBp = import("./icons/icons8-dot-48.png?asset");
// const iconHex = import("./icons/icons8-hex-48.png?asset");
// const iconLocal = import("./icons/icons8-local-48.png?asset");
// const iconSrc = import("./icons/icons8-source-code-48.png?asset");
// const iconStack = import("./icons/icons8-stack-48.png?asset");
// const iconThread = import("./icons/icons8-thread-48.png?asset");

/* Application Version Info */
/**
 * Handles application theme changes from main process.
 */
function handleAppThemeChange(e: Event): void {
  const detail = (e as CustomEvent).detail;
  if (detail?.theme) {
    applyTheme(detail.theme as AppTheme);
  }
}

/**
 * Custom hook for App initialization: version info, workspace state, settings, and theme management.
 * @param onWorkspaceError - Callback to handle workspace state loading errors
 * @param dialogRefs - References to dialog components for command handling
 */
function useAppInitialization(
  onWorkspaceError: (error: Error) => void,
  aboutBoxRef: RefObject<AboutBoxHandle | null>,
  whileConnectingRef: RefObject<WhileConnectingDialogHandle | null>,
  connectionsRef: RefObject<ConnectionManagerHandle | null>,
  settingsRef: RefObject<SettingsHandle | null>,
  sectionsViewRef: RefObject<SectionsViewHandle | null>,
): WorkspaceState | null {
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState | null>(null);

  useEffect(() => {
    window.ipcToMain.queries.app.getVersionInfo().then((e) => {
      setAppMainVersionInfo(e);
    });

    // Listen for commands from main process to show dialogs
    window.ipcToMain.notifications.render((msg: NotifyRenderMessage) => {
      switch (msg.command) {
        case "about-box":
          aboutBoxRef.current?.ShowDialog();
          break;
        case "connection-dialog":
          whileConnectingRef.current?.ShowDialog();
          break;
        case "connections-dialog":
          connectionsRef.current?.ShowDialog();
          break;
        case "settings-dialog":
          settingsRef.current?.ShowDialog();
          break;
        case "sections-view":
          sectionsViewRef.current?.ShowDialog();
          break;
      }
    });

    // Load settings and workspace state
    window.ipcToMain.queries.app.getSettings().then((gdb: GdbSettings): void => {
      // Apply saved theme before workspace renders
      const savedTheme = (gdb.gui?.applicationTheme ?? "Auto") as AppTheme;
      applyTheme(savedTheme);
    });

    // Query workspace state from main process
    window.ipcToMain.queries.workspace
      .getWorkspaceState()
      .then((state) => {
        setWorkspaceState(state);
      })
      .catch((error) => {
        console.error("Failed to load workspace state:", error);
        onWorkspaceError(error as Error);
      });

    // Handle app theme changes (e.g., from Electron theme event)
    window.addEventListener("changeApplication", handleAppThemeChange);

    // Handle OS theme changes pushed from the main process (Auto mode)
    const unsubTheme = window.ipcToMain.notifications.themeChanged?.((data) => {
      window.ipcToMain.queries.app.getSettings().then((gdb: GdbSettings) => {
        const currentTheme = (gdb.gui?.applicationTheme ?? "Auto") as AppTheme;
        if (currentTheme === "Auto") {
          applyTheme("Auto", data?.shouldUseDarkColors ?? false);
        }
      });
    });

    // Cleanup function: remove event listeners on unmount
    return () => {
      window.removeEventListener("changeApplication", handleAppThemeChange);
      if (unsubTheme) unsubTheme();
    };
  }, [
    onWorkspaceError,
    aboutBoxRef,
    whileConnectingRef,
    connectionsRef,
    settingsRef,
    sectionsViewRef,
  ]);

  return workspaceState;
}
/**
 * Performs PrimaryToolWindows as part of this module's internal workflow.
 *
 * @returns The computed result produced by this operation.
 */

interface AppDialogsProps {
  aboutBoxRef: RefObject<AboutBoxHandle | null>;
  settingsRef: RefObject<SettingsHandle | null>;
  connectionsRef: RefObject<ConnectionManagerHandle | null>;
  whileConnectingRef: RefObject<WhileConnectingDialogHandle | null>;
  sectionsViewRef: RefObject<SectionsViewHandle | null>;
}
/**
 * Performs AppDialogs as part of this module's internal workflow.
 *
 * @param {
  aboutBoxRef - {
  aboutBoxRef parameter.
 * @param settingsRef - settingsRef parameter.
 * @param connectionsRef - connectionsRef parameter.
 * @param whileConnectingRef - whileConnectingRef parameter.
 * @param sectionsViewRef - sectionsViewRef parameter.
 * @param } - } parameter.
 * @returns The computed result produced by this operation.
 */

function AppDialogs({
  aboutBoxRef,
  settingsRef,
  connectionsRef,
  whileConnectingRef,
  sectionsViewRef,
}: AppDialogsProps): JSX.Element {
  return (
    <>
      <Suspense fallback={null}>
        <AboutBox ref={aboutBoxRef} />
      </Suspense>
      <Suspense fallback={null}>
        <Settings ref={settingsRef} />
      </Suspense>
      <Suspense fallback={null}>
        <ConnectionManager ref={connectionsRef} />
      </Suspense>
      <Suspense fallback={null}>
        <ConnectionDialog
          ref={whileConnectingRef}
          connectionsRef={connectionsRef as RefObject<ConnectionManagerHandle>}
        />
      </Suspense>
      <Suspense fallback={null}>
        <SectionsView ref={sectionsViewRef} />
      </Suspense>
    </>
  );
}

/**
 * Performs app as part of this module's public API.
 *
 * @remarks
 * Includes explicit error-handling logic for expected failure paths. Performs asynchronous work and should be used with completion ordering in mind.
 *
 * @returns The computed result produced by this operation.
 */
export default function App(): JSX.Element {
  // Refs for imperative access to child components
  const aboutBoxRef = useRef<AboutBoxHandle>(null);
  const settingsRef = useRef<SettingsHandle>(null);
  const connectionsRef = useRef<ConnectionManagerHandle>(null);
  const whileConnectingRef = useRef<WhileConnectingDialogHandle>(null);
  const sectionsViewRef = useRef<SectionsViewHandle>(null);

  // State for workspace and errors
  const [workspaceError, setWorkspaceError] = useState<Error | null>(null);

  // Load workspace state and initialize app
  const workspaceState = useAppInitialization(
    setWorkspaceError,
    aboutBoxRef,
    whileConnectingRef,
    connectionsRef,
    settingsRef,
    sectionsViewRef,
  );

  // Handle workspace initialization errors
  if (workspaceError) {
    return (
      <div className="main-page-container">
        <RevealToolbar
          connectionsRef={connectionsRef as RefObject<ConnectionManagerHandle>}
          whileConnectingRef={whileConnectingRef as RefObject<WhileConnectingDialogHandle>}
          settingsRef={settingsRef as RefObject<SettingsHandle>}
        />
        <div style={{ padding: "20px", color: "red" }}>
          <h2>Error Loading Workspace</h2>
          <p>{workspaceError.message}</p>
        </div>
        <AppDialogs
          aboutBoxRef={aboutBoxRef}
          settingsRef={settingsRef}
          connectionsRef={connectionsRef}
          whileConnectingRef={whileConnectingRef}
          sectionsViewRef={sectionsViewRef}
        />
      </div>
    );
  }

  return (
    <div className={"main-page-container"}>
      <RevealToolbar
        connectionsRef={connectionsRef as RefObject<ConnectionManagerHandle>}
        whileConnectingRef={whileConnectingRef as RefObject<WhileConnectingDialogHandle>}
        settingsRef={settingsRef as RefObject<SettingsHandle>}
      />
      {workspaceState ? (
        <DockWorkspace workspaceState={workspaceState} onError={setWorkspaceError} />
      ) : (
        <div style={{ padding: "20px" }}>Loading workspace...</div>
      )}
      <AppDialogs
        aboutBoxRef={aboutBoxRef}
        settingsRef={settingsRef}
        connectionsRef={connectionsRef}
        whileConnectingRef={whileConnectingRef}
        sectionsViewRef={sectionsViewRef}
      />
    </div>
  );
}

/**
 * Note: Layout save listeners are now handled within the DockWorkspace component.
 * The component queries workspace state and persists changes via IPC commands.
 */
