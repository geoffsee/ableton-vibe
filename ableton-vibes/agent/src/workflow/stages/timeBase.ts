/**
 * Stage 3: Create Time Base
 *
 * Tools for generating grooves, scoring them, and selecting the time base
 */

import { z } from "zod";
import { tool } from "@langchain/core/tools";
import {
  StylePriorSchema,
  GrooveCandidateSchema,
  type StylePrior,
  type GrooveCandidate,
  type GrooveScore,
  type TimeBase,
} from "../types";
import { generateGrooveCandidates } from "../generators/groove";
import { calculateGrooveScore, rankGrooves } from "../scoring/groove";

/**
 * Tool schema for generating grooves
 */
const GenerateGroovesInputSchema = z.object({
  stylePrior: StylePriorSchema.describe("The style prior to guide groove generation"),
  count: z.number().optional().describe("Number of candidates to generate (default 5)"),
});

/**
 * Tool for generating groove candidates
 */
export const workflowGenerateGrooves = tool(
  async (input): Promise<GrooveCandidate[]> => {
    const count = input.count || 5;
    return generateGrooveCandidates(input.stylePrior, count);
  },
  {
    name: "workflowGenerateGrooves",
    description:
      "Generate groove candidates based on the style prior. " +
      "This creates kick, snare, and hi-hat patterns appropriate for the genre.",
    schema: GenerateGroovesInputSchema,
  }
);

/**
 * Tool schema for scoring grooves
 */
const ScoreGroovesInputSchema = z.object({
  grooves: z.array(GrooveCandidateSchema).describe("The groove candidates to score"),
  stylePrior: StylePriorSchema.describe("The style prior for genre fit scoring"),
});

/**
 * Tool for scoring groove candidates
 */
export const workflowScoreGrooves = tool(
  async (input): Promise<Array<{ groove: GrooveCandidate; score: GrooveScore }>> => {
    return rankGrooves(input.grooves, input.stylePrior);
  },
  {
    name: "workflowScoreGrooves",
    description:
      "Score and rank groove candidates based on danceability, pocket, and genre fit. " +
      "Returns grooves sorted by overall score descending.",
    schema: ScoreGroovesInputSchema,
  }
);

/**
 * Tool schema for selecting time base
 */
const SelectTimeBaseInputSchema = z.object({
  rankedGrooves: z
    .array(
      z.object({
        groove: GrooveCandidateSchema,
        score: z.object({
          candidateId: z.string(),
          danceability: z.number(),
          pocket: z.number(),
          genreFit: z.number(),
          overall: z.number(),
          breakdown: z.record(z.number()),
        }),
      })
    )
    .describe("Ranked groove candidates from scoring"),
  userSelection: z.number().optional().describe("User's selection index (0-based), defaults to 0 (top-ranked)"),
});

/**
 * Tool for selecting the final time base
 */
export const workflowSelectTimeBase = tool(
  async (input): Promise<TimeBase> => {
    const selectionIndex = input.userSelection ?? 0;
    const selected = input.rankedGrooves[selectionIndex];

    if (!selected) {
      throw new Error(`Invalid selection index: ${selectionIndex}`);
    }

    // Keep top 3 as alternates (excluding the selected one)
    const alternates = input.rankedGrooves
      .filter((_, i) => i !== selectionIndex)
      .slice(0, 3)
      .map((r) => r.groove);

    return {
      finalTempo: selected.groove.tempo,
      finalMeter: selected.groove.meter,
      selectedGroove: selected.groove,
      alternateGrooves: alternates,
    };
  },
  {
    name: "workflowSelectTimeBase",
    description:
      "Select the time base (tempo, meter, groove) from ranked candidates. " +
      "Defaults to the top-ranked groove unless user specifies otherwise.",
    schema: SelectTimeBaseInputSchema,
  }
);

// Export all stage 3 tools
export const stage3Tools = [workflowGenerateGrooves, workflowScoreGrooves, workflowSelectTimeBase];
