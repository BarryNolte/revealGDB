/**
 * @file view-text.tsx
 * @description ASCII/Unicode text view component displaying binary data as characters.
 * Shows interpretable characters (or dots for non-printable bytes).
 */

import { type JSX, type MouseEvent } from "react";
import { convertCharValue } from "./common";
import type { MouseCallback } from "./MouseKeyboardHandler";

/** Props for the HexTextView component */
interface HexTextViewProps {
  /** Binary data source to display */
  datasource: Uint8Array;
  /** Callback for mouse/keyboard events */
  mouseCallback: MouseCallback;
}

// ID prefix for text view cells (used for event routing)
const idPrefix = "tIdx-";

/**
 * TextHeader - Renders the text view column headers (0-F).
 * @returns {JSX.Element[]} Array containing header row
 */
function TextHeader(): JSX.Element[] {
  const textHeader: JSX.Element[] = [];
  const textHeaderItems: JSX.Element[] = [];
  // Generate 16 column headers (0-F hex)
  for (let i: number = 0; i < 16; i++) {
    textHeaderItems.push(
      <th key={`text-hdr-${i}`} className={`col-${i}`} id={idPrefix + "hdr-" + i}>
        {i.toString(16).toUpperCase()}
      </th>,
    );
  }
  textHeader.push(<tr key="text-header-row">{textHeaderItems}</tr>);

  return textHeader;
}

/**
 * TextValues - Renders the text representation cells (16 bytes per row).
 * Each cell displays a character representation of a byte:
 * - ASCII mode: printable ASCII (0x20-0x7F) displayed as character, others as '.'
 * - Unicode mode: raw character from charCode
 *
 * @param {Object} props - Component props
 * @param {Uint8Array} props.datasource - Binary data to display
 * @returns {JSX.Element[]} Array of table rows containing text data
 */
function TextValues({ datasource }: { datasource: Uint8Array }): JSX.Element[] {
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
          key={`text-cell-${idx + i}`}
          id={idPrefix + (idx + i)}
        >
          {/* Convert byte to ASCII character (or '.' for non-printable) */}
          {convertCharValue(d, false)}
        </td>,
      ),
    );
    valueRows.push(<tr key={`text-row-${Math.floor(i / 16)}`}>{textViewRowItems}</tr>);
  }

  return valueRows;
}

/**
 * HexTextView - Main text view component.
 * Renders a table displaying binary data as ASCII/Unicode characters with synchronized row/column highlighting.
 *
 * Features:
 * - 16 bytes per row
 * - ASCII mode: printable chars (0x20-0x7F) shown, others as '.'
 * - Row and column highlighting on hover
 * - Click to enter edit mode (type character to replace)
 * - Keyboard navigation (arrow keys, tab, enter, escape)
 *
 * @param {HexTextViewProps} props - Component props
 * @returns {JSX.Element} A table element with header and data rows
 */
export default function HexTextView({ datasource, mouseCallback }: HexTextViewProps): JSX.Element {
  return (
    <div data-testid="hex-text-view">
      <table className="he-table he-table-sticky" data-testid="hex-text-table">
        <thead
          className="he-table-header"
          onMouseOver={(e: MouseEvent) => mouseCallback("Over", (e.target as Element).id)}
          onMouseLeave={(e: MouseEvent) => mouseCallback("Leave", (e.target as Element).id)}
        >
          <TextHeader />
        </thead>
        <tbody
          data-testid="hex-text-body"
          onMouseOver={(e: MouseEvent) => mouseCallback("Over", (e.target as Element).id)}
          onMouseLeave={(e: MouseEvent) => mouseCallback("Leave", (e.target as Element).id)}
          onClick={(e: MouseEvent) => mouseCallback("Click", (e.target as Element).id)}
        >
          <TextValues datasource={datasource} />
        </tbody>
      </table>
    </div>
  );
}
