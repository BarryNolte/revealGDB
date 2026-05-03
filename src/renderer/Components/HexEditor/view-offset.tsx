/**
 * Provides view offset behavior for hex editor rendering, navigation, and input handling.
 *
 * @remarks
 * Exported symbols include `HexOffsetView`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import type { JSX, MouseEvent } from "react";
import type { MouseCallback } from "./MouseKeyboardHandler";

export interface HexOffsetViewProps {
  offset: number;
  datasource: Uint8Array;
  mouseCallback: MouseCallback;
}

/**
 * Performs offset header as part of this module's internal workflow.
 *
 * @remarks
 * Contributes to hex editor navigation, rendering synchronization, or edit workflows.
 *
 * @returns The computed result produced by this operation.
 */
function OffsetHeader(): JSX.Element {
  return (
    <tr key="offset-header">
      <th key="offset-header-label">OFFSET</th>
    </tr>
  );
}

/**
 * Performs offset values as part of this module's internal workflow.
 *
 * @remarks
 * Contributes to hex editor navigation, rendering synchronization, or edit workflows.
 *
 * @param param1 - Value for `param1` consumed by this operation.
 * @returns The resulting collection produced by this operation.
 */
function OffsetValues({
  offset,
  datasource,
}: {
  offset: number;
  datasource: Uint8Array;
}): JSX.Element[] {
  const idPrefix = "oIdx-";
  const offsetRows: JSX.Element[] = [];

  for (let i = 0; i < datasource.length; i += 16) {
    offsetRows.push(
      <tr key={`offset-row-${Math.floor(i / 16)}`}>
        <td className={`row-${Math.floor(i / 16)}`} key={`offset-cell-${i}`} id={idPrefix + i}>
          {(offset + i).toString(16).padStart(8, "0")}
        </td>
      </tr>,
    );
  }

  return offsetRows;
}

/**
 * Performs hex offset view as part of this module's public API.
 *
 * @remarks
 * Contributes to hex editor navigation, rendering synchronization, or edit workflows.
 *
 * @param param1 - Value for `param1` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
export default function HexOffsetView({
  offset,
  datasource,
  mouseCallback,
}: HexOffsetViewProps): JSX.Element {
  return (
    <div className="he-column-sticky" data-testid="hex-offset-view">
      <table className="he-table he-table-sticky" data-testid="hex-offset-table">
        <thead
          className="he-table-header"
          onMouseOver={(e: MouseEvent) => mouseCallback("Over", (e.target as Element).id)}
          onMouseLeave={(e: MouseEvent) => mouseCallback("Leave", (e.target as Element).id)}
        >
          <OffsetHeader />
        </thead>
        <tbody
          data-testid="hex-offset-body"
          onMouseOver={(e: MouseEvent) => mouseCallback("Over", (e.target as Element).id)}
          onMouseLeave={(e: MouseEvent) => mouseCallback("Leave", (e.target as Element).id)}
        >
          <OffsetValues offset={offset} datasource={datasource} />
        </tbody>
      </table>
    </div>
  );
}
