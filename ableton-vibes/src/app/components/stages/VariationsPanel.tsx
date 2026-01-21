"use client";

import { useState } from "react";
import { StagePanel } from "../workflow/StagePanel";
import { QuickActionBar } from "../shared";
import { ArrangementTimeline } from "../visualizations";
import { VariationPass, EarCandy, ArrangementSection } from "../types";

const VARIATION_OPERATORS = [
  { id: "transpose", label: "Transpose", description: "Shift pitch up/down" },
  { id: "invert", label: "Invert", description: "Flip melodic direction" },
  { id: "retrograde", label: "Retrograde", description: "Reverse in time" },
  { id: "augment", label: "Augment", description: "Stretch duration" },
  { id: "diminish", label: "Diminish", description: "Compress duration" },
  { id: "ornament", label: "Ornament", description: "Add decorations" },
  { id: "simplify", label: "Simplify", description: "Reduce complexity" },
];

const EAR_CANDY_TYPES = [
  { type: "riser", label: "Riser", color: "#22c55e" },
  { type: "downlifter", label: "Downlifter", color: "#3b82f6" },
  { type: "impact", label: "Impact", color: "#ef4444" },
  { type: "sweep", label: "Sweep", color: "#06b6d4" },
  { type: "stutter", label: "Stutter", color: "#f97316" },
  { type: "vocal-chop", label: "Vocal Chop", color: "#ec4899" },
  { type: "reverse", label: "Reverse", color: "#8b5cf6" },
  { type: "white-noise", label: "White Noise", color: "#94a3b8" },
];

type VariationsPanelProps = {
  variationPasses?: VariationPass[];
  sections?: ArrangementSection[];
  totalBars?: number;
  isLocked?: boolean;
  onGenerateVariations?: () => void;
  onAddEarCandy?: (type: string, position: number) => void;
  onRemoveEarCandy?: (candyId: string) => void;
  onLock?: () => void;
};

