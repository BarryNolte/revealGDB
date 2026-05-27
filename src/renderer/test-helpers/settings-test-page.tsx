/**
 * Provides settings test page helpers that power renderer integration harness pages.
 *
 * @remarks
 * Exported symbols include `setupSettingsTestApi`, `SettingsTestPage`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import type { JSX } from "react";
import { useEffect, useRef } from "react";
import Settings, { type SettingsHandle } from "../Dialogs/Settings";
import { initIpcMock, setIpcFullLegacyAliases } from "./ipc-test-setup";
import "./settings-test-page.css";

type SettingsPayload = {
  gui: {
    sourceViewerTheme?: string;
    sourceViewerFontName?: string;
    sourceViewerFontSize?: string;
    showDebugInfo?: boolean;
    applicationTheme?: string;
  };
};

type SettingsTestData = {
  settings: SettingsPayload;
  fonts: string[];
};

type NotifyMainCall = {
  command?: string;
  data?: unknown;
};

type SettingsTestApi = {
  getNotifyMainCalls: () => NotifyMainCall[];
  getEditorEvents: () => Array<Record<string, unknown>>;
  getApplicationEvents: () => Array<Record<string, unknown>>;
  reset: () => void;
};

type WindowWithSettingsTestApi = Window & {
  __SETTINGS_TEST_SETTINGS__?: SettingsTestData;
  __SETTINGS_TEST_API__?: SettingsTestApi;
};

const defaultSettings: SettingsPayload = {
  gui: {
    sourceViewerTheme: "Monokai",
    sourceViewerFontName: "Fira Code",
    sourceViewerFontSize: "14",
    showDebugInfo: true,
    applicationTheme: "Light",
  },
};

const defaultFonts = ["Consolas", "Fira Code", "Cascadia Code"];

/**
 * Performs setup settings test api as part of this module's public API.
 */
export function setupSettingsTestApi(): void {
  const ipc = initIpcMock();
  const notifyMainCalls: NotifyMainCall[] = [];
  const editorEvents: Array<Record<string, unknown>> = [];
  const applicationEvents: Array<Record<string, unknown>> = [];

  /**
   * Performs handle change editor as part of this module's internal workflow.
   *
   * @param event - Value for `event` consumed by this operation.
   */
  const handleChangeEditor = (event: Event) => {
    editorEvents.push({ ...(((event as CustomEvent).detail as Record<string, unknown>) ?? {}) });
  };

  /**
   * Performs handle change application as part of this module's internal workflow.
   *
   * @param event - Value for `event` consumed by this operation.
   */
  const handleChangeApplication = (event: Event) => {
    applicationEvents.push({
      ...(((event as CustomEvent).detail as Record<string, unknown>) ?? {}),
    });
  };

  window.addEventListener("changeEditor", handleChangeEditor);
  window.addEventListener("changeApplication", handleChangeApplication);

  ipc.queries.app.getSettings = () => {
    const settings = (window as WindowWithSettingsTestApi).__SETTINGS_TEST_SETTINGS__;
    return Promise.resolve(settings?.settings ?? defaultSettings);
  };
  ipc.queries.app.getSystemFonts = () => {
    const settings = (window as WindowWithSettingsTestApi).__SETTINGS_TEST_SETTINGS__;
    return Promise.resolve(settings?.fonts ?? defaultFonts);
  };
  ipc.commands.app.notifyMain = (message) => {
    notifyMainCalls.push({
      command: message?.command,
      data: message?.data,
    });
  };
  setIpcFullLegacyAliases(ipc);

  (window as WindowWithSettingsTestApi).__SETTINGS_TEST_API__ = {
    getNotifyMainCalls: () => notifyMainCalls.slice(),
    getEditorEvents: () => editorEvents.slice(),
    getApplicationEvents: () => applicationEvents.slice(),
    reset: () => {
      notifyMainCalls.length = 0;
      editorEvents.length = 0;
      applicationEvents.length = 0;
    },
  };
}

/**
 * Performs settings test page as part of this module's public API.
 *
 * @returns The computed result produced by this operation.
 */
export function SettingsTestPage(): JSX.Element {
  const settingsRef = useRef<SettingsHandle>(null);

  useEffect(() => {
    settingsRef.current?.ShowDialog();
  }, []);

  return (
    <div className="settings-test-container" data-testid="settings-test-page">
      <Settings ref={settingsRef} />
    </div>
  );
}
