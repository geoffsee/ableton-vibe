/**
 * Stage 8: Iterate with Variation Operators
 *
 * Tools for applying variations, generating ear candy, and running variation passes
 */

import { z } from "zod";
import { tool } from "@langchain/core/tools";
import {
  MotifSeedSchema,
  SectionCompositionSchema,
  type MotifSeed,
  type MotifNote,
  type SectionComposition,
  type Variation,
  type EarCandy,
  type VariationPass,
} from "../types";
import { varyMotif, createMotifSeed } from "../generators/motif";
import { calculateMotifScore } from "../scoring/motif";

/**
 * Variation operators available
 */
const VARIATION_OPERATORS = [
  "transpose",
  "invert",
  "retrograde",
  "augment",
  "diminish",
  "thin",
  "thicken",
  "randomize",
] as const;

type VariationOperator = (typeof VARIATION_OPERATORS)[number];

/**
 * Apply a variation operator to a motif
 */
function applyVariationOperator(
  motif: MotifSeed,
  operator: VariationOperator,
  param?: number
): MotifSeed {
  let variedNotes: MotifNote[];

  switch (operator) {
    case "transpose":
      variedNotes = varyMotif(motif.notes, "transpose", param || 5);
      break;
    case "invert":
      variedNotes = varyMotif(motif.notes, "invert", param);
      break;
    case "retrograde":
      variedNotes = varyMotif(motif.notes, "retrograde");
      break;
    case "augment":
      variedNotes = varyMotif(motif.notes, "augment", param || 2);
      break;
    case "diminish":
      variedNotes = varyMotif(motif.notes, "diminish", param || 0.5);
      break;
    case "thin":
      // Remove every other note
      variedNotes = motif.notes.filter((_, i) => i % 2 === 0);
      break;
    case "thicken":
      // Double notes with octave
      variedNotes = [
        ...motif.notes,
        ...motif.notes.map((n) => ({ ...n, pitch: n.pitch + 12 })),
      ].sort((a, b) => a.time - b.time);
      break;
    case "randomize":
      // Randomly shift pitches within scale
      variedNotes = motif.notes.map((n) => ({
        ...n,
        pitch: n.pitch + Math.floor(Math.random() * 5) - 2,
      }));
      break;
    default:
      variedNotes = motif.notes;
  }

  return createMotifSeed(
    variedNotes,
    motif.type,
    motif.key,
    motif.scale,
    `${motif.name} (${operator})`
  );
}

/**
 * Ear candy type definitions
 */
const EAR_CANDY_TYPES = [
  "riser",
  "downlifter",
  "impact",
  "sweep",
  "stutter",
  "vocal-chop",
  "reverse",
  "white-noise",
] as const;

type EarCandyType = (typeof EAR_CANDY_TYPES)[number];

/**
 * Generate ear candy for a position
 */
function generateEarCandy(
  type: EarCandyType,
  position: number,
  duration: number
): EarCandy {
  return {
    id: `ear-candy-${type}-${position}-${Date.now()}`,
    type,
    position,
    duration,
  };
}

/**
 * Tool schema for applying variation
 */
const ApplyVariationInputSchema = z.object({
  motif: MotifSeedSchema.describe("The source motif to vary"),
  operator: z.enum(VARIATION_OPERATORS).describe("Variation operator to apply"),
  param: z.number().optional().describe("Optional parameter for the operator"),
});

/**
 * Tool for applying a variation to a motif
 */
export const workflowApplyVariation = tool(
  async (input): Promise<Variation> => {
    const result = applyVariationOperator(input.motif, input.operator, input.param);

    // Calculate coherence (using motif score as proxy)
    const dummyStylePrior = {
      bpmSignature: { typical: 128, variance: 5 },
      swingProfile: { amount: 0, subdivision: "8th" as const },
      soundDesignTraits: [],
      arrangementNorms: {
        typicalIntroLength: 16,
        typicalDropLength: 32,
        typicalBreakdownLength: 16,
        transitionStyle: [],
      },
      guardrails: { energyProfile: "neutral", avoidCliches: [] },
    };

    const originalScore = calculateMotifScore(input.motif, dummyStylePrior);
    const variedScore = calculateMotifScore(result, dummyStylePrior);

    return {
      id: `variation-${Date.now()}`,
      sourceId: input.motif.id,
      operator: input.operator,
      result,
      coherenceScore: variedScore.overall,
      improvementDelta: variedScore.overall - originalScore.overall,
    };
  },
  {
    name: "workflowApplyVariation",
    description:
      "Apply a variation operator to a motif. " +
      "Available operators: transpose, invert, retrograde, augment, diminish, thin, thicken, randomize.",
    schema: ApplyVariationInputSchema,
  }
);

/**
 * Tool schema for generating ear candy
 */
const GenerateEarCandyInputSchema = z.object({
  type: z.enum(EAR_CANDY_TYPES).describe("Type of ear candy to generate"),
  position: z.number().describe("Position in bars where the ear candy should occur"),
  duration: z.number().optional().describe("Duration in bars (default depends on type)"),
});

