"use client";

import { useState } from "react";
import { StagePanel } from "../workflow/StagePanel";
import { QuickActionBar } from "../shared";
import { TagList, DataCard } from "../shared";
import { ProductionBrief, ProductionSpec } from "../types";

const GENRE_OPTIONS = [
  "House", "Techno", "Downtempo", "Ambient", "Trance", "Drum & Bass",
  "Dubstep", "Breakbeat", "IDM", "Electro", "Deep House", "Progressive",
  "Minimal", "Acid", "Lo-fi", "Synthwave", "Hip Hop", "R&B",
];

const MOOD_OPTIONS = [
  "Dark", "Euphoric", "Melancholic", "Energetic", "Chill", "Aggressive",
  "Dreamy", "Hypnotic", "Groovy", "Uplifting", "Moody", "Playful",
  "Introspective", "Ethereal", "Raw", "Warm", "Cold", "Nostalgic",
];

const USE_CASE_OPTIONS = [
  { value: "club", label: "Club / DJ Set" },
  { value: "listening", label: "Home Listening" },
  { value: "sync", label: "Sync / Licensing" },
  { value: "live", label: "Live Performance" },
  { value: "ambient", label: "Ambient / Background" },
  { value: "workout", label: "Workout / Energy" },
];

type BriefWizardProps = {
  brief?: ProductionBrief;
  spec?: ProductionSpec;
  isLocked?: boolean;
  onBriefChange?: (brief: ProductionBrief) => void;
  onLockIntent?: () => void;
  onGenerateSpec?: () => void;
};

