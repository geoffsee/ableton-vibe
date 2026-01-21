/**
 * Stage 1: Brief Ingestion & Intent Lock
 *
 * Tools for ingesting production briefs and locking user intent
 */

import { z } from "zod";
import { tool } from "@langchain/core/tools";
import {
  ProductionBriefSchema,
  ProductionSpecSchema,
  type ProductionBrief,
  type ProductionSpec,
} from "../types";

/**
 * Parse and validate a production brief from natural language
 */
export function parseBrief(input: {
  genres: string[];
  references?: string[];
  mood: string[];
  useCase?: string;
  targetDurationBars?: number;
  mustInclude?: string[];
  mustAvoid?: string[];
}): ProductionBrief {
  return {
    genres: input.genres,
    references: input.references || [],
    mood: input.mood,
    useCase: input.useCase || "general",
    targetDurationBars: input.targetDurationBars || 128,
    rules: {
      must: input.mustInclude || [],
      mustNot: input.mustAvoid || [],
    },
  };
}

/**
 * Derive production spec from brief
 */
export function deriveProductionSpec(brief: ProductionBrief): ProductionSpec {
  // Determine tempo range based on genres
  const tempoRanges: Record<string, { min: number; max: number }> = {
    techno: { min: 125, max: 145 },
    house: { min: 118, max: 135 },
    trance: { min: 130, max: 150 },
    dnb: { min: 160, max: 180 },
    dubstep: { min: 138, max: 145 },
    hiphop: { min: 70, max: 100 },
    trap: { min: 130, max: 170 },
    ambient: { min: 60, max: 100 },
    pop: { min: 100, max: 130 },
    downtempo: { min: 70, max: 110 },
  };

  // Find tempo range from genres
  let minTempo = 120;
  let maxTempo = 130;

  for (const genre of brief.genres) {
    const lower = genre.toLowerCase();
    for (const [key, range] of Object.entries(tempoRanges)) {
      if (lower.includes(key)) {
        minTempo = Math.min(minTempo, range.min);
        maxTempo = Math.max(maxTempo, range.max);
      }
    }
  }

  // Determine energy arc from mood
  const energyArc: ProductionSpec["energyArc"] = [];
  const moodLower = brief.mood.map((m) => m.toLowerCase());

  if (moodLower.some((m) => m.includes("build") || m.includes("crescendo"))) {
    energyArc.push(
      { position: 0, energy: 30 },
      { position: 0.25, energy: 50 },
      { position: 0.5, energy: 70 },
      { position: 0.75, energy: 90 },
      { position: 1, energy: 100 }
    );
  } else if (moodLower.some((m) => m.includes("chill") || m.includes("ambient"))) {
    energyArc.push(
      { position: 0, energy: 40 },
      { position: 0.5, energy: 50 },
      { position: 1, energy: 40 }
    );
  } else {
    // Standard arc
    energyArc.push(
      { position: 0, energy: 40 },
      { position: 0.25, energy: 60 },
      { position: 0.5, energy: 80 },
      { position: 0.75, energy: 100 },
      { position: 1, energy: 70 }
    );
  }

  // Determine instrumentation hints
  const instrumentation: string[] = [];
  for (const genre of brief.genres) {
    const lower = genre.toLowerCase();
    if (lower.includes("techno") || lower.includes("house")) {
      instrumentation.push("kick", "snare", "hi-hat", "bass", "synth lead", "pad");
    } else if (lower.includes("ambient")) {
      instrumentation.push("pad", "texture", "field recording", "reverb send");
    } else if (lower.includes("hiphop") || lower.includes("trap")) {
      instrumentation.push("808 kick", "snare", "hi-hat", "bass", "sample chops");
    } else {
      instrumentation.push("drums", "bass", "lead", "pad");
    }
  }

  // Determine mix aesthetic
  let mixAesthetic = "balanced";
  if (moodLower.some((m) => m.includes("dark") || m.includes("heavy"))) {
    mixAesthetic = "bass-heavy, dark";
  } else if (moodLower.some((m) => m.includes("bright") || m.includes("airy"))) {
    mixAesthetic = "bright, spacious";
  } else if (moodLower.some((m) => m.includes("warm") || m.includes("analog"))) {
    mixAesthetic = "warm, analog";
  }

  return {
    tempoRange: { min: minTempo, max: maxTempo },
    energyArc,
    instrumentation: [...new Set(instrumentation)],
    mixAesthetic,
    structuralConstraints: {
      minSections: 4,
      maxSections: 12,
      requireIntro: true,
      requireOutro: true,
    },
  };
}

/**
 * Tool schema for brief ingestion
 */
const IngestBriefInputSchema = z.object({
  genres: z.array(z.string()).describe("Music genres (e.g., ['techno', 'ambient'])"),
  mood: z.array(z.string()).describe("Mood descriptors (e.g., ['dark', 'driving', 'hypnotic'])"),
  references: z.array(z.string()).optional().describe("Reference tracks or artists"),
  useCase: z.string().optional().describe("Use case (e.g., 'club', 'meditation', 'workout')"),
  targetDurationBars: z.number().optional().describe("Target length in bars (default 128)"),
  mustInclude: z.array(z.string()).optional().describe("Elements that must be included"),
  mustAvoid: z.array(z.string()).optional().describe("Elements to avoid"),
});

/**
 * Tool for ingesting a production brief
 */
export const workflowIngestBrief = tool(
  async (input): Promise<{ brief: ProductionBrief; spec: ProductionSpec }> => {
    const brief = parseBrief(input);
    const spec = deriveProductionSpec(brief);

    return { brief, spec };
  },
  {
    name: "workflowIngestBrief",
    description:
      "Ingest a music production brief and derive production specifications. " +
      "Use this at the start of a new production to capture the user's intent.",
    schema: IngestBriefInputSchema,
  }
);

/**
 * Tool schema for locking intent
 */
const LockIntentInputSchema = z.object({
  brief: ProductionBriefSchema.describe("The production brief to lock"),
  spec: ProductionSpecSchema.describe("The production spec to lock"),
  confirmed: z.boolean().describe("Whether the user has confirmed the brief/spec"),
});

/**
 * Tool for locking the production intent
 */
export const workflowLockIntent = tool(
  async (input): Promise<{ locked: boolean; summary: string }> => {
    if (!input.confirmed) {
      return {
        locked: false,
        summary: "Intent not confirmed. Please review and confirm the brief.",
      };
    }

    const summary =
      `Locked production intent:\n` +
      `- Genres: ${input.brief.genres.join(", ")}\n` +
      `- Mood: ${input.brief.mood.join(", ")}\n` +
      `- Tempo: ${input.spec.tempoRange.min}-${input.spec.tempoRange.max} BPM\n` +
      `- Duration: ${input.brief.targetDurationBars} bars\n` +
      `- Mix: ${input.spec.mixAesthetic}`;

    return { locked: true, summary };
  },
  {
    name: "workflowLockIntent",
    description:
      "Lock the production intent after user confirmation. " +
      "This finalizes the brief and spec for the production workflow.",
    schema: LockIntentInputSchema,
  }
);

// Export all stage 1 tools
export const stage1Tools = [workflowIngestBrief, workflowLockIntent];
