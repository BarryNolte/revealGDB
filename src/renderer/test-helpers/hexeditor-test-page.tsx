import type { JSX } from "react";
import { useMemo } from "react";
import HexEditor from "../Components/HexEditor/HexEditor";
import "./hexeditor-test-page.css";

type WindowWithTestData = Window & {
  __HEXEDITOR_TEST_DATA__?: number[];
};

const FALLBACK_DATA = new Uint8Array([
  0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff,
]);

export function HexEditorTestPage(): JSX.Element {
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