export function BriefWizard({
  brief,
  spec,
  isLocked = false,
  onBriefChange,
  onLockIntent,
  onGenerateSpec,
}: BriefWizardProps) {
  const [localBrief, setLocalBrief] = useState<ProductionBrief>(
    brief || {
      genres: [],
      references: [],
      mood: [],
      useCase: undefined,
      targetDurationBars: 128,
      rules: { must: [], mustNot: [] },
    }
  );

  const [newReference, setNewReference] = useState("");
  const [newMustRule, setNewMustRule] = useState("");
  const [newMustNotRule, setNewMustNotRule] = useState("");

  const updateBrief = (updates: Partial<ProductionBrief>) => {
    const updated = { ...localBrief, ...updates };
    setLocalBrief(updated);
    onBriefChange?.(updated);
  };

  const toggleGenre = (genre: string) => {
    const genres = localBrief.genres.includes(genre)
      ? localBrief.genres.filter((g) => g !== genre)
      : [...localBrief.genres, genre];
    updateBrief({ genres });
  };

  const toggleMood = (mood: string) => {
    const moods = localBrief.mood.includes(mood)
      ? localBrief.mood.filter((m) => m !== mood)
      : [...localBrief.mood, mood];
    updateBrief({ mood: moods });
  };

  const addReference = () => {
    if (newReference.trim()) {
      updateBrief({ references: [...(localBrief.references || []), newReference.trim()] });
      setNewReference("");
    }
  };

  const removeReference = (ref: string) => {
    updateBrief({ references: localBrief.references?.filter((r) => r !== ref) });
  };

  const addMustRule = () => {
    if (newMustRule.trim()) {
      updateBrief({
        rules: {
          must: [...(localBrief.rules?.must || []), newMustRule.trim()],
          mustNot: localBrief.rules?.mustNot || [],
        },
      });
      setNewMustRule("");
    }
  };

  const addMustNotRule = () => {
    if (newMustNotRule.trim()) {
      updateBrief({
        rules: {
          must: localBrief.rules?.must || [],
          mustNot: [...(localBrief.rules?.mustNot || []), newMustNotRule.trim()],
        },
      });
      setNewMustNotRule("");
    }
  };

  const isComplete = localBrief.genres.length > 0 && localBrief.mood.length > 0;

  return (
    <StagePanel
      stage="briefIngestion"
      subtitle="Define your creative vision and constraints"
      isLocked={isLocked}
      actions={
        <QuickActionBar
          actions={[
            {
              label: "Generate Spec",
              onClick: onGenerateSpec || (() => {}),
              variant: "secondary",
              disabled: !isComplete,
            },
            {
              label: isLocked ? "Unlock Intent" : "Lock Intent",
              onClick: onLockIntent || (() => {}),
              variant: "primary",
              disabled: !isComplete,
              icon: (
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  {isLocked ? (
                    <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                  ) : (
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  )}
                </svg>
              ),
            },
          ]}
        />
      }
    >
      <div className="space-y-6">
        {/* Genres */}
        <div>
          <label className="text-sm font-medium text-white/80 mb-2 block">
            Genres <span className="text-white/40">(select 1-3)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {GENRE_OPTIONS.map((genre) => (
              <button
                key={genre}
                onClick={() => toggleGenre(genre)}
                disabled={isLocked}
                className={`
                  px-3 py-1.5 rounded-full text-sm transition-all duration-200
                  ${
                    localBrief.genres.includes(genre)
                      ? "bg-pink-500 text-white"
                      : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
                  }
                  ${isLocked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        {/* Mood */}
        <div>
          <label className="text-sm font-medium text-white/80 mb-2 block">
            Mood & Vibe <span className="text-white/40">(select 2-4)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {MOOD_OPTIONS.map((mood) => (
              <button
                key={mood}
                onClick={() => toggleMood(mood)}
                disabled={isLocked}
                className={`
                  px-3 py-1.5 rounded-full text-sm transition-all duration-200
                  ${
                    localBrief.mood.includes(mood)
                      ? "bg-orange-500 text-white"
                      : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
                  }
                  ${isLocked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                {mood}
              </button>
            ))}
          </div>
        </div>

        {/* Reference tracks */}
        <div>
          <label className="text-sm font-medium text-white/80 mb-2 block">
            Reference Tracks <span className="text-white/40">(optional)</span>
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newReference}
              onChange={(e) => setNewReference(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addReference()}
              placeholder="Artist - Track name"
              disabled={isLocked}
              className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 border border-white/10 focus:border-violet-500 focus:outline-none disabled:opacity-50"
            />
            <button
              onClick={addReference}
              disabled={isLocked || !newReference.trim()}
              className="px-4 py-2 rounded-lg bg-violet-600 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
          {(localBrief.references?.length ?? 0) > 0 && (
            <TagList
              tags={localBrief.references || []}
              color="#f97316"
              onRemove={isLocked ? undefined : removeReference}
            />
          )}
        </div>

        {/* Use Case */}
        <div>
          <label className="text-sm font-medium text-white/80 mb-2 block">Use Case</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {USE_CASE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => updateBrief({ useCase: option.value })}
                disabled={isLocked}
                className={`
                  px-3 py-2 rounded-lg text-sm text-left transition-all duration-200
                  ${
                    localBrief.useCase === option.value
                      ? "bg-violet-500 text-white"
                      : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
                  }
                  ${isLocked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="text-sm font-medium text-white/80 mb-2 block">
            Target Duration: {localBrief.targetDurationBars} bars
            <span className="text-white/40 ml-2">
              (~{Math.round((localBrief.targetDurationBars || 128) / 32)} min at 120 BPM)
            </span>
          </label>
          <input
            type="range"
            min={64}
            max={256}
            step={16}
            value={localBrief.targetDurationBars || 128}
            onChange={(e) => updateBrief({ targetDurationBars: parseInt(e.target.value) })}
            disabled={isLocked}
            className="w-full accent-violet-500 disabled:opacity-50"
          />
          <div className="flex justify-between text-xs text-white/40 mt-1">
            <span>64 bars</span>
            <span>128 bars</span>
            <span>192 bars</span>
            <span>256 bars</span>
          </div>
        </div>

        {/* Rules */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Must include */}
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
            <label className="text-sm font-medium text-green-400 mb-2 block">
              Must Include
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newMustRule}
                onChange={(e) => setNewMustRule(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addMustRule()}
                placeholder="e.g., 303 acid line"
                disabled={isLocked}
                className="flex-1 rounded-lg bg-black/30 px-3 py-2 text-sm text-white placeholder-white/40 border border-white/10 focus:border-green-500 focus:outline-none disabled:opacity-50"
              />
              <button
                onClick={addMustRule}
                disabled={isLocked || !newMustRule.trim()}
                className="px-3 py-2 rounded-lg bg-green-600 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>
            <div className="space-y-1">
              {localBrief.rules?.must.map((rule, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-green-300">
                  <span className="text-green-500">+</span>
                  <span>{rule}</span>
                  {!isLocked && (
                    <button
                      onClick={() =>
                        updateBrief({
                          rules: {
                            must: localBrief.rules!.must.filter((_, i) => i !== idx),
                            mustNot: localBrief.rules!.mustNot,
                          },
                        })
                      }
                      className="ml-auto text-white/40 hover:text-red-400"
                    >
                      x
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Must avoid */}
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <label className="text-sm font-medium text-red-400 mb-2 block">
              Must Avoid
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newMustNotRule}
                onChange={(e) => setNewMustNotRule(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addMustNotRule()}
                placeholder="e.g., big room drops"
                disabled={isLocked}
                className="flex-1 rounded-lg bg-black/30 px-3 py-2 text-sm text-white placeholder-white/40 border border-white/10 focus:border-red-500 focus:outline-none disabled:opacity-50"
              />
              <button
                onClick={addMustNotRule}
                disabled={isLocked || !newMustNotRule.trim()}
                className="px-3 py-2 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>
            <div className="space-y-1">
              {localBrief.rules?.mustNot.map((rule, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-red-300">
                  <span className="text-red-500">-</span>
                  <span>{rule}</span>
                  {!isLocked && (
                    <button
                      onClick={() =>
                        updateBrief({
                          rules: {
                            must: localBrief.rules!.must,
                            mustNot: localBrief.rules!.mustNot.filter((_, i) => i !== idx),
                          },
                        })
                      }
                      className="ml-auto text-white/40 hover:text-red-400"
                    >
                      x
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Generated Spec Preview */}
        {spec && (
          <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
            <h3 className="text-sm font-medium text-violet-400 mb-3">Generated Production Spec</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <DataCard
                title="Tempo Range"
                value={`${spec.tempoRange.min}-${spec.tempoRange.max} BPM`}
                color="#8b5cf6"
              />
              <DataCard
                title="Sections"
                value={`${spec.structuralConstraints.minSections}-${spec.structuralConstraints.maxSections}`}
                color="#8b5cf6"
              />
              <DataCard
                title="Instrumentation"
                value={spec.instrumentation.length}
                subtitle={spec.instrumentation.slice(0, 2).join(", ")}
                color="#8b5cf6"
              />
              <DataCard
                title="Mix Aesthetic"
                value={spec.mixAesthetic}
                color="#8b5cf6"
              />
            </div>
          </div>
        )}
      </div>
    </StagePanel>
  );
}
