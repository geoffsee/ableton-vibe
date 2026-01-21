"use client";

import { useState } from "react";
import { StagePanel } from "../workflow/StagePanel";
import { QuickActionBar } from "../shared";
import { PianoRoll } from "../visualizations";
import { SectionComposition, Voice, ArrangementSection } from "../types";

const VOICE_ROLES = [
  { role: "bass", label: "Bass", color: "#ef4444" },
  { role: "harmony", label: "Harmony", color: "#22c55e" },
  { role: "topline", label: "Topline", color: "#ec4899" },
  { role: "lead", label: "Lead", color: "#f97316" },
  { role: "counterline", label: "Counter", color: "#8b5cf6" },
  { role: "rhythm", label: "Rhythm", color: "#eab308" },
  { role: "pad", label: "Pad", color: "#06b6d4" },
  { role: "texture", label: "Texture", color: "#64748b" },
  { role: "fx", label: "FX", color: "#a855f7" },
] as const;

type ComposePanelProps = {
  compositions?: SectionComposition[];
  sections?: ArrangementSection[];
  isLocked?: boolean;
  onGenerateComposition?: (sectionId: string) => void;
  onScoreComposition?: (sectionId: string) => void;
  onUpdateVoice?: (sectionId: string, voice: Voice) => void;
  onLock?: () => void;
};

export function ComposePanel({
  compositions = [],
  sections = [],
  isLocked = false,
  onGenerateComposition,
  onScoreComposition,
  onUpdateVoice,
  onLock,
}: ComposePanelProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    sections[0]?.id || null
  );
  const [expandedVoices, setExpandedVoices] = useState<Set<string>>(new Set());

  const selectedComposition = compositions.find((c) => c.sectionId === selectedSectionId);
  const selectedSection = sections.find((s) => s.id === selectedSectionId);

  const toggleVoiceExpanded = (voiceRole: string) => {
    const newExpanded = new Set(expandedVoices);
    if (newExpanded.has(voiceRole)) {
      newExpanded.delete(voiceRole);
    } else {
      newExpanded.add(voiceRole);
    }
    setExpandedVoices(newExpanded);
  };

  const getVoiceColor = (role: string) => {
    return VOICE_ROLES.find((v) => v.role === role)?.color || "#8b5cf6";
  };

  return (
    <StagePanel
      stage="composeOrchestrate"
      subtitle="Compose and orchestrate each section"
      isLocked={isLocked}
      actions={
        <QuickActionBar
          actions={[
            {
              label: "Compose Section",
              onClick: () => selectedSectionId && onGenerateComposition?.(selectedSectionId),
              variant: "secondary",
              disabled: !selectedSectionId,
              icon: (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              ),
            },
            {
              label: "Score",
              onClick: () => selectedSectionId && onScoreComposition?.(selectedSectionId),
              variant: "secondary",
              disabled: !selectedComposition,
            },
            {
              label: isLocked ? "Unlock" : "Lock Compositions",
              onClick: onLock || (() => {}),
              variant: "primary",
              disabled: compositions.length === 0,
            },
          ]}
        />
      }
    >
      <div className="space-y-6">
        {/* Section selector */}
        {sections.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {sections.map((section) => {
              const hasComposition = compositions.some((c) => c.sectionId === section.id);
              const isSelected = selectedSectionId === section.id;

              return (
                <button
                  key={section.id}
                  onClick={() => setSelectedSectionId(section.id)}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all
                    ${isSelected ? "bg-violet-500 text-white" : "bg-white/10 text-white/60 hover:bg-white/20"}
                  `}
                >
                  {section.name}
                  {hasComposition && (
                    <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-green-400" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Selected section info */}
        {selectedSection && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">{selectedSection.name}</h3>
                <div className="flex items-center gap-3 text-sm text-white/60">
                  <span>{selectedSection.lengthBars} bars</span>
                  <span>Energy: {selectedSection.energyLevel}%</span>
                  <span>Bar {selectedSection.startBar}</span>
                </div>
              </div>
              {selectedComposition && (
                <div className="text-right">
                  <div className="text-sm text-white/60">Density</div>
                  <div className="text-xl font-bold text-white">
                    {selectedComposition.densityLevel}/10
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Voices */}
        {selectedComposition?.voices && selectedComposition.voices.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-white/80">
                Voices ({selectedComposition.voices.length})
              </label>
            </div>

            {selectedComposition.voices.map((voice, idx) => {
              const color = getVoiceColor(voice.role);
              const isExpanded = expandedVoices.has(voice.role);

              return (
                <div
                  key={`${voice.role}-${idx}`}
                  className="rounded-xl border border-white/10 bg-white/5 overflow-hidden"
                >
                  {/* Voice header */}
                  <button
                    onClick={() => toggleVoiceExpanded(voice.role)}
                    className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <div className="text-left">
                        <span className="text-sm font-medium text-white capitalize">
                          {voice.role}
                        </span>
                        <span className="text-xs text-white/50 ml-2">
                          {voice.trackName} / {voice.clipName}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/40">
                        {voice.notes.length} notes
                      </span>
                      <svg
                        className={`h-4 w-4 text-white/40 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Piano roll */}
                  {isExpanded && voice.notes.length > 0 && (
                    <div className="px-4 pb-4">
                      <PianoRoll
                        notes={voice.notes}
                        lengthBars={selectedSection?.lengthBars || 4}
                        color={color}
                        height={100}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Harmony progression */}
            {selectedComposition.harmonyProgression.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <label className="text-sm font-medium text-white/80 mb-3 block">
                  Harmony Progression
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedComposition.harmonyProgression.map((chord, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg bg-green-500/20 px-3 py-2 text-center"
                    >
                      <div className="text-lg font-bold text-green-400">{chord.chord}</div>
                      <div className="text-xs text-white/40">
                        Beat {chord.startBeat} ({chord.duration}b)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : selectedSectionId ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4">
              <svg className="h-8 w-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Compose "{selectedSection?.name}"
            </h3>
            <p className="text-sm text-white/60 mb-4">
              Generate voices and harmonies for this section.
            </p>
            <button
              onClick={() => onGenerateComposition?.(selectedSectionId)}
              className="px-4 py-2 rounded-lg bg-violet-500 text-white font-medium hover:bg-violet-400 transition-colors"
            >
              Generate Composition
            </button>
          </div>
        ) : (
          <div className="text-center py-12 text-sm text-white/60">
            Select a section to compose
          </div>
        )}
      </div>
    </StagePanel>
  );
}
