"use client";

import { useState } from "react";
import { StagePanel } from "../workflow/StagePanel";
import { QuickActionBar } from "../shared";
import { MixDesign, TrackLevel } from "../types";

const STEM_GROUPS = [
  { group: "drums", label: "Drums", color: "#f97316" },
  { group: "bass", label: "Bass", color: "#ef4444" },
  { group: "synths", label: "Synths", color: "#8b5cf6" },
  { group: "pads", label: "Pads", color: "#06b6d4" },
  { group: "fx", label: "FX", color: "#22c55e" },
  { group: "vocals", label: "Vocals", color: "#ec4899" },
] as const;

type MixDesignPanelProps = {
  mixDesign?: MixDesign;
  isLocked?: boolean;
  onGenerateMix?: () => void;
  onUpdateLevel?: (trackName: string, level: Partial<TrackLevel>) => void;
  onLock?: () => void;
};

export function MixDesignPanel({
  mixDesign,
  isLocked = false,
  onGenerateMix,
  onUpdateLevel,
  onLock,
}: MixDesignPanelProps) {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showAutomation, setShowAutomation] = useState(false);

  const tracks = mixDesign?.leveling?.tracks || [];
  const eqCompSuggestions = mixDesign?.eqCompSuggestions || [];
  const spatialScene = mixDesign?.spatialScene;
  const masterChain = mixDesign?.masterChain || [];
  const automationPasses = mixDesign?.automationPasses || [];

  const getTracksByGroup = (group: string) =>
    tracks.filter((t) => t.stemGroup === group);

  const getGroupColor = (group: string) =>
    STEM_GROUPS.find((g) => g.group === group)?.color || "#8b5cf6";

  return (
    <StagePanel
      stage="mixSpatial"
      subtitle="Design levels, spatial positioning, and master chain"
      isLocked={isLocked}
      actions={
        <QuickActionBar
          actions={[
            {
              label: "Generate Mix",
              onClick: onGenerateMix || (() => {}),
              variant: "secondary",
              icon: (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              ),
            },
            {
              label: showAutomation ? "Hide Automation" : "Show Automation",
              onClick: () => setShowAutomation(!showAutomation),
              variant: "secondary",
            },
            {
              label: isLocked ? "Unlock" : "Lock Mix",
              onClick: onLock || (() => {}),
              variant: "primary",
            },
          ]}
        />
      }
    >
      <div className="space-y-6">
        {/* Leveling meters by stem group */}
        {tracks.length > 0 && (
          <div>
            <label className="text-sm font-medium text-white/80 mb-3 block">
              Track Levels & Pan
            </label>
            <div className="space-y-4">
              {STEM_GROUPS.map((group) => {
                const groupTracks = getTracksByGroup(group.group);
                if (groupTracks.length === 0) return null;

                return (
                  <div key={group.group} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: group.color }}
                      />
                      <span className="text-sm font-medium text-white">{group.label}</span>
                      <span className="text-xs text-white/40">({groupTracks.length} tracks)</span>
                    </div>

                    <div className="space-y-2">
                      {groupTracks.map((track) => (
                        <div key={track.trackName} className="flex items-center gap-4">
                          {/* Track name */}
                          <div className="w-24 text-xs text-white/60 truncate">
                            {track.trackName}
                          </div>

                          {/* Level meter */}
                          <div className="flex-1 flex items-center gap-2">
                            <span className="text-xs text-white/40 w-10">
                              {track.targetDb > 0 ? "+" : ""}{track.targetDb}dB
                            </span>
                            <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min(100, Math.max(0, (track.targetDb + 60) / 0.6))}%`,
                                  backgroundColor: group.color,
                                }}
                              />
                            </div>
                          </div>

                          {/* Pan */}
                          <div className="flex items-center gap-1 w-20">
                            <span className="text-xs text-white/40">
                              {track.pan === 0 ? "C" : track.pan > 0 ? `R${track.pan}` : `L${Math.abs(track.pan)}`}
                            </span>
                            <div className="flex-1 h-1 rounded-full bg-white/10 relative">
                              <div
                                className="absolute top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-white"
                                style={{ left: `${50 + track.pan / 2}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stereo field visualization */}
        {tracks.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <label className="text-sm font-medium text-white/80 mb-3 block">
              Stereo Field
            </label>
            <div className="relative h-32 rounded-lg bg-black/40">
              {/* Grid lines */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-full w-px bg-white/10" />
              </div>
              <div className="absolute inset-0 flex items-center">
                <div className="w-full h-px bg-white/10" />
              </div>

              {/* Labels */}
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-white/40">L</span>
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-white/40">R</span>
              <span className="absolute top-2 left-1/2 -translate-x-1/2 text-xs text-white/40">Front</span>
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-white/40">Back</span>

              {/* Track positions */}
              {tracks.map((track, idx) => {
                const x = 50 + track.pan / 2;
                // Simulate depth based on level (louder = more front)
                const y = 50 - (track.targetDb + 12) * 2;
                const color = getGroupColor(track.stemGroup);

                return (
                  <div
                    key={track.trackName}
                    className="absolute h-3 w-3 rounded-full -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-150 transition-transform"
                    style={{
                      left: `${x}%`,
                      top: `${Math.min(90, Math.max(10, y))}%`,
                      backgroundColor: color,
                    }}
                    title={`${track.trackName} (${track.targetDb}dB, ${track.pan > 0 ? "R" : track.pan < 0 ? "L" : "C"}${Math.abs(track.pan)})`}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Spatial scene */}
        {spatialScene && (
          <div className="grid md:grid-cols-2 gap-4">
            {/* Depth layers (reverbs) */}
            {spatialScene.depthLayers.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <label className="text-sm font-medium text-white/80 mb-3 block">
                  Reverb Layers
                </label>
                <div className="space-y-2">
                  {spatialScene.depthLayers.map((layer, idx) => (
                    <div key={idx} className="rounded-lg bg-white/5 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-white">{layer.name}</span>
                        <span className="text-xs text-white/50 capitalize">{layer.reverbType}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-white/40">
                        <span>Decay: {layer.decayTime}s</span>
                        <span>Pre: {layer.predelay}ms</span>
                        <span>Wet: {layer.wetLevel}%</span>
                      </div>
                      <div className="mt-2 text-xs text-white/50">
                        {layer.assignedTracks.join(", ")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Delays */}
            {spatialScene.delays.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <label className="text-sm font-medium text-white/80 mb-3 block">
                  Delays
                </label>
                <div className="space-y-2">
                  {spatialScene.delays.map((delay, idx) => (
                    <div key={idx} className="rounded-lg bg-white/5 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-white">{delay.name}</span>
                        <span className="text-xs text-white/50 capitalize">{delay.type}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-white/40">
                        <span>Time: {delay.time}</span>
                        <span>Feedback: {delay.feedback}%</span>
                      </div>
                      <div className="mt-2 text-xs text-white/50">
                        {delay.assignedTracks.join(", ")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Master chain */}
        {masterChain.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <label className="text-sm font-medium text-white/80 mb-3 block">
              Master Chain
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {masterChain
                .sort((a, b) => a.order - b.order)
                .map((device, idx) => (
                  <div
                    key={idx}
                    className="flex-shrink-0 rounded-lg bg-white/10 p-3 min-w-[120px]"
                  >
                    <div className="text-xs text-white/40 mb-1">#{device.order}</div>
                    <div className="text-sm font-medium text-white">{device.device}</div>
                    <div className="text-xs text-white/50 mt-1">{device.purpose}</div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Automation passes */}
        {showAutomation && automationPasses.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <label className="text-sm font-medium text-white/80 mb-3 block">
              Automation ({automationPasses.length} passes)
            </label>
            <div className="space-y-2">
              {automationPasses.map((pass, idx) => (
                <div key={idx} className="rounded-lg bg-white/5 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white">
                      {pass.trackName}: {pass.parameter}
                    </span>
                    <span className="text-xs text-white/50">
                      {pass.keyframes.length} keyframes
                    </span>
                  </div>
                  <div className="text-xs text-white/40">{pass.purpose}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EQ/Comp suggestions */}
        {eqCompSuggestions.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <label className="text-sm font-medium text-white/80 mb-3 block">
              EQ & Compression Suggestions
            </label>
            <div className="grid md:grid-cols-2 gap-3">
              {eqCompSuggestions.map((suggestion, idx) => {
                const color = getGroupColor(suggestion.stemGroup);
                return (
                  <div key={idx} className="rounded-lg bg-white/5 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-sm font-medium text-white capitalize">
                        {suggestion.stemGroup}
                      </span>
                    </div>
                    <div className="text-xs text-white/50 space-y-1">
                      <div>EQ: {suggestion.eq.length} bands</div>
                      <div>
                        Comp: {suggestion.compression.ratio}:1, {suggestion.compression.threshold}dB
                      </div>
                      {suggestion.saturation && (
                        <div>Sat: Drive {suggestion.saturation.drive}%</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {tracks.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4">
              <svg className="h-8 w-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Design your mix</h3>
            <p className="text-sm text-white/60 mb-4">
              Generate levels, panning, spatial effects, and master chain.
            </p>
            <button
              onClick={onGenerateMix}
              className="px-4 py-2 rounded-lg bg-rose-500 text-white font-medium hover:bg-rose-400 transition-colors"
            >
              Generate Mix Design
            </button>
          </div>
        )}
      </div>
    </StagePanel>
  );
}
