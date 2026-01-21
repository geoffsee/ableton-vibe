"use client";

import { useState } from "react";
import { StagePanel } from "../workflow/StagePanel";
import { QuickActionBar } from "../shared";
import { FrequencyCoverage, PaletteEntryCard } from "../visualizations";
import { SoundPalette, PaletteEntry } from "../types";

const FREQUENCY_ROLES = [
  { role: "sub", label: "Sub", range: "20-60Hz" },
  { role: "bass", label: "Bass", range: "60-250Hz" },
  { role: "lowMid", label: "Low Mid", range: "250-500Hz" },
  { role: "mid", label: "Mid", range: "500Hz-2kHz" },
  { role: "highMid", label: "High Mid", range: "2-4kHz" },
  { role: "presence", label: "Presence", range: "4-8kHz" },
  { role: "air", label: "Air", range: "8-20kHz" },
] as const;

type PalettePanelProps = {
  palette?: SoundPalette;
  isLocked?: boolean;
  onGeneratePalette?: () => void;
  onAddEntry?: (role: string) => void;
  onRemoveEntry?: (entryId: string) => void;
  onLock?: () => void;
};

export function PalettePanel({
  palette,
  isLocked = false,
  onGeneratePalette,
  onAddEntry,
  onRemoveEntry,
  onLock,
}: PalettePanelProps) {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const entries = palette?.entries || [];
  const coverageByRole = palette?.coverageByRole || {};

  const getEntriesByRole = (role: string) => entries.filter((e) => e.role === role);

  return (
    <StagePanel
      stage="palette"
      subtitle="Curate your sonic palette across the frequency spectrum"
      isLocked={isLocked}
      actions={
        <QuickActionBar
          actions={[
            {
              label: "Generate Palette",
              onClick: onGeneratePalette || (() => {}),
              variant: "secondary",
              icon: (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              ),
            },
            {
              label: "Suggest Fills",
              onClick: () => {},
              variant: "secondary",
              disabled: entries.length === 0,
            },
            {
              label: isLocked ? "Unlock" : "Lock Palette",
              onClick: onLock || (() => {}),
              variant: "primary",
            },
          ]}
        />
      }
    >
      <div className="space-y-6">
        {/* Frequency coverage visualization */}
        {entries.length > 0 && (
          <FrequencyCoverage
            entries={entries}
            coverageByRole={coverageByRole}
          />
        )}

        {/* Palette stats */}
        {palette && (
          <div className="flex items-center gap-4 text-sm">
            <div className="rounded-lg bg-white/10 px-3 py-1">
              <span className="text-white/60">Elements: </span>
              <span className="text-white font-medium">{entries.length}</span>
              <span className="text-white/40"> / {palette.maxElements}</span>
            </div>
            {palette.forbidden.length > 0 && (
              <div className="rounded-lg bg-red-500/20 px-3 py-1 text-red-300">
                <span className="text-red-400/60">Forbidden: </span>
                {palette.forbidden.join(", ")}
              </div>
            )}
          </div>
        )}

        {/* Entries by frequency band */}
        <div className="space-y-4">
          {FREQUENCY_ROLES.map((band) => {
            const bandEntries = getEntriesByRole(band.role);
            const isSelected = selectedRole === band.role;

            return (
              <div key={band.role} className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                {/* Band header */}
                <button
                  onClick={() => setSelectedRole(isSelected ? null : band.role)}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-white">{band.label}</span>
                    <span className="text-xs text-white/40">{band.range}</span>
                    <span className="text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded">
                      {bandEntries.length} sound{bandEntries.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isLocked && onAddEntry && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddEntry(band.role);
                        }}
                        className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    )}
                    <svg
                      className={`h-4 w-4 text-white/40 transition-transform ${isSelected ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded entries */}
                {isSelected && (
                  <div className="px-4 pb-4 space-y-2">
                    {bandEntries.length > 0 ? (
                      bandEntries.map((entry) => (
                        <PaletteEntryCard
                          key={entry.id}
                          entry={entry}
                          onRemove={
                            isLocked ? undefined : () => onRemoveEntry?.(entry.id)
                          }
                        />
                      ))
                    ) : (
                      <div className="text-center py-4 text-sm text-white/40">
                        No sounds in this frequency range yet.
                        {!isLocked && (
                          <button
                            onClick={() => onAddEntry?.(band.role)}
                            className="ml-2 text-violet-400 hover:text-violet-300"
                          >
                            Add one
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {entries.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4">
              <svg className="h-8 w-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Build your palette</h3>
            <p className="text-sm text-white/60 mb-4">
              Generate sounds that cover the frequency spectrum and match your style.
            </p>
            <button
              onClick={onGeneratePalette}
              className="px-4 py-2 rounded-lg bg-green-500 text-white font-medium hover:bg-green-400 transition-colors"
            >
              Generate Palette
            </button>
          </div>
        )}
      </div>
    </StagePanel>
  );
}
