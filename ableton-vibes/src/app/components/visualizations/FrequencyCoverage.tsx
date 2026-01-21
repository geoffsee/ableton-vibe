"use client";

import { PaletteEntry } from "../types";

type FrequencyCoverageProps = {
  entries: PaletteEntry[];
  coverageByRole: Record<string, number>;
};

const FREQUENCY_BANDS = [
  { role: "sub", label: "Sub", range: "20-60Hz", color: "#ef4444" },
  { role: "bass", label: "Bass", range: "60-250Hz", color: "#f97316" },
  { role: "lowMid", label: "Low Mid", range: "250-500Hz", color: "#eab308" },
  { role: "mid", label: "Mid", range: "500Hz-2kHz", color: "#22c55e" },
  { role: "highMid", label: "High Mid", range: "2-4kHz", color: "#06b6d4" },
  { role: "presence", label: "Presence", range: "4-8kHz", color: "#3b82f6" },
  { role: "air", label: "Air", range: "8-20kHz", color: "#8b5cf6" },
];

export function FrequencyCoverage({
  entries,
  coverageByRole,
}: FrequencyCoverageProps) {
  const getEntriesForRole = (role: string) =>
    entries.filter((e) => e.role === role);

  const totalCoverage =
    Object.values(coverageByRole).reduce((a, b) => a + b, 0) /
    Object.keys(coverageByRole).length;

  return (
    <div className="rounded-xl bg-black/40 p-4">
      {/* Overall coverage */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-white/60">Frequency Coverage</span>
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500"
              style={{ width: `${totalCoverage}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-white">
            {Math.round(totalCoverage)}%
          </span>
        </div>
      </div>

      {/* Frequency bands */}
      <div className="space-y-3">
        {FREQUENCY_BANDS.map((band) => {
          const coverage = coverageByRole[band.role] || 0;
          const bandEntries = getEntriesForRole(band.role);

          return (
            <div key={band.role} className="space-y-1">
              {/* Band header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: band.color }}
                  />
                  <span className="text-xs font-medium text-white/80">
                    {band.label}
                  </span>
                  <span className="text-xs text-white/40">{band.range}</span>
                </div>
                <span className="text-xs text-white/60">{Math.round(coverage)}%</span>
              </div>

              {/* Progress bar */}
              <div className="h-6 rounded-lg bg-white/5 overflow-hidden flex items-center">
                <div
                  className="h-full flex items-center px-2 gap-1 transition-all duration-300"
                  style={{
                    width: `${Math.max(coverage, 5)}%`,
                    backgroundColor: `${band.color}30`,
                  }}
                >
                  {bandEntries.slice(0, 3).map((entry, idx) => (
                    <span
                      key={entry.id}
                      className="text-xs truncate"
                      style={{ color: band.color }}
                    >
                      {entry.name}
                      {idx < Math.min(bandEntries.length, 3) - 1 && ", "}
                    </span>
                  ))}
                  {bandEntries.length > 3 && (
                    <span className="text-xs text-white/40">
                      +{bandEntries.length - 3}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type PaletteEntryCardProps = {
  entry: PaletteEntry;
  onRemove?: () => void;
};

export function PaletteEntryCard({ entry, onRemove }: PaletteEntryCardProps) {
  const band = FREQUENCY_BANDS.find((b) => b.role === entry.role);
  const color = band?.color || "#8b5cf6";

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="h-8 w-1 rounded-full"
            style={{ backgroundColor: color }}
          />
          <div>
            <h4 className="text-sm font-medium text-white">{entry.name}</h4>
            <div className="flex items-center gap-2 text-xs text-white/50">
              <span className="capitalize">{entry.role}</span>
              <span>|</span>
              <span className="capitalize">{entry.type}</span>
              <span>|</span>
              <span>
                {entry.frequencyRange.low}-{entry.frequencyRange.high}Hz
              </span>
            </div>
          </div>
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/80"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Characteristics */}
      {entry.characteristics.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {entry.characteristics.map((char, idx) => (
            <span
              key={idx}
              className="text-xs rounded-full px-2 py-0.5"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {char}
            </span>
          ))}
        </div>
      )}

      {/* Processing hints */}
      {entry.processingHints.length > 0 && (
        <div className="mt-2 text-xs text-white/40">
          Hints: {entry.processingHints.join(", ")}
        </div>
      )}
    </div>
  );
}
