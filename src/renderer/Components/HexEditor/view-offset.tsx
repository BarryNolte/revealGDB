import type { JSX, MouseEvent } from "react";
import type { MouseCallback } from "./MouseKeyboardHandler";

interface HexOffsetViewProps {
  offset: number;
  datasource: Uint8Array;
  mouseCallback: MouseCallback;
}

function OffsetHeader(): JSX.Element {
  return (
    <tr key="offset-header">
      <th key="offset-header-label">OFFSET</th>
    </tr>
  );
}

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
