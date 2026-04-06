/**
 * Provides view data behavior for hex editor rendering, navigation, and input handling.
 *
 * @remarks
 * Exported symbols include `HexDataView`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
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
 * Performs data header as part of this module's internal workflow.
 *
 * @remarks
 * Contributes to hex editor navigation, rendering synchronization, or edit workflows.
 *
 * @returns The resulting collection produced by this operation.
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
 * Performs data values as part of this module's internal workflow.
 *
 * @remarks
 * Contributes to hex editor navigation, rendering synchronization, or edit workflows.
 *
 * @param param1 - Value for `param1` consumed by this operation.
 * @returns The resulting collection produced by this operation.
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
 * Performs hex data view as part of this module's public API.
 *
 * @remarks
 * Contributes to hex editor navigation, rendering synchronization, or edit workflows.
 *
 * @param param1 - Value for `param1` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
export default function HexDataView({ datasource, mouseCallback }: HexDataViewProps): JSX.Element {
  return (
    <div data-testid="hex-data-view">
      <table className="he-table he-table-sticky" data-testid="hex-data-table">
        <thead
          className="he-table-header"
          onMouseOver={(e: MouseEvent) => mouseCallback("Over", (e.target as Element).id)}
          onMouseLeave={(e: MouseEvent) => mouseCallback("Leave", (e.target as Element).id)}
        >
          <DataHeader />
        </thead>
        <tbody
          data-testid="hex-data-body"
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
