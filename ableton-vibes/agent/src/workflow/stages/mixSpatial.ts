/**
 * Stage 9: Mix & Spatial Design
 *
 * Tools for creating leveling plans, EQ/compression suggestions,
 * spatial scenes, automation, and final mix design
 */

import { z } from "zod";
import { tool } from "@langchain/core/tools";
import {
  SoundPaletteSchema,
  SectionCompositionSchema,
  type SoundPalette,
  type SectionComposition,
  type LevelingPlan,
  type EqCompSuggestion,
  type SpatialScene,
  type AutomationPass,
  type MixDesign,
} from "../types";
import { calculateMixScore } from "../scoring/mix";

/**
 * Generate initial leveling plan based on track roles
 */
function generateLevelingPlan(
  compositions: SectionComposition[],
  palette: SoundPalette
): LevelingPlan {
  const tracks: LevelingPlan["tracks"] = [];
  const seenTracks = new Set<string>();

  // Collect unique tracks from compositions
  for (const composition of compositions) {
    for (const voice of composition.voices) {
      if (seenTracks.has(voice.trackName)) continue;
      seenTracks.add(voice.trackName);

      // Determine stem group and levels based on role
      let stemGroup: LevelingPlan["tracks"][0]["stemGroup"] = "synths";
      let targetDb = -12;
      let pan = 0;

      switch (voice.role) {
        case "bass":
          stemGroup = "bass";
          targetDb = -8;
          pan = 0;
          break;
        case "rhythm":
          stemGroup = "drums";
          targetDb = -6;
          pan = 0;
          break;
        case "topline":
          stemGroup = "synths";
          targetDb = -10;
          pan = 0;
          break;
        case "harmony":
          stemGroup = "pads";
          targetDb = -14;
          pan = -20;
          break;
        case "pad":
          stemGroup = "pads";
          targetDb = -16;
          pan = 20;
          break;
        case "fx":
          stemGroup = "fx";
          targetDb = -18;
          pan = 30;
          break;
      }

      tracks.push({
        trackName: voice.trackName,
        stemGroup,
        targetDb,
        pan,
      });
    }
  }

  // Add palette entries that aren't covered
  for (const entry of palette.entries) {
    const matchingTrack = tracks.find((t) =>
      t.trackName.toLowerCase().includes(entry.role)
    );
    if (!matchingTrack) {
      let stemGroup: LevelingPlan["tracks"][0]["stemGroup"] = "synths";
      if (entry.role === "sub" || entry.role === "bass") stemGroup = "bass";
      else if (entry.role === "lowMid" || entry.role === "mid") stemGroup = "pads";

      tracks.push({
        trackName: entry.name,
        stemGroup,
        targetDb: -12,
        pan: 0,
      });
    }
  }

  return { tracks };
}

/**
 * Generate EQ and compression suggestions
 */
function generateEqCompSuggestions(palette: SoundPalette): EqCompSuggestion[] {
  const suggestions: EqCompSuggestion[] = [];

  // Drum bus
  suggestions.push({
    stemGroup: "drums",
    eq: [
      { frequency: 60, gain: 2, q: 1.5, type: "peak" },
      { frequency: 200, gain: -2, q: 2, type: "peak" },
      { frequency: 3000, gain: 1, q: 1, type: "shelf" },
    ],
    compression: { threshold: -12, ratio: 4, attack: 10, release: 100 },
    saturation: { drive: 10, mix: 30 },
  });

  // Bass
  suggestions.push({
    stemGroup: "bass",
    eq: [
      { frequency: 30, gain: -6, q: 0.7, type: "highpass" },
      { frequency: 80, gain: 3, q: 1.5, type: "peak" },
      { frequency: 800, gain: -2, q: 2, type: "peak" },
    ],
    compression: { threshold: -10, ratio: 3, attack: 20, release: 150 },
    saturation: { drive: 20, mix: 25 },
  });

  // Synths
  suggestions.push({
    stemGroup: "synths",
    eq: [
      { frequency: 100, gain: -6, q: 0.7, type: "highpass" },
      { frequency: 2500, gain: 2, q: 1.5, type: "peak" },
      { frequency: 10000, gain: 1, q: 0.7, type: "shelf" },
    ],
    compression: { threshold: -15, ratio: 2.5, attack: 15, release: 120 },
  });

  // Pads
  suggestions.push({
    stemGroup: "pads",
    eq: [
      { frequency: 150, gain: -6, q: 0.7, type: "highpass" },
      { frequency: 400, gain: -2, q: 2, type: "peak" },
      { frequency: 8000, gain: 2, q: 0.7, type: "shelf" },
    ],
    compression: { threshold: -20, ratio: 2, attack: 30, release: 200 },
  });

  // FX
  suggestions.push({
    stemGroup: "fx",
    eq: [
      { frequency: 200, gain: -6, q: 0.7, type: "highpass" },
      { frequency: 5000, gain: 2, q: 1, type: "peak" },
    ],
    compression: { threshold: -18, ratio: 2, attack: 5, release: 80 },
  });

  return suggestions;
}

