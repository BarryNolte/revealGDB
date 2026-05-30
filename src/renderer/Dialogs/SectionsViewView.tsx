import { ButtonComponent, CheckBoxComponent } from "@syncfusion/ej2-react-buttons";
import { DialogComponent, TooltipComponent } from "@syncfusion/ej2-react-popups";
import { type MouseEvent as ReactMouseEvent, JSX, useLayoutEffect, useRef, useState } from "react";

import type { gdbSection, gdbSymbolFiles } from "../../common/gdb-state-types";
import type { SectionsViewOptions } from "../../common/ipc-data-types";
import "./SectionsView.css";

// Layout constants
const MIN_ROW_HEIGHT = 40;
const MAX_SECTION_HEIGHT = 200;
const LEFT_TEXT_WIDTH = 195;
const BRACKET_X = 202;
const RECT_LEFT = 210;
const RECT_WIDTH = 250;
const ROW_GAP = 3;
const GAP_ROW_HEIGHT = 18;
const SVG_WIDTH = RECT_LEFT + RECT_WIDTH + 10;

// Section type color palette
const SECTION_COLORS: Record<string, string> = {
  ".text": "#4a9eff",
  ".data": "#f4a942",
  ".bss": "#7ec8a0",
  ".rodata": "#b48eff",
  ".plt": "#ff6b6b",
  ".got": "#ffd93d",
  ".init": "#a8dadc",
  ".fini": "#457b9d",
};

const DEFAULT_COLOR = "#6c757d";

