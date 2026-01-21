"use client";

import { useCoAgent, useCopilotAction } from "@copilotkit/react-core";
import { CopilotKitCSSProperties, CopilotSidebar } from "@copilotkit/react-ui";
import { useMemo, useState } from "react";

// Types
import {
  WorkflowStage,
  WorkflowUIState,
  AbletonProjectState,
  AbletonAgentState,
  ProductionBrief,
  ProductionSpec,
  StylePrior,
  GrooveCandidate,
  GrooveScore,
  TimeBase,
  SoundPalette,
  MotifSeedSet,
  MacroStructure,
  ArrangementSection,
  SectionComposition,
  VariationPass,
  MixDesign,
  AbletonTrack,
  MaxPatchIdea,
  WORKFLOW_STAGES,
  STAGE_CONFIG,
} from "./components/types";

// Components
import { WorkflowStepper } from "./components/workflow";
import {
  BriefWizard,
  StylePriorPanel,
  TimeBasePanel,
  PalettePanel,
  MotifSeedsPanel,
  MacroStructurePanel,
  ComposePanel,
  VariationsPanel,
  MixDesignPanel,
} from "./components/stages";

// Default states
const defaultProject: AbletonProjectState = {
  projectName: "New Production",
  genre: "",
  vibe: "",
  tempo: 120,
  key: "C major",
  timeSignature: "4/4",
  arrangementNotes: "",
  sessionViewNotes: "",
  nextActions: [],
  maxPatchIdeas: [],
  tracks: [],
};

const defaultWorkflow: WorkflowUIState = {
  currentStage: "briefIngestion",
  stagesCompleted: [],
};

export default function CopilotKitPage() {
  const [themeColor, setThemeColor] = useState("#7c3aed");

  useCopilotAction({
    name: "setThemeColor",
    description: "Set the accent color for the Ableton workspace overview.",
    parameters: [
      {
        name: "themeColor",
        description: "A HEX color to use as the primary accent.",
        required: true,
      },
    ],
    handler({ themeColor }) {
      setThemeColor(themeColor);
    },
  });

  return (
    <main
      style={{ "--copilot-kit-primary-color": themeColor } as CopilotKitCSSProperties}
      className="min-h-screen bg-slate-950"
    >
      <AbletonWorkflowBuilder themeColor={themeColor} />
      <CopilotSidebar
        clickOutsideToClose={false}
        defaultOpen
        labels={{
          title: "Ableton Live Copilot",
          initial:
            "Hi producer! I'm ready to help you create music from scratch.\n\nFollow the 9-stage workflow to build your track:\n1. Brief & Intent - Define your vision\n2. Style Prior - Set sonic character\n3. Time Base - Establish groove\n4. Palette - Curate sounds\n5. Motifs - Generate ideas\n6. Structure - Design arrangement\n7. Compose - Orchestrate sections\n8. Variations - Add ear candy\n9. Mix - Design the final sound\n\nTell me about the music you want to create!",
        }}
      />
    </main>
  );
}