/**
 * Generate spatial scene
 */
function generateSpatialScene(
  leveling: LevelingPlan,
  style: "intimate" | "spacious" | "epic" = "spacious"
): SpatialScene {
  const depthLayers: SpatialScene["depthLayers"] = [];
  const delays: SpatialScene["delays"] = [];
  const widthProcessing: SpatialScene["widthProcessing"] = [];

  // Room reverb (front layer)
  depthLayers.push({
    name: "Room",
    reverbType: "room",
    decayTime: style === "intimate" ? 0.4 : 0.8,
    predelay: 5,
    wetLevel: 15,
    assignedTracks: leveling.tracks.filter((t) => t.stemGroup === "drums").map((t) => t.trackName),
    character: "tight",
  });

  // Plate reverb (mid layer)
  depthLayers.push({
    name: "Plate",
    reverbType: "plate",
    decayTime: style === "epic" ? 2 : 1.2,
    predelay: 20,
    wetLevel: 25,
    assignedTracks: leveling.tracks.filter((t) => t.stemGroup === "synths").map((t) => t.trackName),
    character: "smooth",
  });

  // Hall reverb (back layer)
  depthLayers.push({
    name: "Hall",
    reverbType: "hall",
    decayTime: style === "intimate" ? 1.5 : style === "epic" ? 4 : 2.5,
    predelay: 40,
    wetLevel: 30,
    assignedTracks: leveling.tracks.filter((t) => t.stemGroup === "pads").map((t) => t.trackName),
    character: "wide",
  });

  // Add delays
  delays.push({
    name: "Ping Pong",
    type: "ping-pong",
    time: "1/8",
    feedback: 35,
    assignedTracks: leveling.tracks.filter((t) => t.stemGroup === "synths").map((t) => t.trackName),
  });

  delays.push({
    name: "Dotted",
    type: "dotted",
    time: "1/4d",
    feedback: 25,
    assignedTracks: [],
  });

  // Add width processing for pads
  for (const track of leveling.tracks.filter((t) => t.stemGroup === "pads")) {
    widthProcessing.push({
      trackName: track.trackName,
      technique: "mid-side",
      amount: 60,
    });
  }

  return {
    depthLayers,
    delays,
    widthProcessing,
  };
}

/**
 * Generate automation passes
 */
function generateAutomationPasses(
  leveling: LevelingPlan,
  totalBars: number
): AutomationPass[] {
  const passes: AutomationPass[] = [];

  // Filter sweep automation for synths
  for (const track of leveling.tracks.filter((t) => t.stemGroup === "synths")) {
    passes.push({
      parameter: "filter_cutoff",
      trackName: track.trackName,
      keyframes: [
        { bar: 0, value: 0.3 },
        { bar: Math.floor(totalBars * 0.25), value: 0.6 },
        { bar: Math.floor(totalBars * 0.5), value: 1.0 },
        { bar: Math.floor(totalBars * 0.75), value: 0.8 },
        { bar: totalBars, value: 0.5 },
      ],
      purpose: "filter_sweep",
    });
  }

  // Volume automation for drops
  for (const track of leveling.tracks.filter((t) => t.stemGroup === "drums")) {
    passes.push({
      parameter: "volume",
      trackName: track.trackName,
      keyframes: [
        { bar: 0, value: 0.8 },
        { bar: Math.floor(totalBars * 0.45), value: 0.0 },
        { bar: Math.floor(totalBars * 0.5), value: 1.0 },
      ],
      purpose: "drop_impact",
    });
  }

  return passes;
}

/**
 * Tool schema for creating leveling plan
 */
const CreateLevelingPlanInputSchema = z.object({
  compositions: z.array(SectionCompositionSchema).describe("Section compositions"),
  palette: SoundPaletteSchema.describe("Sound palette"),
});

/**
 * Tool for creating a leveling plan
 */
export const workflowCreateLevelingPlan = tool(
  async (input): Promise<LevelingPlan> => {
    return generateLevelingPlan(input.compositions, input.palette);
  },
  {
    name: "workflowCreateLevelingPlan",
    description:
      "Create a leveling plan with target dB and pan positions for all tracks. " +
      "Assigns tracks to stem groups (drums, bass, synths, pads, fx).",
    schema: CreateLevelingPlanInputSchema,
  }
);

/**
 * Tool schema for generating EQ/comp suggestions
 */
const GenerateEqCompSuggestionsInputSchema = z.object({
  palette: SoundPaletteSchema.describe("Sound palette for context"),
});

