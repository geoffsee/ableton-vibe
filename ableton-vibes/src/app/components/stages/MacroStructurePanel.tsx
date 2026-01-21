"use client";

import { useState } from "react";
import { StagePanel } from "../workflow/StagePanel";
import { QuickActionBar } from "../shared";
import { ArrangementTimeline, SectionCard } from "../visualizations";
import { EnergyCurve } from "../visualizations";
import { MacroStructure, ArrangementSection } from "../types";

const ARCHETYPES = [
  { value: "build-drop", label: "Build-Drop", description: "EDM/Dance style" },
  { value: "verse-chorus", label: "Verse-Chorus", description: "Pop/Song style" },
  { value: "aba", label: "ABA", description: "Classical form" },
  { value: "through-composed", label: "Through-Composed", description: "Progressive" },
  { value: "rondo", label: "Rondo", description: "Recurring theme" },
];

const SECTION_TYPES = [
  "intro", "verse", "preChorus", "chorus", "buildup", "build",
  "drop", "breakdown", "bridge", "transition", "outro"
];

type MacroStructurePanelProps = {
  macroStructure?: MacroStructure;
  isLocked?: boolean;
  onGenerateStructure?: (archetype?: string) => void;
  onAddSection?: (section: Partial<ArrangementSection>) => void;
  onUpdateSection?: (section: ArrangementSection) => void;
  onRemoveSection?: (sectionId: string) => void;
  onLock?: () => void;
};

export function MacroStructurePanel({
  macroStructure,
  isLocked = false,
  onGenerateStructure,
  onAddSection,
  onUpdateSection,
  onRemoveSection,
  onLock,
}: MacroStructurePanelProps) {
  const [selectedArchetype, setSelectedArchetype] = useState<string>(
    macroStructure?.archetype || "build-drop"
  );
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  const sections = macroStructure?.sections || [];
  const energyCurve = macroStructure?.energyCurve || [];
  const keyMoments = macroStructure?.keyMoments || [];
  const totalBars = macroStructure?.totalBars || 128;

  return (
    <StagePanel
      stage="macroStructure"
      subtitle="Design the arrangement architecture"
      isLocked={isLocked}
      actions={
        <QuickActionBar
          actions={[
            {
              label: "Generate Structure",
              onClick: () => onGenerateStructure?.(selectedArchetype),
              variant: "secondary",
              icon: (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
              ),
            },
            {
              label: "Add Section",
              onClick: () => onAddSection?.({ type: "verse", name: "New Section" }),
              variant: "secondary",
              disabled: isLocked,
            },
            {
              label: isLocked ? "Unlock" : "Lock Structure",
              onClick: onLock || (() => {}),
              variant: "primary",
              disabled: sections.length === 0,
            },
          ]}
        />
      }
    >
      <div className="space-y-6">
        {/* Archetype selector */}
        <div>
          <label className="text-sm font-medium text-white/80 mb-2 block">
            Structural Archetype
          </label>
          <div className="flex flex-wrap gap-2">
            {ARCHETYPES.map((arch) => (
              <button
                key={arch.value}
                onClick={() => setSelectedArchetype(arch.value)}
                disabled={isLocked}
                className={`
                  px-4 py-2 rounded-lg text-sm transition-all duration-200
                  ${
                    selectedArchetype === arch.value
                      ? "bg-blue-500 text-white"
                      : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
                  }
                  ${isLocked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                <span className="font-medium">{arch.label}</span>
                <span className="text-xs opacity-70 ml-1">({arch.description})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Timeline visualization */}
        {sections.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-white/80">
                Arrangement Timeline ({totalBars} bars)
              </label>
              <span className="text-xs text-white/40">
                {sections.length} sections
              </span>
            </div>
            <ArrangementTimeline
              sections={sections}
              totalBars={totalBars}
              energyCurve={energyCurve}
              keyMoments={keyMoments}
              onSectionClick={(section) => setSelectedSectionId(section.id)}
              selectedSectionId={selectedSectionId || undefined}
            />
          </div>
        )}

        {/* Energy curve */}
        {energyCurve.length > 0 && (
          <div>
            <label className="text-sm font-medium text-white/80 mb-2 block">
              Energy Curve
            </label>
            <EnergyCurve
              energyCurve={energyCurve}
              totalBars={totalBars}
              sections={sections}
              keyMoments={keyMoments}
              height={100}
            />
          </div>
        )}

        {/* Key moments */}
        {keyMoments.length > 0 && (
          <div>
            <label className="text-sm font-medium text-white/80 mb-2 block">
              Key Moments
            </label>
            <div className="flex flex-wrap gap-2">
              {keyMoments.map((moment, idx) => (
                <div
                  key={idx}
                  className="rounded-lg bg-orange-500/20 px-3 py-1 text-sm"
                >
                  <span className="text-orange-400 font-medium">Bar {moment.bar}:</span>
                  <span className="text-white/80 ml-2">{moment.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section cards */}
        {sections.length > 0 && (
          <div>
            <label className="text-sm font-medium text-white/80 mb-3 block">
              Section Details
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              {sections.map((section) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  onEdit={isLocked ? undefined : () => setSelectedSectionId(section.id)}
                  onDelete={isLocked ? undefined : () => onRemoveSection?.(section.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {sections.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4">
              <svg className="h-8 w-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Design your structure</h3>
            <p className="text-sm text-white/60 mb-4">
              Create the arrangement blueprint with sections and energy flow.
            </p>
            <button
              onClick={() => onGenerateStructure?.(selectedArchetype)}
              className="px-4 py-2 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-400 transition-colors"
            >
              Generate Structure
            </button>
          </div>
        )}
      </div>
    </StagePanel>
  );
}
