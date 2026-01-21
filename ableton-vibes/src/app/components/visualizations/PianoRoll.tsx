"use client";

import { MotifNote } from "../types";

type PianoRollProps = {
  notes: MotifNote[];
  lengthBars?: number;
  startPitch?: number;
  endPitch?: number;
  color?: string;
  showVelocity?: boolean;
  height?: number;
};

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function PianoRoll({
  notes,
  lengthBars = 2,
  startPitch,
  endPitch,
  color = "#8b5cf6",
  showVelocity = true,
  height = 120,
}: PianoRollProps) {
  // Calculate pitch range from notes or use defaults
  const pitches = notes.map((n) => n.pitch);
  const minPitch = startPitch ?? Math.min(...pitches, 60) - 2;
  const maxPitch = endPitch ?? Math.max(...pitches, 72) + 2;
  const pitchRange = maxPitch - minPitch;

  const totalBeats = lengthBars * 4;
  const gridCols = totalBeats * 4; // 16th note resolution

  const isBlackKey = (pitch: number) => {
    const noteIndex = pitch % 12;
    return [1, 3, 6, 8, 10].includes(noteIndex);
  };

  const getNoteName = (pitch: number) => {
    return NOTE_NAMES[pitch % 12] + Math.floor(pitch / 12 - 1);
  };

  return (
    <div className="rounded-xl bg-black/40 overflow-hidden" style={{ height }}>
      <div className="flex h-full">
        {/* Piano keys */}
        <div className="w-8 flex flex-col-reverse border-r border-white/10">
          {Array.from({ length: pitchRange }).map((_, i) => {
            const pitch = minPitch + i;
            const black = isBlackKey(pitch);
            return (
              <div
                key={pitch}
                className={`flex-1 border-b border-white/5 text-[8px] flex items-center justify-center ${
                  black ? "bg-slate-800 text-white/40" : "bg-slate-700 text-white/60"
                }`}
                title={getNoteName(pitch)}
              >
                {pitch % 12 === 0 ? `C${Math.floor(pitch / 12 - 1)}` : ""}
              </div>
            );
          })}
        </div>

        {/* Grid + Notes */}
        <div className="flex-1 relative">
          {/* Background grid */}
          <div className="absolute inset-0 flex">
            {Array.from({ length: gridCols }).map((_, col) => (
              <div
                key={col}
                className={`flex-1 border-r ${
                  col % 16 === 0
                    ? "border-white/20"
                    : col % 4 === 0
                    ? "border-white/10"
                    : "border-white/5"
                }`}
              />
            ))}
          </div>

          {/* Horizontal pitch lines */}
          <div className="absolute inset-0 flex flex-col-reverse">
            {Array.from({ length: pitchRange }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 border-b ${
                  isBlackKey(minPitch + i) ? "bg-white/[0.02]" : ""
                } border-white/5`}
              />
            ))}
          </div>

          {/* Notes */}
          {notes.map((note, idx) => {
            const left = (note.time / totalBeats) * 100;
            const width = (note.duration / totalBeats) * 100;
            const bottom = ((note.pitch - minPitch) / pitchRange) * 100;
            const noteHeight = 100 / pitchRange;
            const velocityOpacity = showVelocity ? 0.5 + (note.velocity / 127) * 0.5 : 1;

            return (
              <div
                key={idx}
                className="absolute rounded-sm"
                style={{
                  left: `${left}%`,
                  width: `${Math.max(width, 1)}%`,
                  bottom: `${bottom}%`,
                  height: `${noteHeight}%`,
                  backgroundColor: color,
                  opacity: velocityOpacity,
                }}
                title={`${getNoteName(note.pitch)} - vel: ${note.velocity}`}
              />
            );
          })}

          {/* Beat markers */}
          <div className="absolute bottom-0 left-0 right-0 flex h-4 border-t border-white/10 bg-black/40">
            {Array.from({ length: totalBeats }).map((_, beat) => (
              <div
                key={beat}
                className={`flex-1 text-center text-[8px] ${
                  beat % 4 === 0 ? "text-white/60" : "text-white/30"
                }`}
              >
                {beat % 4 === 0 ? Math.floor(beat / 4) + 1 : ""}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

type MotifCardProps = {
  motif: {
    id: string;
    type: "melodic" | "rhythmic" | "harmonic" | "textural";
    name: string;
    notes: MotifNote[];
    lengthBars: number;
    key: string;
    scale: string;
    description?: string;
  };
  score?: {
    memorability: number;
    singability: number;
    novelty: number;
    overall: number;
  };
  isSelected?: boolean;
  onSelect?: () => void;
  color?: string;
};

const TYPE_COLORS: Record<string, string> = {
  melodic: "#ec4899",
  rhythmic: "#f97316",
  harmonic: "#22c55e",
  textural: "#8b5cf6",
};

export function MotifCard({
  motif,
  score,
  isSelected,
  onSelect,
  color,
}: MotifCardProps) {
  const typeColor = color || TYPE_COLORS[motif.type] || "#8b5cf6";

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
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium capitalize"
              style={{ backgroundColor: `${typeColor}20`, color: typeColor }}
            >
              {motif.type}
            </span>
            <h4 className="font-semibold text-white">{motif.name}</h4>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-white/60">
            <span>{motif.key}</span>
            <span>{motif.scale}</span>
            <span>{motif.lengthBars} bar{motif.lengthBars > 1 ? "s" : ""}</span>
          </div>
        </div>
        {score && (
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{score.overall}</div>
            <div className="text-xs text-white/50">Score</div>
          </div>
        )}
      </div>

      {/* Piano roll */}
      <PianoRoll
        notes={motif.notes}
        lengthBars={motif.lengthBars}
        color={typeColor}
        height={80}
      />

      {/* Description */}
      {motif.description && (
        <p className="mt-3 text-xs text-white/60">{motif.description}</p>
      )}

      {/* Score breakdown */}
      {score && (
        <div className="mt-3 flex gap-4 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-white/60">Memorable</span>
            <span className="text-white font-medium">{score.memorability}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-white/60">Singable</span>
            <span className="text-white font-medium">{score.singability}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-white/60">Novel</span>
            <span className="text-white font-medium">{score.novelty}</span>
          </div>
        </div>
      )}

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
