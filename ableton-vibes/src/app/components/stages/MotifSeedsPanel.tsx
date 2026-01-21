"use client";

import { useState } from "react";
import { StagePanel } from "../workflow/StagePanel";
import { QuickActionBar } from "../shared";
import { MotifCard } from "../visualizations";
import { MotifSeedSet, MotifSeed, MotifScore } from "../types";

const MOTIF_TYPES = [
  { type: "melodic", label: "Melodic", color: "#ec4899" },
  { type: "rhythmic", label: "Rhythmic", color: "#f97316" },
  { type: "harmonic", label: "Harmonic", color: "#22c55e" },
  { type: "textural", label: "Textural", color: "#8b5cf6" },
] as const;

type MotifSeedsPanelProps = {
  motifSeedSet?: MotifSeedSet;
  isLocked?: boolean;
  onGenerateMotifs?: (type?: string) => void;
  onScoreMotifs?: () => void;
  onSelectMotif?: (motif: MotifSeed) => void;
  onLock?: () => void;
};

export function MotifSeedsPanel({
  motifSeedSet,
  isLocked = false,
  onGenerateMotifs,
  onScoreMotifs,
  onSelectMotif,
  onLock,
}: MotifSeedsPanelProps) {
  const [selectedType, setSelectedType] = useState<string | null>("melodic");
  const [selectedMotifIds, setSelectedMotifIds] = useState<Set<string>>(new Set());

  const seeds = motifSeedSet?.seeds || [];
  const scores = motifSeedSet?.scores || [];

  const getMotifsByType = (type: string) => seeds.filter((s) => s.type === type);
  const getScoreForMotif = (motifId: string) => scores.find((s) => s.motifId === motifId);

  const toggleMotifSelection = (motif: MotifSeed) => {
    const newSelected = new Set(selectedMotifIds);
    if (newSelected.has(motif.id)) {
      newSelected.delete(motif.id);
    } else {
      newSelected.add(motif.id);
    }
    setSelectedMotifIds(newSelected);
    onSelectMotif?.(motif);
  };

  const filteredMotifs = selectedType
    ? getMotifsByType(selectedType)
    : seeds;

  // Sort by score if available
  const sortedMotifs = [...filteredMotifs].sort((a, b) => {
    const scoreA = getScoreForMotif(a.id)?.overall || 0;
    const scoreB = getScoreForMotif(b.id)?.overall || 0;
    return scoreB - scoreA;
  });

  return (
    <StagePanel
      stage="motifSeed"
      subtitle="Generate and select memorable musical ideas"
      isLocked={isLocked}
      actions={
        <QuickActionBar
          actions={[
            {
              label: "Generate",
              onClick: () => onGenerateMotifs?.(selectedType || undefined),
              variant: "secondary",
              icon: (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              ),
            },
            {
              label: "Score All",
              onClick: onScoreMotifs || (() => {}),
              variant: "secondary",
              disabled: seeds.length === 0,
            },
            {
              label: isLocked ? "Unlock" : "Lock Seeds",
              onClick: onLock || (() => {}),
              variant: "primary",
              disabled: selectedMotifIds.size === 0,
            },
          ]}
        />
      }
    >
      <div className="space-y-6">
        {/* Type filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedType(null)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
              ${!selectedType ? "bg-violet-500 text-white" : "bg-white/10 text-white/60 hover:bg-white/20"}
            `}
          >
            All ({seeds.length})
          </button>
          {MOTIF_TYPES.map((type) => {
            const count = getMotifsByType(type.type).length;
            return (
              <button
                key={type.type}
                onClick={() => setSelectedType(type.type)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                  ${selectedType === type.type ? "text-white" : "bg-white/10 text-white/60 hover:bg-white/20"}
                `}
                style={{
                  backgroundColor: selectedType === type.type ? type.color : undefined,
                }}
              >
                {type.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Stats */}
        {motifSeedSet && (
          <div className="flex items-center gap-4 text-sm">
            <div className="rounded-lg bg-white/10 px-3 py-1">
              <span className="text-white/60">Generated: </span>
              <span className="text-white font-medium">{motifSeedSet.totalGenerated}</span>
            </div>
            <div className="rounded-lg bg-white/10 px-3 py-1">
              <span className="text-white/60">Selected: </span>
              <span className="text-white font-medium">{selectedMotifIds.size}</span>
              <span className="text-white/40"> / {motifSeedSet.topN}</span>
            </div>
          </div>
        )}

        {/* Motif grid */}
        {sortedMotifs.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {sortedMotifs.map((motif) => {
              const score = getScoreForMotif(motif.id);
              return (
                <MotifCard
                  key={motif.id}
                  motif={motif}
                  score={score}
                  isSelected={selectedMotifIds.has(motif.id)}
                  onSelect={isLocked ? undefined : () => toggleMotifSelection(motif)}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4">
              <svg className="h-8 w-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {selectedType ? `No ${selectedType} motifs yet` : "No motifs generated"}
            </h3>
            <p className="text-sm text-white/60 mb-4">
              Generate musical ideas that will form the DNA of your track.
            </p>
            <button
              onClick={() => onGenerateMotifs?.(selectedType || undefined)}
              className="px-4 py-2 rounded-lg bg-cyan-500 text-white font-medium hover:bg-cyan-400 transition-colors"
            >
              Generate {selectedType ? selectedType.charAt(0).toUpperCase() + selectedType.slice(1) : ""} Motifs
            </button>
          </div>
        )}
      </div>
    </StagePanel>
  );
}
