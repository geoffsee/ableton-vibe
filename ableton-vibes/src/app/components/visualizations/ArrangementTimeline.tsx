"use client";

import { ArrangementSection, EarCandy } from "../types";

type ArrangementTimelineProps = {
  sections: ArrangementSection[];
  totalBars: number;
  energyCurve?: { bar: number; energy: number }[];
  earCandy?: EarCandy[];
  keyMoments?: { bar: number; description: string }[];
  onSectionClick?: (section: ArrangementSection) => void;
  selectedSectionId?: string;
};

const SECTION_COLORS: Record<string, string> = {
  intro: "#64748b",
  verse: "#3b82f6",
  chorus: "#ec4899",
  preChorus: "#a855f7",
  buildup: "#f97316",
  build: "#f97316",
  drop: "#ef4444",
  breakdown: "#06b6d4",
  bridge: "#8b5cf6",
  transition: "#6b7280",
  outro: "#64748b",
};

const EAR_CANDY_COLORS: Record<string, string> = {
  riser: "#22c55e",
  downlifter: "#3b82f6",
  impact: "#ef4444",
  sweep: "#06b6d4",
  stutter: "#f97316",
  "vocal-chop": "#ec4899",
  reverse: "#8b5cf6",
  "white-noise": "#94a3b8",
};

export function ArrangementTimeline({
  sections,
  totalBars,
  energyCurve = [],
  earCandy = [],
  keyMoments = [],
  onSectionClick,
  selectedSectionId,
}: ArrangementTimelineProps) {
  // Sort sections by start position
  const sortedSections = [...sections].sort((a, b) => a.startBar - b.startBar);

  // Generate energy path for overlay
  const generateEnergyPath = () => {
    if (energyCurve.length === 0) return "";

    const sorted = [...energyCurve].sort((a, b) => a.bar - b.bar);
    const points = sorted.map((point) => {
      const x = (point.bar / totalBars) * 100;
      const y = 100 - point.energy;
      return { x, y };
    });

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = prev.x + (curr.x - prev.x) * 0.5;
      path += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return path;
  };

  return (
    <div className="rounded-xl bg-black/40 overflow-hidden">
      {/* Bar markers */}
      <div className="flex h-6 border-b border-white/10 bg-black/40">
        {Array.from({ length: Math.ceil(totalBars / 8) + 1 }).map((_, i) => {
          const bar = i * 8;
          if (bar > totalBars) return null;
          const x = (bar / totalBars) * 100;
          return (
            <div
              key={i}
              className="absolute text-xs text-white/40"
              style={{ left: `${x}%` }}
            >
              {bar}
            </div>
          );
        })}
      </div>

      {/* Main timeline area */}
      <div className="relative h-24">
        {/* Section blocks */}
        <div className="absolute inset-0 flex">
          {sortedSections.map((section) => {
            const left = (section.startBar / totalBars) * 100;
            const width = (section.lengthBars / totalBars) * 100;
            const color = SECTION_COLORS[section.type] || "#6b7280";
            const isSelected = selectedSectionId === section.id;

            return (
              <div
                key={section.id}
                className={`
                  absolute inset-y-0 flex flex-col justify-between p-2 border-r border-white/10
                  transition-all duration-200 cursor-pointer
                  ${isSelected ? "ring-2 ring-inset ring-white/50" : "hover:brightness-110"}
                `}
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  backgroundColor: `${color}30`,
                }}
                onClick={() => onSectionClick?.(section)}
              >
                {/* Section name */}
                <div className="flex items-center gap-1">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs font-medium text-white truncate">
                    {section.name}
                  </span>
                </div>

                {/* Energy level indicator */}
                <div className="flex items-center gap-1">
                  <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${section.energyLevel}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-white/40">
                    {section.lengthBars}b
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Energy curve overlay */}
        {energyCurve.length > 0 && (
          <svg
            className="absolute inset-0 pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <path
              d={generateEnergyPath()}
              fill="none"
              stroke="rgba(139, 92, 246, 0.5)"
              strokeWidth="0.5"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}

        {/* Key moments markers */}
        {keyMoments.map((moment, idx) => {
          const x = (moment.bar / totalBars) * 100;
          return (
            <div
              key={idx}
              className="absolute top-0 bottom-0 w-px bg-orange-500/50"
              style={{ left: `${x}%` }}
              title={moment.description}
            >
              <div className="absolute -top-1 -left-1.5 w-3 h-3 rounded-full bg-orange-500 border-2 border-black" />
            </div>
          );
        })}
      </div>

      {/* Ear candy track */}
      {earCandy.length > 0 && (
        <div className="relative h-6 border-t border-white/10 bg-black/20">
          <span className="absolute left-1 top-1 text-[8px] text-white/30">FX</span>
          {earCandy.map((candy) => {
            const left = (candy.position / totalBars) * 100;
            const width = (candy.duration / totalBars) * 100;
            const color = EAR_CANDY_COLORS[candy.type] || "#8b5cf6";

            return (
              <div
                key={candy.id}
                className="absolute top-1 bottom-1 rounded-sm text-[8px] flex items-center justify-center"
                style={{
                  left: `${left}%`,
                  width: `${Math.max(width, 2)}%`,
                  backgroundColor: `${color}60`,
                  color,
                }}
                title={`${candy.type} (${candy.duration} bars)`}
              >
                {width > 5 && candy.type}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type SectionCardProps = {
  section: ArrangementSection;
  onEdit?: () => void;
  onDelete?: () => void;
};

export function SectionCard({ section, onEdit, onDelete }: SectionCardProps) {
  const color = SECTION_COLORS[section.type] || "#6b7280";

  return (
    <div
      className="rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: color }}
          >
            {section.startBar}
          </div>
          <div>
            <h4 className="font-medium text-white">{section.name}</h4>
            <div className="flex items-center gap-2 text-xs text-white/50">
              <span className="capitalize">{section.type}</span>
              <span>|</span>
              <span>{section.lengthBars} bars</span>
              <span>|</span>
              <span>Energy: {section.energyLevel}%</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/80"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-red-400"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Elements */}
      {section.elements.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {section.elements.map((element, idx) => (
            <span
              key={idx}
              className="text-xs rounded-full px-2 py-0.5 bg-white/10 text-white/60"
            >
              {element}
            </span>
          ))}
        </div>
      )}

      {/* Transitions */}
      {section.transitions && (section.transitions.in || section.transitions.out) && (
        <div className="mt-2 flex items-center gap-4 text-xs text-white/40">
          {section.transitions.in && (
            <span>In: {section.transitions.in}</span>
          )}
          {section.transitions.out && (
            <span>Out: {section.transitions.out}</span>
          )}
        </div>
      )}
    </div>
  );
}
