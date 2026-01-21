"use client";

type GrooveGridProps = {
  kickPattern: number[];
  snarePattern: number[];
  hatPattern: number[];
  percPattern?: number[];
  steps?: number;
  swingAmount?: number;
  highlightStep?: number;
  onCellClick?: (row: string, step: number) => void;
};

const ROWS = [
  { id: "kick", label: "Kick", color: "#f97316" },
  { id: "snare", label: "Snare", color: "#eab308" },
  { id: "hat", label: "Hat", color: "#22c55e" },
  { id: "perc", label: "Perc", color: "#8b5cf6" },
];

export function GrooveGrid({
  kickPattern,
  snarePattern,
  hatPattern,
  percPattern = [],
  steps = 16,
  swingAmount = 0,
  highlightStep,
  onCellClick,
}: GrooveGridProps) {
  const patterns: Record<string, number[]> = {
    kick: kickPattern,
    snare: snarePattern,
    hat: hatPattern,
    perc: percPattern,
  };

  const getVelocityOpacity = (step: number, pattern: number[]) => {
    if (!pattern.includes(step)) return 0;
    // Default velocity, could be enhanced with actual velocity data
    return 0.9;
  };

  return (
    <div className="rounded-xl bg-black/40 p-4">
      {/* Beat markers */}
      <div className="flex mb-2 ml-12">
        {Array.from({ length: steps }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 text-center text-xs ${
              i % 4 === 0 ? "text-white/60 font-semibold" : "text-white/30"
            }`}
          >
            {i % 4 === 0 ? Math.floor(i / 4) + 1 : ""}
          </div>
        ))}
      </div>

      {/* Grid rows */}
      <div className="space-y-1">
        {ROWS.map((row) => {
          const pattern = patterns[row.id] || [];
          if (row.id === "perc" && percPattern.length === 0) return null;

          return (
            <div key={row.id} className="flex items-center gap-2">
              {/* Row label */}
              <div className="w-10 text-xs text-white/60 text-right">{row.label}</div>

              {/* Steps */}
              <div className="flex flex-1 gap-0.5">
                {Array.from({ length: steps }).map((_, step) => {
                  const isActive = pattern.includes(step);
                  const isBeatStart = step % 4 === 0;
                  const isHighlighted = highlightStep === step;

                  return (
                    <button
                      key={step}
                      onClick={() => onCellClick?.(row.id, step)}
                      className={`
                        flex-1 aspect-square rounded-sm transition-all duration-100
                        ${isBeatStart ? "border-l border-white/10" : ""}
                        ${isHighlighted ? "ring-2 ring-white/50" : ""}
                        ${onCellClick ? "hover:scale-110 cursor-pointer" : ""}
                      `}
                      style={{
                        backgroundColor: isActive
                          ? row.color
                          : "rgba(255,255,255,0.05)",
                        opacity: isActive ? getVelocityOpacity(step, pattern) : 1,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Swing indicator */}
      {swingAmount > 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-white/50">
          <span>Swing:</span>
          <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full"
              style={{ width: `${swingAmount}%` }}
            />
          </div>
          <span>{swingAmount}%</span>
        </div>
      )}
    </div>
  );
}

type GrooveCandidateCardProps = {
  candidate: {
    id: string;
    tempo: number;
    meter: string;
    swingAmount: number;
    kickPattern: number[];
    snarePattern: number[];
    hatPattern: number[];
    description: string;
  };
  score?: {
    danceability: number;
    pocket: number;
    genreFit: number;
    overall: number;
  };
  isSelected?: boolean;
  onSelect?: () => void;
};

export function GrooveCandidateCard({
  candidate,
  score,
  isSelected,
  onSelect,
}: GrooveCandidateCardProps) {
  return (
    <div
      className={`
        rounded-2xl border p-4 transition-all duration-200
        ${
          isSelected
            ? "border-violet-500 bg-violet-500/10"
            : "border-white/10 bg-white/5 hover:border-white/20"
        }
        ${onSelect ? "cursor-pointer" : ""}
      `}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-semibold text-white">{candidate.description}</h4>
          <div className="flex items-center gap-3 mt-1 text-xs text-white/60">
            <span>{candidate.tempo} BPM</span>
            <span>{candidate.meter}</span>
            <span>Swing {candidate.swingAmount}%</span>
          </div>
        </div>
        {score && (
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{score.overall}</div>
            <div className="text-xs text-white/50">Score</div>
          </div>
        )}
      </div>

      {/* Mini grid */}
      <GrooveGrid
        kickPattern={candidate.kickPattern}
        snarePattern={candidate.snarePattern}
        hatPattern={candidate.hatPattern}
        swingAmount={candidate.swingAmount}
      />

      {/* Score breakdown */}
      {score && (
        <div className="mt-3 flex gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-white/60">Dance</span>
            <span className="text-white font-medium">{score.danceability}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-yellow-500" />
            <span className="text-white/60">Pocket</span>
            <span className="text-white font-medium">{score.pocket}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-white/60">Fit</span>
            <span className="text-white font-medium">{score.genreFit}</span>
          </div>
        </div>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <div className="mt-3 flex items-center gap-2 text-xs text-violet-400">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          Selected
        </div>
      )}
    </div>
  );
}
