/**
 * Provides view text behavior for hex editor rendering, navigation, and input handling.
 *
 * @remarks
 * Exported symbols include `HexTextView`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { type JSX, type MouseEvent } from "react";
import { convertCharValue } from "./common";
import type { MouseCallback } from "./MouseKeyboardHandler";
import HexEditorHeader from "./HexEditorHeader";

/** Props for the HexTextView component */
export interface HexTextViewProps {
  /** Binary data source to display */
  datasource: Uint8Array;
  /** Callback for mouse/keyboard events */
  mouseCallback: MouseCallback;
}

// ID prefix for text view cells (used for event routing)
const idPrefix = "tIdx-";

/**
 * Performs text header as part of this module's internal workflow.
 *
 * @remarks
 * Contributes to hex editor navigation, rendering synchronization, or edit workflows.
 *
 * @returns The resulting collection produced by this operation.
 */
/**
 * Performs TextHeader as part of this module's internal workflow.
 *
 * @returns The computed result produced by this operation.
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
 * Performs text values as part of this module's internal workflow.
 *
 * @remarks
 * Contributes to hex editor navigation, rendering synchronization, or edit workflows.
 *
 * @param param1 - Value for `param1` consumed by this operation.
 * @returns The resulting collection produced by this operation.
 */
/**
 * Performs TextValues as part of this module's internal workflow.
 *
 * @param { datasource } - { datasource } parameter.
 * @returns The computed result produced by this operation.
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
 * Performs hex text view as part of this module's public API.
 *
 * @remarks
 * Contributes to hex editor navigation, rendering synchronization, or edit workflows.
 *
 * @param param1 - Value for `param1` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
export default function HexTextView({ datasource, mouseCallback }: HexTextViewProps): JSX.Element {
  return (
    <div data-testid="hex-text-view">
      <table className="he-table he-table-sticky" data-testid="hex-text-table">
        <HexEditorHeader header={<TextHeader />} mouseCallback={mouseCallback}></HexEditorHeader>
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