function AbletonWorkflowBuilder({ themeColor }: { themeColor: string }) {
  const { state, setState } = useCoAgent<AbletonAgentState>({
    name: "starterAgent",
    initialState: {
      project: defaultProject,
      workflow: defaultWorkflow,
    },
  });

  const project = useMemo(() => state.project ?? defaultProject, [state.project]);
  const workflow = useMemo(() => state.workflow ?? defaultWorkflow, [state.workflow]);

  // Safe JSON parser helper
  const safeJsonParse = <T,>(value: unknown): T | null => {
    if (typeof value !== "string") return null;
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.warn("Unable to parse JSON payload from assistant action.", error);
      return null;
    }
  };

  // Update helpers
  const updateProject = (updates: Partial<AbletonProjectState>) => {
    setState({
      ...state,
      project: { ...project, ...updates },
    });
  };

  const updateWorkflow = (updates: Partial<WorkflowUIState>) => {
    setState({
      ...state,
      workflow: { ...workflow, ...updates },
    });
  };

  const setCurrentStage = (stage: WorkflowStage) => {
    updateWorkflow({ currentStage: stage });
  };

  const markStageComplete = (stage: WorkflowStage) => {
    const completed = workflow.stagesCompleted.includes(stage)
      ? workflow.stagesCompleted
      : [...workflow.stagesCompleted, stage];

    // Auto-advance to next stage
    const currentIndex = WORKFLOW_STAGES.indexOf(stage);
    const nextStage = WORKFLOW_STAGES[currentIndex + 1];

    updateWorkflow({
      stagesCompleted: completed,
      currentStage: nextStage || stage,
    });
  };

  // === CopilotKit Actions for Workflow ===

  useCopilotAction({
    name: "setWorkflowStage",
    description: "Navigate to a specific workflow stage",
    parameters: [
      { name: "stage", description: "The workflow stage to navigate to", required: true },
    ],
    handler: ({ stage }) => {
      if (WORKFLOW_STAGES.includes(stage as WorkflowStage)) {
        setCurrentStage(stage as WorkflowStage);
      }
    },
  });

  useCopilotAction({
    name: "updateBrief",
    description: "Update the production brief (stage 1)",
    parameters: [
      { name: "briefJson", description: "JSON string of ProductionBrief", required: true },
    ],
    handler: ({ briefJson }) => {
      const brief = safeJsonParse<ProductionBrief>(briefJson);
      if (brief) updateWorkflow({ brief });
    },
  });

  useCopilotAction({
    name: "setProductionSpec",
    description: "Set the production spec derived from brief",
    parameters: [
      { name: "specJson", description: "JSON string of ProductionSpec", required: true },
    ],
    handler: ({ specJson }) => {
      const spec = safeJsonParse<ProductionSpec>(specJson);
      if (spec) updateWorkflow({ spec });
    },
  });

  useCopilotAction({
    name: "setStylePrior",
    description: "Set the style prior (stage 2)",
    parameters: [
      { name: "priorJson", description: "JSON string of StylePrior", required: true },
    ],
    handler: ({ priorJson }) => {
      const stylePrior = safeJsonParse<StylePrior>(priorJson);
      if (stylePrior) updateWorkflow({ stylePrior });
    },
  });

  useCopilotAction({
    name: "setGrooveCandidates",
    description: "Set groove candidates for stage 3",
    parameters: [
      { name: "candidatesJson", description: "JSON array of GrooveCandidate", required: true },
    ],
    handler: ({ candidatesJson }) => {
      const candidates = safeJsonParse<GrooveCandidate[]>(candidatesJson);
      if (candidates) updateWorkflow({ grooveCandidates: candidates });
    },
  });

  useCopilotAction({
    name: "setGrooveScores",
    description: "Set groove scores for candidates",
    parameters: [
      { name: "scoresJson", description: "JSON array of GrooveScore", required: true },
    ],
    handler: ({ scoresJson }) => {
      const scores = safeJsonParse<GrooveScore[]>(scoresJson);
      if (scores) updateWorkflow({ grooveScores: scores });
    },
  });

  useCopilotAction({
    name: "selectTimeBase",
    description: "Lock in the selected time base (stage 3)",
    parameters: [
      { name: "timeBaseJson", description: "JSON string of TimeBase", required: true },
    ],
    handler: ({ timeBaseJson }) => {
      const timeBase = safeJsonParse<TimeBase>(timeBaseJson);
      if (timeBase) {
        updateWorkflow({ timeBase });
        updateProject({ tempo: timeBase.finalTempo, timeSignature: timeBase.finalMeter });
      }
    },
  });

  useCopilotAction({
    name: "setPalette",
    description: "Set the sound palette (stage 4)",
    parameters: [
      { name: "paletteJson", description: "JSON string of SoundPalette", required: true },
    ],
    handler: ({ paletteJson }) => {
      const palette = safeJsonParse<SoundPalette>(paletteJson);
      if (palette) updateWorkflow({ palette });
    },
  });

  useCopilotAction({
    name: "setMotifSeedSet",
    description: "Set the motif seed set (stage 5)",
    parameters: [
      { name: "motifSetJson", description: "JSON string of MotifSeedSet", required: true },
    ],
    handler: ({ motifSetJson }) => {
      const motifSeedSet = safeJsonParse<MotifSeedSet>(motifSetJson);
      if (motifSeedSet) updateWorkflow({ motifSeedSet });
    },
  });

  useCopilotAction({
    name: "setMacroStructure",
    description: "Set the macro structure (stage 6)",
    parameters: [
      { name: "structureJson", description: "JSON string of MacroStructure", required: true },
    ],
    handler: ({ structureJson }) => {
      const macroStructure = safeJsonParse<MacroStructure>(structureJson);
      if (macroStructure) updateWorkflow({ macroStructure });
    },
  });

  useCopilotAction({
    name: "setCompositions",
    description: "Set section compositions (stage 7)",
    parameters: [
      { name: "compositionsJson", description: "JSON array of SectionComposition", required: true },
    ],
    handler: ({ compositionsJson }) => {
      const compositions = safeJsonParse<SectionComposition[]>(compositionsJson);
      if (compositions) updateWorkflow({ compositions });
    },
  });

  useCopilotAction({
    name: "setVariationPasses",
    description: "Set variation passes (stage 8)",
    parameters: [
      { name: "passesJson", description: "JSON array of VariationPass", required: true },
    ],
    handler: ({ passesJson }) => {
      const variationPasses = safeJsonParse<VariationPass[]>(passesJson);
      if (variationPasses) updateWorkflow({ variationPasses });
    },
  });

  useCopilotAction({
    name: "setMixDesign",
    description: "Set the mix design (stage 9)",
    parameters: [
      { name: "mixJson", description: "JSON string of MixDesign", required: true },
    ],
    handler: ({ mixJson }) => {
      const mixDesign = safeJsonParse<MixDesign>(mixJson);
      if (mixDesign) updateWorkflow({ mixDesign });
    },
  });

  // Legacy actions for backward compatibility
  useCopilotAction({
    name: "setProjectOverview",
    description: "Update the Ableton project overview",
    parameters: [
      { name: "projectOverviewJson", description: "JSON with project fields", required: true },
    ],
    handler: ({ projectOverviewJson }) => {
      const parsed = safeJsonParse<Partial<AbletonProjectState>>(projectOverviewJson);
      if (parsed) updateProject(parsed);
    },
  });

  useCopilotAction({
    name: "upsertAbletonTrack",
    description: "Add or update an Ableton track",
    parameters: [
      { name: "trackJson", description: "JSON string of track data", required: true },
    ],
    handler: ({ trackJson }) => {
      const track = safeJsonParse<Partial<AbletonTrack> & { id: string }>(trackJson);
      if (!track?.id) return;

      const sanitizedTrack: AbletonTrack = {
        id: track.id,
        name: track.name ?? `Track ${track.id}`,
        type: track.type ?? "MIDI",
        color: track.color,
        role: track.role,
        notes: track.notes,
        devices: track.devices ?? [],
        clips: track.clips ?? [],
        maxPatch: track.maxPatch ?? null,
      };

      const existingIndex = project.tracks.findIndex((t) => t.id === sanitizedTrack.id);
      const nextTracks =
        existingIndex === -1
          ? [...project.tracks, sanitizedTrack]
          : project.tracks.map((t, i) => (i === existingIndex ? { ...t, ...sanitizedTrack } : t));

      updateProject({ tracks: nextTracks });
    },
  });

  useCopilotAction({
    name: "removeAbletonTrack",
    description: "Remove a track by ID",
    parameters: [
      { name: "trackId", description: "Track ID to remove", required: true },
    ],
    handler: ({ trackId }) => {
      updateProject({ tracks: project.tracks.filter((t) => t.id !== trackId) });
    },
  });

  useCopilotAction({
    name: "setMaxPatchIdeas",
    description: "Set Max for Live patch ideas",
    parameters: [
      { name: "maxPatchIdeasJson", description: "JSON array of patch ideas", required: true },
    ],
    handler: ({ maxPatchIdeasJson }) => {
      const patches = safeJsonParse<MaxPatchIdea[]>(maxPatchIdeasJson);
      if (patches) updateProject({ maxPatchIdeas: patches });
    },
  });

  useCopilotAction({
    name: "setNextActions",
    description: "Set next action items",
    parameters: [
      { name: "actionItemsJson", description: "JSON array of action strings", required: true },
    ],
    handler: ({ actionItemsJson }) => {
      const actions = safeJsonParse<string[]>(actionItemsJson);
      if (actions) updateProject({ nextActions: actions });
    },
  });

  // Render current stage panel
  const renderStagePanel = () => {
    switch (workflow.currentStage) {
      case "briefIngestion":
        return (
          <BriefWizard
            brief={workflow.brief}
            spec={workflow.spec}
            isLocked={workflow.stagesCompleted.includes("briefIngestion")}
            onBriefChange={(brief) => updateWorkflow({ brief })}
            onLockIntent={() => markStageComplete("briefIngestion")}
          />
        );
      case "stylePrior":
        return (
          <StylePriorPanel
            stylePrior={workflow.stylePrior}
            isLocked={workflow.stagesCompleted.includes("stylePrior")}
            onStylePriorChange={(stylePrior) => updateWorkflow({ stylePrior })}
            onLock={() => markStageComplete("stylePrior")}
          />
        );
      case "timeBase":
        return (
          <TimeBasePanel
            timeBase={workflow.timeBase}
            grooveCandidates={workflow.grooveCandidates}
            grooveScores={workflow.grooveScores}
            isLocked={workflow.stagesCompleted.includes("timeBase")}
            onSelectGroove={(groove) => {
              const timeBase: TimeBase = {
                finalTempo: groove.tempo,
                finalMeter: groove.meter,
                selectedGroove: groove,
                alternateGrooves: (workflow.grooveCandidates || []).filter(
                  (g) => g.id !== groove.id
                ),
              };
              updateWorkflow({ timeBase });
              updateProject({ tempo: groove.tempo, timeSignature: groove.meter });
            }}
            onLock={() => markStageComplete("timeBase")}
          />
        );
      case "palette":
        return (
          <PalettePanel
            palette={workflow.palette}
            isLocked={workflow.stagesCompleted.includes("palette")}
            onLock={() => markStageComplete("palette")}
          />
        );
      case "motifSeed":
        return (
          <MotifSeedsPanel
            motifSeedSet={workflow.motifSeedSet}
            isLocked={workflow.stagesCompleted.includes("motifSeed")}
            onLock={() => markStageComplete("motifSeed")}
          />
        );
      case "macroStructure":
        return (
          <MacroStructurePanel
            macroStructure={workflow.macroStructure}
            isLocked={workflow.stagesCompleted.includes("macroStructure")}
            onLock={() => markStageComplete("macroStructure")}
          />
        );
      case "composeOrchestrate":
        return (
          <ComposePanel
            compositions={workflow.compositions}
            sections={workflow.macroStructure?.sections}
            isLocked={workflow.stagesCompleted.includes("composeOrchestrate")}
            onLock={() => markStageComplete("composeOrchestrate")}
          />
        );
      case "variationOperators":
        return (
          <VariationsPanel
            variationPasses={workflow.variationPasses}
            sections={workflow.macroStructure?.sections}
            totalBars={workflow.macroStructure?.totalBars}
            isLocked={workflow.stagesCompleted.includes("variationOperators")}
            onLock={() => markStageComplete("variationOperators")}
          />
        );
      case "mixSpatial":
        return (
          <MixDesignPanel
            mixDesign={workflow.mixDesign}
            isLocked={workflow.stagesCompleted.includes("mixSpatial")}
            onLock={() => markStageComplete("mixSpatial")}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="px-4 py-6 md:px-8 lg:px-12 text-white">
      <div className="mx-auto max-w-6xl flex flex-col gap-6">
        {/* Workflow Stepper */}
        <WorkflowStepper
          currentStage={workflow.currentStage}
          completedStages={workflow.stagesCompleted}
          onStageClick={setCurrentStage}
        />

        {/* Main content area */}
        <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
          {/* Left sidebar - Project overview */}
          <div className="space-y-4">
            {/* Project header card */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <div className="text-xs uppercase tracking-widest text-white/50 mb-1">Project</div>
              <h1 className="text-xl font-bold text-white mb-2">
                {project.projectName || "New Production"}
              </h1>
              {project.vibe && (
                <p className="text-sm text-white/60 mb-3">{project.vibe}</p>
              )}

              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-white/5 p-2">
                  <div className="text-xs text-white/50">Tempo</div>
                  <div className="text-lg font-semibold">{project.tempo} BPM</div>
                </div>
                <div className="rounded-lg bg-white/5 p-2">
                  <div className="text-xs text-white/50">Key</div>
                  <div className="text-lg font-semibold">{project.key || "—"}</div>
                </div>
                <div className="rounded-lg bg-white/5 p-2">
                  <div className="text-xs text-white/50">Genre</div>
                  <div className="text-sm font-medium">
                    {project.genre || workflow.brief?.genres?.[0] || "—"}
                  </div>
                </div>
                <div className="rounded-lg bg-white/5 p-2">
                  <div className="text-xs text-white/50">Time Sig</div>
                  <div className="text-lg font-semibold">{project.timeSignature}</div>
                </div>
              </div>
            </div>

            {/* Tracks summary */}
            {project.tracks.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs uppercase tracking-widest text-white/50">Tracks</div>
                  <span className="text-xs text-white/40">{project.tracks.length}</span>
                </div>
                <div className="space-y-2">
                  {project.tracks.slice(0, 5).map((track) => (
                    <div
                      key={track.id}
                      className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5"
                    >
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: track.color || themeColor }}
                      />
                      <span className="text-xs text-white/80 truncate flex-1">
                        {track.name}
                      </span>
                      <span className="text-xs text-white/40">{track.type}</span>
                    </div>
                  ))}
                  {project.tracks.length > 5 && (
                    <div className="text-xs text-white/40 text-center">
                      +{project.tracks.length - 5} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Current stage info */}
            <div
              className="rounded-2xl border p-4"
              style={{
                borderColor: `${STAGE_CONFIG[workflow.currentStage].color}40`,
                backgroundColor: `${STAGE_CONFIG[workflow.currentStage].color}10`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: STAGE_CONFIG[workflow.currentStage].color }}
                >
                  {STAGE_CONFIG[workflow.currentStage].icon}
                </div>
                <span
                  className="text-sm font-medium"
                  style={{ color: STAGE_CONFIG[workflow.currentStage].color }}
                >
                  {STAGE_CONFIG[workflow.currentStage].label}
                </span>
              </div>
              <p className="text-xs text-white/60">
                {getStageDescription(workflow.currentStage)}
              </p>
            </div>
          </div>

          {/* Main stage panel */}
          <div className="min-w-0">{renderStagePanel()}</div>
        </div>
      </div>
    </div>
  );
}

function getStageDescription(stage: WorkflowStage): string {
  const descriptions: Record<WorkflowStage, string> = {
    briefIngestion:
      "Define your creative vision - genres, moods, references, and constraints.",
    stylePrior:
      "Establish the sonic character - BPM, swing, sound design traits.",
    timeBase:
      "Create the groove foundation - tempo, meter, and drum patterns.",
    palette:
      "Curate your sounds across the frequency spectrum.",
    motifSeed:
      "Generate and select memorable musical ideas and hooks.",
    macroStructure:
      "Design the arrangement architecture with sections and energy flow.",
    composeOrchestrate:
      "Compose voices and harmonies for each section.",
    variationOperators:
      "Add variations and ear candy to maintain interest.",
    mixSpatial:
      "Design levels, spatial positioning, and the master chain.",
  };
  return descriptions[stage];
}
