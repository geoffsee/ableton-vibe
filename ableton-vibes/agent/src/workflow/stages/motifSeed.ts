/**
 * Stage 5: Generate Motif Seed Set
 *
 * Tools for generating, scoring, and selecting motif seeds
 */

import { z } from "zod";
import { tool } from "@langchain/core/tools";
import {
  StylePriorSchema,
  MotifSeedSchema,
  type StylePrior,
  type MotifSeed,
  type MotifScore,
  type MotifSeedSet,
} from "../types";
import { generateMotifCandidates } from "../generators/motif";
import { calculateMotifScore, rankMotifs } from "../scoring/motif";
import { SCALES } from "../utils/musicTheory";

/**
 * Tool schema for generating motifs
 */
const GenerateMotifsInputSchema = z.object({
  stylePrior: StylePriorSchema.describe("The style prior to guide motif generation"),
  type: z.enum(["melodic", "rhythmic", "harmonic", "textural"]).describe("Type of motif to generate"),
  key: z.string().optional().describe("Musical key (default C)"),
  scale: z
    .enum(Object.keys(SCALES) as [string, ...string[]])
    .optional()
    .describe("Scale type (default minor)"),
  count: z.number().optional().describe("Number of candidates to generate (default 5)"),
});

/**
 * Tool for generating motif candidates
 */
export const workflowGenerateMotifs = tool(
  async (input): Promise<MotifSeed[]> => {
    const key = input.key || "C";
    const scale = (input.scale || "minor") as keyof typeof SCALES;
    const count = input.count || 5;

    return generateMotifCandidates(input.stylePrior, input.type, key, scale, count);
  },
  {
    name: "workflowGenerateMotifs",
    description:
      "Generate motif candidates of a specific type (melodic, rhythmic, harmonic, textural). " +
      "Creates musical patterns appropriate for the genre and mood.",
    schema: GenerateMotifsInputSchema,
  }
);

/**
 * Tool schema for scoring motifs
 */
const ScoreMotifsInputSchema = z.object({
  motifs: z.array(MotifSeedSchema).describe("The motif candidates to score"),
  stylePrior: StylePriorSchema.describe("The style prior for genre fit scoring"),
});

/**
 * Tool for scoring motif candidates
 */
export const workflowScoreMotifs = tool(
  async (input): Promise<Array<{ motif: MotifSeed; score: MotifScore }>> => {
    return rankMotifs(input.motifs, input.stylePrior);
  },
  {
    name: "workflowScoreMotifs",
    description:
      "Score and rank motif candidates based on memorability, singability, tension/relief, novelty, and genre fit. " +
      "Returns motifs sorted by overall score descending.",
    schema: ScoreMotifsInputSchema,
  }
);

/**
 * Tool schema for selecting top motifs
 */
const SelectTopMotifsInputSchema = z.object({
  rankedMotifs: z
    .array(
      z.object({
        motif: MotifSeedSchema,
        score: z.object({
          motifId: z.string(),
          memorability: z.number(),
          singability: z.number(),
          tensionRelief: z.number(),
          novelty: z.number(),
          genreFit: z.number(),
          overall: z.number(),
          breakdown: z.object({
            intervalVariety: z.number(),
            rhythmicInterest: z.number(),
            contour: z.number(),
            repetitionBalance: z.number(),
          }),
        }),
      })
    )
    .describe("Ranked motif candidates from scoring"),
  topN: z.number().optional().describe("Number of top motifs to select (default 3)"),
  minimumScore: z.number().optional().describe("Minimum overall score threshold (default 50)"),
});

/**
 * Tool for selecting top motifs
 */
export const workflowSelectTopMotifs = tool(
  async (input): Promise<MotifSeedSet> => {
    const topN = input.topN || 3;
    const minimumScore = input.minimumScore || 50;

    // Filter by minimum score and take top N
    const qualifying = input.rankedMotifs.filter((r) => r.score.overall >= minimumScore);
    const selected = qualifying.slice(0, topN);

    const seeds = selected.map((s) => s.motif);
    const scores = selected.map((s) => s.score);

    return {
      totalGenerated: input.rankedMotifs.length,
      seeds,
      scores,
      topN: selected.length,
    };
  },
  {
    name: "workflowSelectTopMotifs",
    description:
      "Select the top N motifs from ranked candidates. " +
      "Filters by minimum score and returns a motif seed set.",
    schema: SelectTopMotifsInputSchema,
  }
);

/**
 * Generate all motif types in one call
 */
const GenerateAllMotifTypesInputSchema = z.object({
  stylePrior: StylePriorSchema.describe("The style prior"),
  key: z.string().optional().describe("Musical key (default C)"),
  scale: z
    .enum(Object.keys(SCALES) as [string, ...string[]])
    .optional()
    .describe("Scale type (default minor)"),
  countPerType: z.number().optional().describe("Candidates per type (default 3)"),
});

/**
 * Tool for generating all motif types
 */
export const workflowGenerateAllMotifTypes = tool(
  async (input): Promise<{
    melodic: MotifSeed[];
    rhythmic: MotifSeed[];
    harmonic: MotifSeed[];
    textural: MotifSeed[];
  }> => {
    const key = input.key || "C";
    const scale = (input.scale || "minor") as keyof typeof SCALES;
    const countPerType = input.countPerType || 3;

    return {
      melodic: generateMotifCandidates(input.stylePrior, "melodic", key, scale, countPerType),
      rhythmic: generateMotifCandidates(input.stylePrior, "rhythmic", key, scale, countPerType),
      harmonic: generateMotifCandidates(input.stylePrior, "harmonic", key, scale, countPerType),
      textural: generateMotifCandidates(input.stylePrior, "textural", key, scale, countPerType),
    };
  },
  {
    name: "workflowGenerateAllMotifTypes",
    description:
      "Generate motif candidates for all types (melodic, rhythmic, harmonic, textural) in one call. " +
      "Useful for quickly populating a complete motif library.",
    schema: GenerateAllMotifTypesInputSchema,
  }
);

// Export all stage 5 tools
export const stage5Tools = [
  workflowGenerateMotifs,
  workflowScoreMotifs,
  workflowSelectTopMotifs,
  workflowGenerateAllMotifTypes,
];