function getSectionColor(sectionName: string): string {
  for (const key of Object.keys(SECTION_COLORS)) {
    if (sectionName.startsWith(key)) return SECTION_COLORS[key];
  }
  return DEFAULT_COLOR;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

type ProcessedSection = {
  section: gdbSection;
  size: number;
  rowHeight: number;
  cumY: number;
  color: string;
  isGap: boolean;
};

function processSections(sections: gdbSection[], showEmptySpace: boolean): ProcessedSection[] {
  const seen = new Set<string>();
  const unique = sections.filter((s) => {
    const key = `${s.startAddr}|${s.endAddr}|${s.section}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const sorted = unique.sort((a, b) => parseInt(a.startAddr, 16) - parseInt(b.startAddr, 16));

  const entries = sorted.map((s) => {
    const size = Math.max(0, parseInt(s.endAddr, 16) - parseInt(s.startAddr, 16));
    return { section: s, size, logValue: Math.log(size + 1) };
  });

  const maxLog = Math.max(...entries.map((e) => e.logValue), 1);
  const scaleFactor = MAX_SECTION_HEIGHT / maxLog;

  let cumY = 0;
  const result: ProcessedSection[] = [];

  for (let i = 0; i < entries.length; i++) {
    if (showEmptySpace && i > 0) {
      const prevEnd = parseInt(entries[i - 1].section.endAddr, 16);
      const thisStart = parseInt(entries[i].section.startAddr, 16);
      if (thisStart > prevEnd) {
        const gapSection: gdbSection = {
          startAddr: entries[i - 1].section.endAddr,
          endAddr: entries[i].section.startAddr,
          section: "(gap)",
        };
        const gapEntry: ProcessedSection = {
          section: gapSection,
          size: thisStart - prevEnd,
          rowHeight: GAP_ROW_HEIGHT,
          cumY,
          color: "",
          isGap: true,
        };
        result.push(gapEntry);
        cumY += GAP_ROW_HEIGHT + ROW_GAP;
      }
    }
    const { section, size, logValue } = entries[i];
    const rowHeight = Math.max(MIN_ROW_HEIGHT, logValue * scaleFactor);
    result.push({
      section,
      size,
      rowHeight,
      cumY,
      color: getSectionColor(section.section),
      isGap: false,
    });
    cumY += rowHeight + ROW_GAP;
  }

  return result;
}

type TooltipState = {
  x: number;
  y: number;
  section: gdbSection;
  size: number;
} | null;

type SectionRowProps = {
  processed: ProcessedSection;
  onEnter: (e: ReactMouseEvent, section: gdbSection, size: number) => void;
  onMove: (e: ReactMouseEvent) => void;
  onLeave: () => void;
};

type SectionBracketProps = {
  textY: number;
  rectTop: number;
  rectBottom: number;
};

function SectionBracket({ textY, rectTop, rectBottom }: SectionBracketProps): JSX.Element {
  const color = "#888888";
  return (
    <>
      <line
        x1={LEFT_TEXT_WIDTH + 2}
        y1={textY}
        x2={BRACKET_X}
        y2={textY}
        stroke={color}
        strokeWidth={1}
      />
      <line
        x1={BRACKET_X}
        y1={rectTop}
        x2={BRACKET_X}
        y2={rectBottom}
        stroke={color}
        strokeWidth={1}
      />
      <line
        x1={BRACKET_X}
        y1={rectTop}
        x2={BRACKET_X + 8}
        y2={rectTop}
        stroke={color}
        strokeWidth={1}
      />
      <line
        x1={BRACKET_X}
        y1={rectBottom}
        x2={BRACKET_X + 8}
        y2={rectBottom}
        stroke={color}
        strokeWidth={1}
      />
    </>
  );
}

function SectionRow({ processed, onEnter, onMove, onLeave }: SectionRowProps): JSX.Element {
  const { section, size, rowHeight, cumY, color } = processed;
  const textY = cumY + rowHeight / 2;
  const rectTop = cumY + ROW_GAP / 2;
  const rectBottom = cumY + rowHeight - ROW_GAP / 2;
  const rectHeight = rowHeight - ROW_GAP;
  const safeAddr = section.startAddr.replace(/[^a-zA-Z0-9]/g, "_");
  const safeSec = section.section.replace(/[^a-zA-Z0-9]/g, "_");
  const clipId = `clip-${safeAddr}-${safeSec}`;

  return (
    <g key={`${section.startAddr}-${section.section}`}>
      <text
        x={0}
        y={textY}
        dominantBaseline="middle"
        fontSize={13}
        fontFamily="monospace"
        fill="#c0c0c0"
      >
        {`${section.startAddr} -- ${section.endAddr}`}
      </text>
      <SectionBracket textY={textY} rectTop={rectTop} rectBottom={rectBottom} />
      <g
        onMouseEnter={(e) => onEnter(e, section, size)}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className="sections-section-group"
      >
        <rect
          x={RECT_LEFT}
          y={rectTop}
          width={RECT_WIDTH}
          height={rectHeight}
          rx={3}
          fill={color}
          opacity={0.85}
        />
        <clipPath id={clipId}>
          <rect x={RECT_LEFT + 4} y={rectTop} width={RECT_WIDTH - 8} height={rectHeight} />
        </clipPath>
        <text
          x={RECT_LEFT + RECT_WIDTH / 2}
          y={textY}
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize={11}
          fontFamily="monospace"
          fill="#ffffff"
          clipPath={`url(#${clipId})`}
        >
          {section.section}
        </text>
      </g>
    </g>
  );
}

function SectionGapRow({ processed }: { processed: ProcessedSection }): JSX.Element {
  const { section, size, rowHeight, cumY } = processed;
  const midY = cumY + rowHeight / 2;
  const rectTop = cumY + ROW_GAP / 2;
  const rectBottom = cumY + rowHeight - ROW_GAP / 2;
  const rectHeight = rowHeight - ROW_GAP;
  return (
    <g>
      {/* <line
        x1={0}
        y1={cumY}
        x2={RECT_LEFT}
        y2={cumY}
        stroke="#444"
        strokeWidth={1}
        strokeDasharray="4,4"
      /> */}
      <text
        x={0}
        y={midY}
        dominantBaseline="middle"
        fontSize={13}
        fontFamily="monospace"
        fill="#c0c0c0"
      >
        {`${section.startAddr} -- ${section.endAddr}`}
      </text>
      <SectionBracket textY={midY} rectTop={rectTop} rectBottom={rectBottom} />
      <rect
        x={RECT_LEFT}
        y={rectTop}
        width={RECT_WIDTH}
        height={rectHeight}
        rx={2}
        fill="url(#gap-crosshatch)"
        stroke="#555"
        strokeWidth={1}
        className="gap-row-interactive"
        data-gap-size={size.toLocaleString()}
      />
    </g>
  );
}

function SectionsLegend(): JSX.Element {
  const colorEntries = [
    ...Object.entries(SECTION_COLORS),
    ["Other", DEFAULT_COLOR] as [string, string],
  ];
  const itemH = 16;
  const totalRows = colorEntries.length + 1;
  return (
    <div className="sections-legend">
      <svg width={130} height={totalRows * itemH + 20}>
        <defs>
          <pattern id="legend-crosshatch" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="rgba(35,35,45,0.6)" />
            <path d="M0 4 L4 0 M0 8 L8 0 M4 8 L8 4" stroke="#777" strokeWidth="0.8" />
            <path d="M4 0 L8 4 M0 0 L8 8 M0 4 L4 8" stroke="#777" strokeWidth="0.8" />
          </pattern>
        </defs>
        <text
          x={0}
          y={13}
          fontSize={11}
          fill="currentColor"
          fontWeight="bold"
          fontFamily="sans-serif"
        >
          Legend
        </text>
        {colorEntries.map(([name, color], i) => (
          <g key={name} transform={`translate(0, ${18 + i * itemH})`}>
            <rect x={0} y={0} width={12} height={12} rx={2} fill={color} />
            <text x={16} y={10} fontSize={10} fill="currentColor" fontFamily="monospace">
              {name}
            </text>
          </g>
        ))}
        <g transform={`translate(0, ${18 + colorEntries.length * itemH})`}>
          <rect
            x={0}
            y={0}
            width={12}
            height={12}
            rx={2}
            fill="url(#legend-crosshatch)"
            stroke="#555"
            strokeWidth={0.8}
          />
          <text x={16} y={10} fontSize={10} fill="currentColor" fontFamily="monospace">
            (gap)
          </text>
        </g>
      </svg>
    </div>
  );
}

function SectionsTooltip({ tooltip }: { tooltip: TooltipState }): JSX.Element | null {
  const divRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (divRef.current && tooltip) {
      divRef.current.style.left = `${tooltip.x}px`;
      divRef.current.style.top = `${tooltip.y}px`;
    }
  });
  if (!tooltip) return null;
  return (
    <div ref={divRef} className="sections-tooltip">
      <div>
        <span className="sections-tooltip-label">Section:</span>
        {tooltip.section.section}
      </div>
      <div>
        <span className="sections-tooltip-label">Start:</span>
        {tooltip.section.startAddr}
      </div>
      <div>
        <span className="sections-tooltip-label">End:</span>
        {tooltip.section.endAddr}
      </div>
      <div>
        <span className="sections-tooltip-label">Size:</span>
        {formatSize(tooltip.size)}
      </div>
      <div>
        <span className="sections-tooltip-label">File:</span>
        {tooltip.section.file ?? "\u2014"}
      </div>
    </div>
  );
}

type SectionsVisualizationProps = {
  symbolFiles: gdbSymbolFiles;
  options: SectionsViewOptions;
};

function SectionsVisualization({ symbolFiles, options }: SectionsVisualizationProps): JSX.Element {
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const gapTooltipRef = useRef<TooltipComponent>(null);
  const processed = processSections(symbolFiles.sections, options.showEmptySpace);
  const totalHeight = processed.reduce((sum, s) => sum + s.rowHeight + ROW_GAP, 0) + 8;

  const handleEnter = (e: ReactMouseEvent, section: gdbSection, size: number) => {
    setTooltip({ x: e.clientX + 14, y: e.clientY - 8, section, size });
  };
  const handleMove = (e: ReactMouseEvent) => {
    setTooltip((prev) => (prev ? { ...prev, x: e.clientX + 14, y: e.clientY - 8 } : null));
  };
  const handleLeave = () => setTooltip(null);

  const handleGapBeforeRender = (args: unknown) => {
    const target = (args as { target: HTMLElement }).target;
    if (gapTooltipRef.current && target) {
      gapTooltipRef.current.content = (target.getAttribute("data-gap-size") ?? "?") + " bytes";
    }
  };

  return (
    <TooltipComponent
      ref={gapTooltipRef}
      target=".gap-row-interactive"
      content=""
      beforeRender={handleGapBeforeRender}
    >
      <div className="sections-svg-container">
        <svg width={SVG_WIDTH} height={totalHeight} className="sections-visualization-svg">
          <defs>
            <pattern id="gap-crosshatch" width="8" height="8" patternUnits="userSpaceOnUse">
              <rect width="8" height="8" fill="rgba(35,35,45,0.6)" />
              <path d="M0 4 L4 0 M0 8 L8 0 M4 8 L8 4" stroke="#777" strokeWidth="0.8" />
              <path d="M4 0 L8 4 M0 0 L8 8 M0 4 L4 8" stroke="#777" strokeWidth="0.8" />
            </pattern>
          </defs>
          {processed.map((p) =>
            p.isGap ? (
              <SectionGapRow key={`gap-${p.section.startAddr}`} processed={p} />
            ) : (
              <SectionRow
                key={`${p.section.startAddr}-${p.section.section}`}
                processed={p}
                onEnter={handleEnter}
                onMove={handleMove}
                onLeave={handleLeave}
              />
            ),
          )}
        </svg>
        <SectionsTooltip tooltip={tooltip} />
      </div>
    </TooltipComponent>
  );
}

export type SectionsViewViewProps = {
  visible: boolean;
  symbolFiles: gdbSymbolFiles | null;
  hideDialog: () => void;
  options: SectionsViewOptions;
  onOptionsChange: (opts: SectionsViewOptions) => void;
};

export function SectionsViewView({
  visible,
  symbolFiles,
  hideDialog,
  options,
  onOptionsChange,
}: SectionsViewViewProps): JSX.Element {
  const header = (): JSX.Element => {
    const title = symbolFiles?.mainSym ? `Section View — ${symbolFiles.mainSym}` : "Section View";
    return (
      <div className="sections-header-wrapper">
        <div className="dialogHeader">{title}</div>
        <div className="sections-dialog-column-header">
          <svg width={SVG_WIDTH} height={18}>
            <text x={0} y={13} fontSize={11} fill="#a0a0a0" fontFamily="sans-serif">
              Section Address
            </text>
            <text x={RECT_LEFT} y={13} fontSize={11} fill="#a0a0a0" fontFamily="sans-serif">
              Section
            </text>
          </svg>
        </div>
        {options.showLegend && <SectionsLegend />}
      </div>
    );
  };
  const footer = (): JSX.Element => (
    <div className="sections-dialog-footer">
      <CheckBoxComponent
        label="Show Empty Space"
        checked={options.showEmptySpace}
        change={(e) => onOptionsChange({ ...options, showEmptySpace: e.checked ?? false })}
      />
      <CheckBoxComponent
        label="Show Legend"
        checked={options.showLegend}
        change={(e) => onOptionsChange({ ...options, showLegend: e.checked ?? false })}
      />
      <ButtonComponent className="sections-dialog-footer-button" onClick={hideDialog}>
        Close
      </ButtonComponent>
    </div>
  );

  return (
    <div className="SectionsViewTarget">
      <DialogComponent
        className="dialogHeaderContainer sections-view-dialog"
        width="540px"
        height="620px"
        target=".SectionsViewTarget"
        visible={visible}
        header={header}
        footerTemplate={footer}
        closeOnEscape={true}
        showCloseIcon={true}
        close={hideDialog}
        isModal={true}
        allowDragging={true}
        position={{ X: "center", Y: "center" }}
      >
        <div className="sections-dialog-body">
          <div className="sections-view-content">
            {symbolFiles && symbolFiles.sections.length > 0 ? (
              <SectionsVisualization symbolFiles={symbolFiles} options={options} />
            ) : (
              <div className="sections-no-data">
                No section data available. Start a debug session to view sections.
              </div>
            )}
          </div>
        </div>
      </DialogComponent>
    </div>
  );
}