export function VariationsPanel({
  variationPasses = [],
  sections = [],
  totalBars = 128,
  isLocked = false,
  onGenerateVariations,
  onAddEarCandy,
  onRemoveEarCandy,
  onLock,
}: VariationsPanelProps) {
  const [selectedPassIndex, setSelectedPassIndex] = useState<number>(0);
  const [showEarCandyPicker, setShowEarCandyPicker] = useState(false);

  const currentPass = variationPasses[selectedPassIndex];
  const allEarCandy = variationPasses.flatMap((p) => p.earCandy);

  return (
    <StagePanel
      stage="variationOperators"
      subtitle="Add variations and ear candy for interest"
      isLocked={isLocked}
      actions={
        <QuickActionBar
          actions={[
            {
              label: "Generate Variations",
              onClick: onGenerateVariations || (() => {}),
              variant: "secondary",
              icon: (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ),
            },
            {
              label: "Add FX",
              onClick: () => setShowEarCandyPicker(!showEarCandyPicker),
              variant: "secondary",
              disabled: isLocked,
            },
            {
              label: isLocked ? "Unlock" : "Lock Variations",
              onClick: onLock || (() => {}),
              variant: "primary",
            },
          ]}
        />
      }
    >
      <div className="space-y-6">
        {/* Pass selector */}
        {variationPasses.length > 1 && (
          <div className="flex gap-2">
            {variationPasses.map((pass, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedPassIndex(idx)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${selectedPassIndex === idx ? "bg-purple-500 text-white" : "bg-white/10 text-white/60 hover:bg-white/20"}
                `}
              >
                Pass {pass.passNumber}
              </button>
            ))}
          </div>
        )}

        {/* Timeline with ear candy */}
        {(sections.length > 0 || allEarCandy.length > 0) && (
          <div>
            <label className="text-sm font-medium text-white/80 mb-2 block">
              FX & Transitions Timeline
            </label>
            <ArrangementTimeline
              sections={sections}
              totalBars={totalBars}
              earCandy={allEarCandy}
            />
          </div>
        )}

        {/* Ear candy picker */}
        {showEarCandyPicker && !isLocked && (
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
            <label className="text-sm font-medium text-purple-400 mb-3 block">
              Add Ear Candy
            </label>
            <div className="grid grid-cols-4 gap-2">
              {EAR_CANDY_TYPES.map((candy) => (
                <button
                  key={candy.type}
                  onClick={() => {
                    // Default to bar 0, user would pick position in real implementation
                    onAddEarCandy?.(candy.type, 0);
                    setShowEarCandyPicker(false);
                  }}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: candy.color }}
                  />
                  <span className="text-xs text-white/80">{candy.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Current pass variations */}
        {currentPass?.variations && currentPass.variations.length > 0 && (
          <div>
            <label className="text-sm font-medium text-white/80 mb-3 block">
              Applied Variations ({currentPass.variations.length})
            </label>
            <div className="space-y-2">
              {currentPass.variations.map((variation) => (
                <div
                  key={variation.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-purple-500/20 px-2 py-1 text-xs text-purple-400 font-medium">
                      {variation.operator}
                    </div>
                    <div>
                      <div className="text-sm text-white">{variation.result.name}</div>
                      <div className="text-xs text-white/50">
                        From: {variation.sourceId}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <span className="text-white/50">Coherence: </span>
                      <span className="text-white font-medium">{variation.coherenceScore}</span>
                    </div>
                    <div
                      className={`${
                        variation.improvementDelta > 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {variation.improvementDelta > 0 ? "+" : ""}
                      {variation.improvementDelta}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ear candy list */}
        {currentPass?.earCandy && currentPass.earCandy.length > 0 && (
          <div>
            <label className="text-sm font-medium text-white/80 mb-3 block">
              Ear Candy ({currentPass.earCandy.length})
            </label>
            <div className="flex flex-wrap gap-2">
              {currentPass.earCandy.map((candy) => {
                const typeInfo = EAR_CANDY_TYPES.find((t) => t.type === candy.type);
                return (
                  <div
                    key={candy.id}
                    className="flex items-center gap-2 rounded-lg px-3 py-1.5"
                    style={{ backgroundColor: `${typeInfo?.color}20` }}
                  >
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: typeInfo?.color }}
                    />
                    <span className="text-sm" style={{ color: typeInfo?.color }}>
                      {typeInfo?.label}
                    </span>
                    <span className="text-xs text-white/40">
                      Bar {candy.position} ({candy.duration}b)
                    </span>
                    {!isLocked && (
                      <button
                        onClick={() => onRemoveEarCandy?.(candy.id)}
                        className="ml-1 text-white/40 hover:text-red-400"
                      >
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Transition enhancements */}
        {currentPass?.transitionEnhancements && currentPass.transitionEnhancements.length > 0 && (
          <div>
            <label className="text-sm font-medium text-white/80 mb-3 block">
              Transition Enhancements
            </label>
            <div className="space-y-2">
              {currentPass.transitionEnhancements.map((enhancement, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">
                      Bar {enhancement.bar}
                    </span>
                    {enhancement.fillPattern && (
                      <span className="text-xs text-white/50">
                        Fill: {enhancement.fillPattern.name}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {enhancement.earCandy.map((candy) => {
                      const typeInfo = EAR_CANDY_TYPES.find((t) => t.type === candy.type);
                      return (
                        <span
                          key={candy.id}
                          className="text-xs rounded px-2 py-0.5"
                          style={{
                            backgroundColor: `${typeInfo?.color}20`,
                            color: typeInfo?.color,
                          }}
                        >
                          {typeInfo?.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {variationPasses.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4">
              <svg className="h-8 w-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Add variations</h3>
            <p className="text-sm text-white/60 mb-4">
              Create variations and add ear candy to keep your track interesting.
            </p>
            <button
              onClick={onGenerateVariations}
              className="px-4 py-2 rounded-lg bg-purple-500 text-white font-medium hover:bg-purple-400 transition-colors"
            >
              Generate Variations
            </button>
          </div>
        )}

        {/* Variation operators reference */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <label className="text-sm font-medium text-white/60 mb-3 block">
            Available Variation Operators
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {VARIATION_OPERATORS.map((op) => (
              <div
                key={op.id}
                className="rounded-lg bg-white/5 p-2 text-center"
              >
                <div className="text-sm font-medium text-white">{op.label}</div>
                <div className="text-xs text-white/40">{op.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </StagePanel>
  );
}
