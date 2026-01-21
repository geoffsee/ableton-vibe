"use client";

import { useState } from "react";
import { StagePanel } from "../workflow/StagePanel";
import { QuickActionBar } from "../shared";
import { TagList, DataCard } from "../shared";
import { StylePrior } from "../types";

const SOUND_DESIGN_TRAITS = [
  "Analog", "Digital", "Warm", "Cold", "Gritty", "Clean",
  "Lo-fi", "Hi-fi", "Saturated", "Raw", "Polished", "Organic",
  "Synthetic", "Textured", "Sparse", "Dense", "Punchy", "Soft",
];

const TRANSITION_STYLES = [
  "Filter sweep", "Riser", "Reverse cymbal", "Fill",
  "Breakdown", "Cut", "Automation", "FX wash",
];

const ENERGY_PROFILES = [
  { value: "low-steady", label: "Low & Steady", description: "Ambient, background" },
  { value: "building", label: "Building", description: "Gradual energy increase" },
  { value: "peaks-valleys", label: "Peaks & Valleys", description: "Dynamic, contrasting" },
  { value: "high-energy", label: "High Energy", description: "Consistent intensity" },
  { value: "rollercoaster", label: "Rollercoaster", description: "Dramatic changes" },
];

const CLICHE_OPTIONS = [
  "Generic supersaws", "Overused drops", "Stock risers",
  "Cliche fills", "Predictable structures", "Basic 4-on-floor",
  "Obvious samples", "Tired vocal chops",
];

type StylePriorPanelProps = {
  stylePrior?: StylePrior;
  isLocked?: boolean;
  onStylePriorChange?: (prior: StylePrior) => void;
  onGenerate?: () => void;
  onLock?: () => void;
};