/**
 * Tool for generating ear candy
 */
export const workflowGenerateEarCandy = tool(
  async (input): Promise<EarCandy> => {
    // Default durations by type
    const defaultDurations: Record<EarCandyType, number> = {
      riser: 4,
      downlifter: 2,
      impact: 0.25,
      sweep: 2,
      stutter: 0.5,
      "vocal-chop": 0.5,
      reverse: 1,
      "white-noise": 4,
    };

    const duration = input.duration || defaultDurations[input.type];
    return generateEarCandy(input.type, input.position, duration);
  },
  {
    name: "workflowGenerateEarCandy",
    description:
      "Generate ear candy (risers, impacts, sweeps, etc.) for transitions. " +
      "Place at specific bar positions to enhance the arrangement.",
    schema: GenerateEarCandyInputSchema,
  }
);

/**
 * Tool schema for running variation pass
 */
const RunVariationPassInputSchema = z.object({
  compositions: z.array(SectionCompositionSchema).describe("Section compositions to enhance"),
  motifs: z.array(MotifSeedSchema).describe("Available motifs"),
  passNumber: z.number().optional().describe("Current pass number (for tracking)"),
  transitionBars: z.array(z.number()).describe("Bar positions of transitions"),
});

/**
 * Tool for running a complete variation pass
 */
export const workflowRunVariationPass = tool(
  async (input): Promise<VariationPass> => {
    const passNumber = input.passNumber || 1;
    const variations: Variation[] = [];
    const earCandy: EarCandy[] = [];
    const transitionEnhancements: Array<{
      bar: number;
      earCandy: EarCandy[];
      fillPattern?: MotifSeed;
    }> = [];

    // Apply variations to motifs
    for (const motif of input.motifs) {
      // Select random operators for variety
      const operators: VariationOperator[] = ["transpose", "invert", "thin"];
      const selectedOperator = operators[Math.floor(Math.random() * operators.length)]!;

      const variation = await workflowApplyVariation.invoke({
        motif,
        operator: selectedOperator,
        param: selectedOperator === "transpose" ? 5 : undefined,
      });

      // Only keep if it improves or maintains quality
      if (variation.improvementDelta >= -10) {
        variations.push(variation);
      }
    }

    // Generate ear candy for transitions
    for (const bar of input.transitionBars) {
      // Add riser before transition
      const riser = generateEarCandy("riser", bar - 4, 4);
      earCandy.push(riser);

      // Add impact at transition
      const impact = generateEarCandy("impact", bar, 0.25);
      earCandy.push(impact);

      // Create transition enhancement
      transitionEnhancements.push({
        bar,
        earCandy: [riser, impact],
      });
    }

    return {
      passNumber,
      variations,
      earCandy,
      transitionEnhancements,
    };
  },
  {
    name: "workflowRunVariationPass",
    description:
      "Run a complete variation pass over the arrangement. " +
      "Applies variations to motifs and generates ear candy for transitions.",
    schema: RunVariationPassInputSchema,
  }
);

/**
 * Tool schema for generating transition fill
 */
const GenerateTransitionFillInputSchema = z.object({
  fromSection: z.object({ energyLevel: z.number() }).describe("The section before transition"),
  toSection: z.object({ energyLevel: z.number() }).describe("The section after transition"),
  duration: z.number().optional().describe("Fill duration in bars (default 1)"),
});

/**
 * Tool for generating a transition fill pattern
 */
export const workflowGenerateTransitionFill = tool(
  async (input): Promise<{
    earCandy: EarCandy[];
    fillNotes: MotifNote[];
  }> => {
    const duration = input.duration || 1;
    const isBuilding = input.toSection.energyLevel > input.fromSection.energyLevel;
    const earCandy: EarCandy[] = [];
    const fillNotes: MotifNote[] = [];

    if (isBuilding) {
      // Building transition - use riser and snare roll
      earCandy.push(generateEarCandy("riser", 0, duration));

      // Generate snare roll
      const rollSteps = duration * 16; // 16th notes
      for (let i = 0; i < rollSteps; i++) {
        fillNotes.push({
          pitch: 38, // Snare
          time: (i / 16) * duration * 4, // Convert to beats
          duration: 0.0625,
          velocity: 80 + Math.floor((i / rollSteps) * 40), // Crescendo
        });
      }
    } else {
      // Releasing transition - use downlifter
      earCandy.push(generateEarCandy("downlifter", 0, duration));
      earCandy.push(generateEarCandy("reverse", duration - 0.5, 0.5));
    }

    return { earCandy, fillNotes };
  },
  {
    name: "workflowGenerateTransitionFill",
    description:
      "Generate a transition fill with ear candy and drum patterns. " +
      "Adapts to whether energy is building or releasing.",
    schema: GenerateTransitionFillInputSchema,
  }
);

// Export all stage 8 tools
export const stage8Tools = [
  workflowApplyVariation,
  workflowGenerateEarCandy,
  workflowRunVariationPass,
  workflowGenerateTransitionFill,
];
