"use client";

type EnergyPoint = {
  bar: number;
  energy: number;
};

type EnergyCurveProps = {
  energyCurve: EnergyPoint[];
  totalBars: number;
  sections?: {
    id: string;
    name: string;
    startBar: number;
    lengthBars: number;
    type: string;
  }[];
  keyMoments?: {
    bar: number;
    description: string;
  }[];
  height?: number;
  showGrid?: boolean;
  interactive?: boolean;
  onPointClick?: (point: EnergyPoint) => void;
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

export function EnergyCurve({
  energyCurve,
  totalBars,
  sections = [],
  keyMoments = [],
  height = 120,
  showGrid = true,
  interactive = false,
  onPointClick,
}: EnergyCurveProps) {
  const padding = { left: 30, right: 10, top: 10, bottom: 20 };
  const chartWidth = 100; // percentage
  const chartHeight = height - padding.top - padding.bottom;

  // Sort energy curve by bar position
  const sortedCurve = [...energyCurve].sort((a, b) => a.bar - b.bar);

  // Generate SVG path for the energy curve
  const generatePath = () => {
    if (sortedCurve.length === 0) return "";

    const points = sortedCurve.map((point) => {
      const x = (point.bar / totalBars) * 100;
      const y = 100 - point.energy;
      return { x, y };
    });

    // Create smooth curve using bezier
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx1 = prev.x + (curr.x - prev.x) * 0.5;
      const cpy1 = prev.y;
      const cpx2 = prev.x + (curr.x - prev.x) * 0.5;
      const cpy2 = curr.y;
      path += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${curr.x} ${curr.y}`;
    }

    return path;
  };

  // Generate fill path
  const generateFillPath = () => {
    const linePath = generatePath();
    if (!linePath) return "";
    const lastPoint = sortedCurve[sortedCurve.length - 1];
    const firstPoint = sortedCurve[0];
    return `${linePath} L ${(lastPoint.bar / totalBars) * 100} 100 L ${(firstPoint.bar / totalBars) * 100} 100 Z`;
  };

  return (
    <div className="rounded-xl bg-black/40 overflow-hidden" style={{ height }}>
      <svg
        viewBox={`0 0 100 100`}
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="energyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Section backgrounds */}
        {sections.map((section) => {
          const x = (section.startBar / totalBars) * 100;
          const width = (section.lengthBars / totalBars) * 100;
          const color = SECTION_COLORS[section.type] || "#6b7280";

          return (
            <g key={section.id}>
              <rect
                x={`${x}%`}
                y="0"
                width={`${width}%`}
                height="100%"
                fill={color}
                fillOpacity="0.1"
              />
              <line
                x1={`${x}%`}
                y1="0"
                x2={`${x}%`}
                y2="100%"
                stroke={color}
                strokeOpacity="0.3"
                strokeDasharray="2,2"
              />
            </g>
          );
        })}

        {/* Grid lines */}
        {showGrid && (
          <>
            {/* Horizontal grid lines */}
            {[25, 50, 75].map((y) => (
              <line
                key={`h-${y}`}
                x1="0"
                y1={`${y}%`}
                x2="100%"
                y2={`${y}%`}
                stroke="white"
                strokeOpacity="0.1"
              />
            ))}
            {/* Vertical grid lines (every 8 bars) */}
            {Array.from({ length: Math.ceil(totalBars / 8) }).map((_, i) => {
              const x = ((i * 8) / totalBars) * 100;
              return (
                <line
                  key={`v-${i}`}
                  x1={`${x}%`}
                  y1="0"
                  x2={`${x}%`}
                  y2="100%"
                  stroke="white"
                  strokeOpacity="0.1"
                />
              );
            })}
          </>
        )}

        {/* Energy curve fill */}
        <path
          d={generateFillPath()}
          fill="url(#energyGradient)"
        />

        {/* Energy curve line */}
        <path
          d={generatePath()}
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="0.5"
          vectorEffect="non-scaling-stroke"
        />

        {/* Key moments markers */}
        {keyMoments.map((moment, idx) => {
          const x = (moment.bar / totalBars) * 100;
          return (
            <g key={idx}>
              <line
                x1={`${x}%`}
                y1="0"
                x2={`${x}%`}
                y2="100%"
                stroke="#f97316"
                strokeOpacity="0.5"
                strokeDasharray="1,1"
              />
              <circle
                cx={`${x}%`}
                cy="10%"
                r="1.5"
                fill="#f97316"
              />
            </g>
          );
        })}

        {/* Data points */}
        {interactive &&
          sortedCurve.map((point, idx) => {
            const x = (point.bar / totalBars) * 100;
            const y = 100 - point.energy;
            return (
              <circle
                key={idx}
                cx={`${x}%`}
                cy={`${y}%`}
                r="1.5"
                fill="#8b5cf6"
                className={interactive ? "cursor-pointer hover:r-3" : ""}
                onClick={() => onPointClick?.(point)}
              />
            );
          })}
      </svg>

      {/* Section labels */}
      {sections.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 flex h-5 border-t border-white/10 bg-black/60">
          {sections.map((section) => {
            const x = (section.startBar / totalBars) * 100;
            const width = (section.lengthBars / totalBars) * 100;
            const color = SECTION_COLORS[section.type] || "#6b7280";

            return (
              <div
                key={section.id}
                className="absolute text-[8px] text-center truncate px-0.5"
                style={{
                  left: `${x}%`,
                  width: `${width}%`,
                  color,
                }}
                title={section.name}
              >
                {section.name}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