export function StylePriorPanel({
  stylePrior,
  isLocked = false,
  onStylePriorChange,
  onGenerate,
  onLock,
}: StylePriorPanelProps) {
  const [localPrior, setLocalPrior] = useState<StylePrior>(
    stylePrior || {
      bpmSignature: { typical: 120, variance: 10 },
      swingProfile: { amount: 0, subdivision: "16th" },
      soundDesignTraits: [],
      arrangementNorms: {
        typicalIntroLength: 8,
        typicalDropLength: 32,
        typicalBreakdownLength: 16,
        transitionStyle: [],
      },
      guardrails: {
        energyProfile: "building",
        avoidCliches: [],
      },
    }
  );

  const updatePrior = (updates: Partial<StylePrior>) => {
    const updated = { ...localPrior, ...updates };
    setLocalPrior(updated);
    onStylePriorChange?.(updated);
  };

  const toggleTrait = (trait: string) => {
    const traits = localPrior.soundDesignTraits.includes(trait)
      ? localPrior.soundDesignTraits.filter((t) => t !== trait)
      : [...localPrior.soundDesignTraits, trait];
    updatePrior({ soundDesignTraits: traits });
  };

  const toggleTransitionStyle = (style: string) => {
    const styles = localPrior.arrangementNorms.transitionStyle.includes(style)
      ? localPrior.arrangementNorms.transitionStyle.filter((s) => s !== style)
      : [...localPrior.arrangementNorms.transitionStyle, style];
    updatePrior({
      arrangementNorms: { ...localPrior.arrangementNorms, transitionStyle: styles },
    });
  };

  const toggleCliche = (cliche: string) => {
    const cliches = localPrior.guardrails.avoidCliches.includes(cliche)
      ? localPrior.guardrails.avoidCliches.filter((c) => c !== cliche)
      : [...localPrior.guardrails.avoidCliches, cliche];
    updatePrior({
      guardrails: { ...localPrior.guardrails, avoidCliches: cliches },
    });
  };

  return (
    <StagePanel
      stage="stylePrior"
      subtitle="Define the sonic character and production style"
      isLocked={isLocked}
      actions={
        <QuickActionBar
          actions={[
            {
              label: "Generate from Brief",
              onClick: onGenerate || (() => {}),
              variant: "secondary",
            },
            {
              label: isLocked ? "Unlock" : "Lock Style",
              onClick: onLock || (() => {}),
              variant: "primary",
            },
          ]}
        />
      }
    >
      <div className="space-y-6">
        {/* BPM Signature */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <label className="text-sm font-medium text-white/80 mb-3 block">
              Typical BPM: {localPrior.bpmSignature.typical}
            </label>
            <input
              type="range"
              min={60}
              max={180}
              value={localPrior.bpmSignature.typical}
              onChange={(e) =>
                updatePrior({
                  bpmSignature: {
                    ...localPrior.bpmSignature,
                    typical: parseInt(e.target.value),
                  },
                })
              }
              disabled={isLocked}
              className="w-full accent-orange-500 disabled:opacity-50"
            />
            <div className="flex justify-between text-xs text-white/40 mt-1">
              <span>60</span>
              <span>120</span>
              <span>180</span>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <label className="text-sm font-medium text-white/80 mb-3 block">
              BPM Variance: ±{localPrior.bpmSignature.variance}
            </label>
            <input
              type="range"
              min={0}
              max={30}
              value={localPrior.bpmSignature.variance}
              onChange={(e) =>
                updatePrior({
                  bpmSignature: {
                    ...localPrior.bpmSignature,
                    variance: parseInt(e.target.value),
                  },
                })
              }
              disabled={isLocked}
              className="w-full accent-orange-500 disabled:opacity-50"
            />
            <div className="flex justify-between text-xs text-white/40 mt-1">
              <span>None</span>
              <span>±15</span>
              <span>±30</span>
            </div>
          </div>
        </div>

        {/* Swing Profile */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-white/80">
              Swing: {localPrior.swingProfile.amount}%
            </label>
            <div className="flex gap-2">
              {(["8th", "16th"] as const).map((sub) => (
                <button
                  key={sub}
                  onClick={() =>
                    updatePrior({
                      swingProfile: { ...localPrior.swingProfile, subdivision: sub },
                    })
                  }
                  disabled={isLocked}
                  className={`
                    px-3 py-1 rounded-lg text-xs font-medium transition-colors
                    ${
                      localPrior.swingProfile.subdivision === sub
                        ? "bg-orange-500 text-white"
                        : "bg-white/10 text-white/60 hover:bg-white/20"
                    }
                    ${isLocked ? "opacity-50 cursor-not-allowed" : ""}
                  `}
                >
                  {sub} notes
                </button>
              ))}
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={localPrior.swingProfile.amount}
            onChange={(e) =>
              updatePrior({
                swingProfile: {
                  ...localPrior.swingProfile,
                  amount: parseInt(e.target.value),
                },
              })
            }
            disabled={isLocked}
            className="w-full accent-orange-500 disabled:opacity-50"
          />
          <div className="flex justify-between text-xs text-white/40 mt-1">
            <span>None</span>
            <span>50% (Light)</span>
            <span>100% (Heavy)</span>
          </div>
        </div>

        {/* Sound Design Traits */}
        <div>
          <label className="text-sm font-medium text-white/80 mb-2 block">
            Sound Design Traits
          </label>
          <div className="flex flex-wrap gap-2">
            {SOUND_DESIGN_TRAITS.map((trait) => (
              <button
                key={trait}
                onClick={() => toggleTrait(trait)}
                disabled={isLocked}
                className={`
                  px-3 py-1.5 rounded-full text-sm transition-all duration-200
                  ${
                    localPrior.soundDesignTraits.includes(trait)
                      ? "bg-orange-500 text-white"
                      : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
                  }
                  ${isLocked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                {trait}
              </button>
            ))}
          </div>
        </div>

        {/* Arrangement Norms */}
        <div>
          <label className="text-sm font-medium text-white/80 mb-3 block">
            Typical Section Lengths (bars)
          </label>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
              <span className="text-xs text-white/50 block">Intro</span>
              <input
                type="number"
                min={4}
                max={32}
                value={localPrior.arrangementNorms.typicalIntroLength}
                onChange={(e) =>
                  updatePrior({
                    arrangementNorms: {
                      ...localPrior.arrangementNorms,
                      typicalIntroLength: parseInt(e.target.value),
                    },
                  })
                }
                disabled={isLocked}
                className="w-16 bg-transparent text-center text-lg font-bold text-white border-none focus:outline-none disabled:opacity-50"
              />
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
              <span className="text-xs text-white/50 block">Drop/Main</span>
              <input
                type="number"
                min={8}
                max={64}
                value={localPrior.arrangementNorms.typicalDropLength}
                onChange={(e) =>
                  updatePrior({
                    arrangementNorms: {
                      ...localPrior.arrangementNorms,
                      typicalDropLength: parseInt(e.target.value),
                    },
                  })
                }
                disabled={isLocked}
                className="w-16 bg-transparent text-center text-lg font-bold text-white border-none focus:outline-none disabled:opacity-50"
              />
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
              <span className="text-xs text-white/50 block">Breakdown</span>
              <input
                type="number"
                min={4}
                max={32}
                value={localPrior.arrangementNorms.typicalBreakdownLength}
                onChange={(e) =>
                  updatePrior({
                    arrangementNorms: {
                      ...localPrior.arrangementNorms,
                      typicalBreakdownLength: parseInt(e.target.value),
                    },
                  })
                }
                disabled={isLocked}
                className="w-16 bg-transparent text-center text-lg font-bold text-white border-none focus:outline-none disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Transition Styles */}
        <div>
          <label className="text-sm font-medium text-white/80 mb-2 block">
            Preferred Transition Styles
          </label>
          <div className="flex flex-wrap gap-2">
            {TRANSITION_STYLES.map((style) => (
              <button
                key={style}
                onClick={() => toggleTransitionStyle(style)}
                disabled={isLocked}
                className={`
                  px-3 py-1.5 rounded-full text-sm transition-all duration-200
                  ${
                    localPrior.arrangementNorms.transitionStyle.includes(style)
                      ? "bg-yellow-500 text-black"
                      : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
                  }
                  ${isLocked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        {/* Energy Profile */}
        <div>
          <label className="text-sm font-medium text-white/80 mb-2 block">
            Energy Profile
          </label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {ENERGY_PROFILES.map((profile) => (
              <button
                key={profile.value}
                onClick={() =>
                  updatePrior({
                    guardrails: {
                      ...localPrior.guardrails,
                      energyProfile: profile.value,
                    },
                  })
                }
                disabled={isLocked}
                className={`
                  px-3 py-2 rounded-lg text-left transition-all duration-200
                  ${
                    localPrior.guardrails.energyProfile === profile.value
                      ? "bg-green-500 text-white"
                      : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
                  }
                  ${isLocked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                <span className="text-sm font-medium block">{profile.label}</span>
                <span className="text-xs opacity-70">{profile.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Cliches to Avoid */}
        <div>
          <label className="text-sm font-medium text-white/80 mb-2 block">
            Cliches to Avoid
          </label>
          <div className="flex flex-wrap gap-2">
            {CLICHE_OPTIONS.map((cliche) => (
              <button
                key={cliche}
                onClick={() => toggleCliche(cliche)}
                disabled={isLocked}
                className={`
                  px-3 py-1.5 rounded-full text-sm transition-all duration-200
                  ${
                    localPrior.guardrails.avoidCliches.includes(cliche)
                      ? "bg-red-500/80 text-white line-through"
                      : "bg-white/10 text-white/60 hover:bg-red-500/30 hover:text-red-300"
                  }
                  ${isLocked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                {cliche}
              </button>
            ))}
          </div>
        </div>
      </div>
    </StagePanel>
  );
}
