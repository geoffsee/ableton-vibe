"use client";

import { useState } from "react";
import { StagePanel } from "../workflow/StagePanel";
import { QuickActionBar } from "../shared";
import { GrooveGrid, GrooveCandidateCard } from "../visualizations";
import { GrooveCandidate, GrooveScore, TimeBase } from "../types";

type TimeBasePanelProps = {
  timeBase?: TimeBase;
  grooveCandidates?: GrooveCandidate[];
  grooveScores?: GrooveScore[];
  isLocked?: boolean;
  onGenerateCandidates?: () => void;
  onSelectGroove?: (candidate: GrooveCandidate) => void;
  onScoreCandidates?: () => void;
  onLock?: () => void;
};

export function TimeBasePanel({
  timeBase,
  grooveCandidates = [],
  grooveScores = [],
  isLocked = false,
  onGenerateCandidates,
  onSelectGroove,
  onScoreCandidates,
  onLock,
}: TimeBasePanelProps) {
  const [selectedId, setSelectedId] = useState<string | undefined>(
    timeBase?.selectedGroove?.id
  );

  const getScoreForCandidate = (candidateId: string) => {
    return grooveScores.find((s) => s.candidateId === candidateId);
  };

  const handleSelect = (candidate: GrooveCandidate) => {
    setSelectedId(candidate.id);
    onSelectGroove?.(candidate);
  };

  return (
    <StagePanel
      stage="timeBase"
      subtitle="Establish the groove foundation and tempo"
      isLocked={isLocked}
      actions={
        <QuickActionBar
          actions={[
            {
              label: "Generate Grooves",
              onClick: onGenerateCandidates || (() => {}),
              variant: "secondary",
              icon: (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ),
            },
            {
              label: "Score All",
              onClick: onScoreCandidates || (() => {}),
              variant: "secondary",
              disabled: grooveCandidates.length === 0,
            },
            {
              label: isLocked ? "Unlock" : "Lock Time Base",
              onClick: onLock || (() => {}),
              variant: "primary",
              disabled: !selectedId,
            },
          ]}
        />
      }
    >
      <div className="space-y-6">
        {/* Current selection / locked groove */}
        {timeBase?.selectedGroove && (
          <div className="rounded-xl border-2 border-violet-500 bg-violet-500/10 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-xs text-violet-400 uppercase tracking-wider">
                  {isLocked ? "Locked Groove" : "Selected Groove"}
                </span>
                <h3 className="text-lg font-semibold text-white">
                  {timeBase.selectedGroove.description}
                </h3>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  {timeBase.finalTempo} <span className="text-sm font-normal text-white/60">BPM</span>
                </div>
                <div className="text-sm text-white/60">{timeBase.finalMeter}</div>
              </div>
            </div>
            <GrooveGrid
              kickPattern={timeBase.selectedGroove.kickPattern}
              snarePattern={timeBase.selectedGroove.snarePattern}
              hatPattern={timeBase.selectedGroove.hatPattern}
              swingAmount={timeBase.selectedGroove.swingAmount}
            />
          </div>
        )}

        {/* Groove candidates */}
        {grooveCandidates.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-white/80 mb-3">
              Groove Candidates ({grooveCandidates.length})
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {grooveCandidates.map((candidate) => {
                const score = getScoreForCandidate(candidate.id);
                return (
                  <GrooveCandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    score={score}
                    isSelected={selectedId === candidate.id}
                    onSelect={isLocked ? undefined : () => handleSelect(candidate)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {grooveCandidates.length === 0 && !timeBase?.selectedGroove && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4">
              <svg className="h-8 w-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No grooves yet</h3>
            <p className="text-sm text-white/60 mb-4">
              Generate groove candidates based on your style prior and brief.
            </p>
            <button
              onClick={onGenerateCandidates}
              className="px-4 py-2 rounded-lg bg-yellow-500 text-black font-medium hover:bg-yellow-400 transition-colors"
            >
              Generate Grooves
            </button>
          </div>
        )}

        {/* Alternate grooves (when locked) */}
        {isLocked && timeBase?.alternateGrooves && timeBase.alternateGrooves.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-white/60 mb-3">
              Alternate Grooves (for variations)
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              {timeBase.alternateGrooves.map((alt) => (
                <div
                  key={alt.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  <div className="text-sm font-medium text-white mb-1">{alt.description}</div>
                  <div className="text-xs text-white/50">
                    {alt.tempo} BPM | Swing {alt.swingAmount}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </StagePanel>
  );
}
