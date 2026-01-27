/**
 * @file view-data.tsx
 * @description Hex data view component displaying binary data as hexadecimal bytes.
 * Shows 16 bytes per row with row/column highlighting on hover.
 */

import type { JSX, MouseEvent } from "react";
import type { MouseCallback } from "./MouseKeyboardHandler";

/** Props for the HexDataView component */
interface HexDataViewProps {
  /** Binary data source to display */
  datasource: Uint8Array;
  /** Callback for mouse/keyboard events */
  mouseCallback: MouseCallback;
}

// ID prefix for data view cells (used for event routing)
const idPrefix = "dIdx-";

/**
 * DataHeader - Renders the hex data column headers (0-F).
 * @returns {JSX.Element[]} Array containing header row
 */
function DataHeader(): JSX.Element[] {
  const textHeader: JSX.Element[] = [];
  const textHeaderItems: JSX.Element[] = [];
  // Generate 16 column headers (0-F hex)
  for (let i: number = 0; i < 16; i++) {
    textHeaderItems.push(
      <th key={`data-hdr-${i}`} className={`col-${i}`} id={idPrefix + "hdr-" + i}>
        {i.toString(16).toUpperCase()}
      </th>,
    );
  }
  textHeader.push(<tr key="data-header-row">{textHeaderItems}</tr>);

  return textHeader;
}

/**
 * DataValues - Renders the hex data cells (16 bytes per row).
 * Each cell displays a byte as a 2-digit hex value with uppercase formatting.
 * @param {Object} props - Component props
 * @param {Uint8Array} props.datasource - Binary data to display
 * @returns {JSX.Element[]} Array of table rows containing hex data
 */
function DataValues({ datasource }: { datasource: Uint8Array }): JSX.Element[] {
  const valueRows: JSX.Element[] = [];

  // Iterate through data in 16-byte chunks (rows)
  for (let i = 0; i < datasource.length; i += 16) {
    const textViewRowItems: JSX.Element[] = [];
    const row = Math.min(datasource.length, i + 16);

    const subArray = datasource.slice(i, row);
    // Create cell for each byte in the row
    subArray.forEach((d, idx) =>
      textViewRowItems.push(
        <td
          className={`row-${Math.floor(i / 16)} col-${idx}`}
          key={`data-cell-${idx + i}`}
          id={idPrefix + (idx + i)}
        >
          {/* Format byte as 2-digit uppercase hex (e.g., "A5", "0F") */}
          {d.toString(16).toUpperCase().padStart(2, "0")}
        </td>,
      ),
    );
    valueRows.push(<tr key={`data-row-${Math.floor(i / 16)}`}>{textViewRowItems}</tr>);
  }

  return valueRows;
}

/**
 * HexDataView - Main hex data view component.
 * Renders a table displaying binary data as hexadecimal bytes with synchronized row/column highlighting.
 *
 * Features:
 * - 16 bytes per row
 * - Row and column highlighting on hover
 * - Click to enter edit mode
 * - Keyboard navigation (arrow keys, tab, enter, escape)
 *
 * @param {HexDataViewProps} props - Component props
 * @returns {JSX.Element} A table element with header and data rows
 */
export default function HexDataView({ datasource, mouseCallback }: HexDataViewProps): JSX.Element {
  return (
    <div>
      <table className="he-table he-table-sticky">
        <thead
          className="he-table-header"
          onMouseOver={(e: MouseEvent) => mouseCallback("Over", (e.target as Element).id)}
          onMouseLeave={(e: MouseEvent) => mouseCallback("Leave", (e.target as Element).id)}
        >
          <DataHeader />
        </thead>
        <tbody
          onMouseOver={(e: MouseEvent) => mouseCallback("Over", (e.target as Element).id)}
          onMouseLeave={(e: MouseEvent) => mouseCallback("Leave", (e.target as Element).id)}
          onClick={(e: MouseEvent) => {
            mouseCallback("Click", (e.target as Element).id);
          }}
        >
          <DataValues datasource={datasource} />
        </tbody>
      </table>
    </div>
  );
}
