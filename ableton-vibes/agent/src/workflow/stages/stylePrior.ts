/**
 * Stage 2: Build Style Prior
 *
 * Tools for building style priors from production specs
 */

import { z } from "zod";
import { tool } from "@langchain/core/tools";
import {
  ProductionBriefSchema,
  ProductionSpecSchema,
  StylePriorSchema,
  type ProductionBrief,
  type ProductionSpec,
  type StylePrior,
} from "../types";
import { GENRE_TEMPO_RANGES } from "../utils/rhythmUtils";

/**
 * Build a style prior from production brief and spec
 */
export function buildStylePrior(brief: ProductionBrief, spec: ProductionSpec): StylePrior {
  // Determine BPM signature
  const typicalTempo = Math.round((spec.tempoRange.min + spec.tempoRange.max) / 2);
  const variance = Math.round((spec.tempoRange.max - spec.tempoRange.min) / 4);

  // Determine swing profile based on genre
  const genresLower = brief.genres.map((g) => g.toLowerCase());
  let swingAmount = 0;
  let swingSubdivision: "8th" | "16th" = "8th";

  if (genresLower.some((g) => g.includes("house") || g.includes("garage"))) {
    swingAmount = 15;
    swingSubdivision = "8th";
  } else if (genresLower.some((g) => g.includes("hiphop") || g.includes("hip-hop"))) {
    swingAmount = 30;
    swingSubdivision = "16th";
  } else if (genresLower.some((g) => g.includes("jazz") || g.includes("soul"))) {
    swingAmount = 40;
    swingSubdivision = "8th";
  } else if (genresLower.some((g) => g.includes("techno") || g.includes("trance"))) {
    swingAmount = 0; // Straight feel
  }

  // Determine sound design traits
  const soundDesignTraits: string[] = [];
  const moodLower = brief.mood.map((m) => m.toLowerCase());

  if (moodLower.some((m) => m.includes("dark"))) {
    soundDesignTraits.push("low-passed", "distorted", "detuned");
  }
  if (moodLower.some((m) => m.includes("bright") || m.includes("airy"))) {
    soundDesignTraits.push("high-passed", "reverberant", "shimmering");
  }
  if (moodLower.some((m) => m.includes("aggressive") || m.includes("heavy"))) {
    soundDesignTraits.push("saturated", "compressed", "punchy");
  }
  if (moodLower.some((m) => m.includes("ambient") || m.includes("ethereal"))) {
    soundDesignTraits.push("evolving", "padded", "atmospheric");
  }
  if (moodLower.some((m) => m.includes("minimal"))) {
    soundDesignTraits.push("sparse", "clean", "focused");
  }

  // Add genre-specific traits
  if (genresLower.some((g) => g.includes("techno"))) {
    soundDesignTraits.push("industrial", "mechanical", "hypnotic");
  }
  if (genresLower.some((g) => g.includes("house"))) {
    soundDesignTraits.push("groovy", "warm", "soulful");
  }
  if (genresLower.some((g) => g.includes("trance"))) {
    soundDesignTraits.push("euphoric", "layered", "resonant");
  }

  // Determine arrangement norms
  let typicalIntroLength = 16;
  let typicalDropLength = 32;
  let typicalBreakdownLength = 16;
  const transitionStyle: string[] = ["riser", "drum fill"];

  if (genresLower.some((g) => g.includes("techno"))) {
    typicalIntroLength = 32;
    typicalDropLength = 64;
    typicalBreakdownLength = 32;
    transitionStyle.push("filter sweep", "gradual build");
  } else if (genresLower.some((g) => g.includes("trance"))) {
    typicalIntroLength = 32;
    typicalDropLength = 32;
    typicalBreakdownLength = 32;
    transitionStyle.push("epic riser", "reverse crash");
  } else if (genresLower.some((g) => g.includes("house"))) {
    typicalIntroLength = 16;
    typicalDropLength = 32;
    typicalBreakdownLength = 16;
    transitionStyle.push("snare roll", "vocal chop");
  } else if (genresLower.some((g) => g.includes("dnb"))) {
    typicalIntroLength = 16;
    typicalDropLength = 32;
    typicalBreakdownLength = 16;
    transitionStyle.push("reese bass", "amen break");
  }

  // Determine energy profile and cliches to avoid
  let energyProfile = "balanced";
  const avoidCliches: string[] = [...(brief.rules?.mustNot || [])];

  if (moodLower.some((m) => m.includes("driving"))) {
    energyProfile = "driving " + brief.genres[0];
  } else if (moodLower.some((m) => m.includes("chill") || m.includes("ambient"))) {
    energyProfile = "ambient " + brief.genres[0];
  } else if (moodLower.some((m) => m.includes("dark"))) {
    energyProfile = "dark " + brief.genres[0];
  } else if (moodLower.some((m) => m.includes("uplifting") || m.includes("euphoric"))) {
    energyProfile = "uplifting " + brief.genres[0];
  } else {
    energyProfile = brief.genres.join(" ");
  }

  return {
    bpmSignature: {
      typical: typicalTempo,
      variance,
    },
    swingProfile: {
      amount: swingAmount,
      subdivision: swingSubdivision,
    },
    soundDesignTraits: [...new Set(soundDesignTraits)],
    arrangementNorms: {
      typicalIntroLength,
      typicalDropLength,
      typicalBreakdownLength,
      transitionStyle,
    },
    guardrails: {
      energyProfile,
      avoidCliches,
    },
  };
}

/**
 * Tool schema for building style prior
 */
const BuildStylePriorInputSchema = z.object({
  brief: ProductionBriefSchema.describe("The production brief"),
  spec: ProductionSpecSchema.describe("The production spec"),
});

/**
 * Tool for building a style prior
 */
export const workflowBuildStylePrior = tool(
  async (input): Promise<StylePrior> => {
    return buildStylePrior(input.brief, input.spec);
  },
  {
    name: "workflowBuildStylePrior",
    description:
      "Build a style prior from the production brief and spec. " +
      "This captures genre-specific conventions, swing profiles, sound design traits, " +
      "and arrangement norms to guide the production.",
    schema: BuildStylePriorInputSchema,
  }
);

// Export all stage 2 tools
export const stage2Tools = [workflowBuildStylePrior];
