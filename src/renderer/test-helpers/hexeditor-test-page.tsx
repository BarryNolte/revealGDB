/**
 * Hex Editor test page.
 *
 * Provides a standalone test environment for the HexEditor component.
 * Displays the hex editor with test data that can be provided via
 * window.__HEXEDITOR_TEST_DATA__ or uses fallback sample data.
 *
 * Used by Playwright tests to verify hex editor functionality including:
 * - Cell navigation and editing
 * - Data/text view synchronization
 * - Keyboard input handling
 * - Visual rendering
 */

import type { JSX } from "react";
import { useMemo } from "react";
import HexEditor from "../Components/HexEditor/HexEditor";
import "./hexeditor-test-page.css";

/** Window type augmentation for test data injection */
type WindowWithTestData = Window & {
  /** Optional test data array (0-255 values) */
  __HEXEDITOR_TEST_DATA__?: number[];
};

/** Fallback data used when no test data is provided */
const FALLBACK_DATA = new Uint8Array([
  0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff,
]);

/**
 * HexEditor test page component.
 * Renders the hex editor with test data from window or fallback.
 */
export function HexEditorTestPage(): JSX.Element {
  /** Memoized data source: uses test data if available, otherwise fallback */
  const datasource = useMemo(() => {
    const data = (window as WindowWithTestData).__HEXEDITOR_TEST_DATA__;
    if (!data || data.length === 0) {
      return FALLBACK_DATA;
    }

    const bounded = data.slice(0, 256);
    return Uint8Array.from(bounded);
  }, []);

  return (
    <div className="hex-editor-container">
      <HexEditor offset={0x40000} datasource={datasource} />
    </div>
  );
}