/**
 * Tool for generating EQ and compression suggestions
 */
export const workflowGenerateEqCompSuggestions = tool(
  async (input): Promise<EqCompSuggestion[]> => {
    return generateEqCompSuggestions(input.palette);
  },
  {
    name: "workflowGenerateEqCompSuggestions",
    description:
      "Generate EQ and compression suggestions for each stem group. " +
      "Includes saturation settings where appropriate.",
    schema: GenerateEqCompSuggestionsInputSchema,
  }
);

/**
 * Tool schema for designing spatial scene
 */
const DesignSpatialSceneInputSchema = z.object({
  leveling: z.object({
    tracks: z.array(
      z.object({
        trackName: z.string(),
        stemGroup: z.enum(["drums", "bass", "synths", "pads", "fx", "vocals"]),
        targetDb: z.number(),
        pan: z.number(),
      })
    ),
  }).describe("Leveling plan"),
  style: z.enum(["intimate", "spacious", "epic"]).optional().describe("Spatial style"),
});

/**
 * Tool for designing spatial scene
 */
export const workflowDesignSpatialScene = tool(
  async (input): Promise<SpatialScene> => {
    const style = input.style || "spacious";
    return generateSpatialScene(input.leveling, style);
  },
  {
    name: "workflowDesignSpatialScene",
    description:
      "Design the spatial scene with reverb layers, delays, and width processing. " +
      "Choose style: intimate (small room), spacious (moderate), or epic (large hall).",
    schema: DesignSpatialSceneInputSchema,
  }
);

/**
 * Tool schema for planning automation
 */
const PlanAutomationInputSchema = z.object({
  leveling: z.object({
    tracks: z.array(
      z.object({
        trackName: z.string(),
        stemGroup: z.enum(["drums", "bass", "synths", "pads", "fx", "vocals"]),
        targetDb: z.number(),
        pan: z.number(),
      })
    ),
  }).describe("Leveling plan"),
  totalBars: z.number().describe("Total arrangement length in bars"),
});

/**
 * Tool for planning automation
 */
export const workflowPlanAutomation = tool(
  async (input): Promise<AutomationPass[]> => {
    return generateAutomationPasses(input.leveling, input.totalBars);
  },
  {
    name: "workflowPlanAutomation",
    description:
      "Plan automation passes for filter sweeps, volume changes, and other parameters. " +
      "Creates keyframe data for dynamic mix changes.",
    schema: PlanAutomationInputSchema,
  }
);

/**
 * Tool schema for assembling mix design
 */
const AssembleMixDesignInputSchema = z.object({
  compositions: z.array(SectionCompositionSchema).describe("Section compositions"),
  palette: SoundPaletteSchema.describe("Sound palette"),
  totalBars: z.number().describe("Total arrangement length"),
  spatialStyle: z.enum(["intimate", "spacious", "epic"]).optional(),
});

/**
 * Tool for assembling complete mix design
 */
export const workflowAssembleMixDesign = tool(
  async (input): Promise<{
    mixDesign: MixDesign;
    score: ReturnType<typeof calculateMixScore>;
  }> => {
    // Generate all mix components
    const leveling = generateLevelingPlan(input.compositions, input.palette);
    const eqCompSuggestions = generateEqCompSuggestions(input.palette);
    const spatialScene = generateSpatialScene(leveling, input.spatialStyle || "spacious");
    const automationPasses = generateAutomationPasses(leveling, input.totalBars);

    // Standard master chain
    const masterChain: MixDesign["masterChain"] = [
      { order: 1, device: "EQ Eight", purpose: "tonal shaping", settings: {} },
      { order: 2, device: "Glue Compressor", purpose: "glue", settings: { threshold: -10, ratio: 2 } },
      { order: 3, device: "Saturator", purpose: "warmth", settings: { drive: 5 } },
      { order: 4, device: "Limiter", purpose: "ceiling", settings: { ceiling: -0.3 } },
    ];

    const mixDesign: MixDesign = {
      leveling,
      eqCompSuggestions,
      spatialScene,
      automationPasses,
      masterChain,
    };

    // Score the mix design
    const score = calculateMixScore(mixDesign);

    return { mixDesign, score };
  },
  {
    name: "workflowAssembleMixDesign",
    description:
      "Assemble a complete mix design including leveling, EQ/compression, spatial design, " +
      "automation, and master chain. Returns the design with quality scores.",
    schema: AssembleMixDesignInputSchema,
  }
);

// Export all stage 9 tools
export const stage9Tools = [
  workflowCreateLevelingPlan,
  workflowGenerateEqCompSuggestions,
  workflowDesignSpatialScene,
  workflowPlanAutomation,
  workflowAssembleMixDesign,
];
