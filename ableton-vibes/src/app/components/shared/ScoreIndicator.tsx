"use client";

type ScoreBreakdown = {
  label: string;
  value: number;
  color?: string;
};

type ScoreIndicatorProps = {
  label: string;
  score: number;
  maxScore?: number;
  breakdown?: ScoreBreakdown[];
  size?: "sm" | "md" | "lg";
  showPercentage?: boolean;
};

export function ScoreIndicator({
  label,
  score,
  maxScore = 100,
  breakdown,
  size = "md",
  showPercentage = true,
}: ScoreIndicatorProps) {
  const percentage = Math.round((score / maxScore) * 100);

  const getScoreColor = (pct: number) => {
    if (pct >= 80) return "#22c55e"; // green
    if (pct >= 60) return "#eab308"; // yellow
    if (pct >= 40) return "#f97316"; // orange
    return "#ef4444"; // red
  };

  const sizeConfig = {
    sm: { circle: "h-12 w-12", text: "text-sm", label: "text-xs" },
    md: { circle: "h-16 w-16", text: "text-lg", label: "text-xs" },
    lg: { circle: "h-20 w-20", text: "text-2xl", label: "text-sm" },
  };

  const config = sizeConfig[size];
  const scoreColor = getScoreColor(percentage);

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Circular score */}
      <div
        className={`relative ${config.circle} rounded-full flex items-center justify-center`}
        style={{
          background: `conic-gradient(${scoreColor} ${percentage * 3.6}deg, rgba(255,255,255,0.1) 0deg)`,
        }}
      >
        <div className="absolute inset-1 rounded-full bg-slate-900 flex items-center justify-center">
          <span className={`font-bold text-white ${config.text}`}>
            {showPercentage ? `${percentage}` : score}
          </span>
        </div>
      </div>

      {/* Label */}
      <span className={`text-white/60 ${config.label} text-center`}>{label}</span>

      {/* Breakdown bars */}
      {breakdown && breakdown.length > 0 && (
        <div className="w-full mt-2 space-y-1">
          {breakdown.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-xs text-white/50 w-20 truncate">{item.label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${item.value}%`,
                    backgroundColor: item.color || getScoreColor(item.value),
                  }}
                />
              </div>
              <span className="text-xs text-white/50 w-8 text-right">{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type MultiScoreProps = {
  scores: { label: string; value: number; color?: string }[];
  layout?: "horizontal" | "grid";
};

export function MultiScore({ scores, layout = "horizontal" }: MultiScoreProps) {
  const getScoreColor = (value: number) => {
    if (value >= 80) return "#22c55e";
    if (value >= 60) return "#eab308";
    if (value >= 40) return "#f97316";
    return "#ef4444";
  };

  return (
    <div
      className={
        layout === "horizontal"
          ? "flex items-center gap-4 flex-wrap"
          : "grid grid-cols-2 md:grid-cols-3 gap-3"
      }
    >
      {scores.map((score, index) => (
        <div
          key={index}
          className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2"
        >
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: score.color || getScoreColor(score.value) }}
          />
          <span className="text-xs text-white/60">{score.label}</span>
          <span className="text-sm font-semibold text-white">{score.value}</span>
        </div>
      ))}
    </div>
  );
}
