/**
 * Stage 4: Assemble Palette & Sound Bank
 *
 * Tools for assembling a sound palette and validating frequency coverage
 */

import { z } from "zod";
import { tool } from "@langchain/core/tools";
import {
  StylePriorSchema,
  ProductionSpecSchema,
  PaletteEntrySchema,
  type StylePrior,
  type ProductionSpec,
  type SoundPalette,
  type PaletteEntry,
} from "../types";

/**
 * Frequency band definitions
 */
const FREQUENCY_BANDS = {
  sub: { low: 20, high: 80, name: "Sub Bass" },
  bass: { low: 60, high: 250, name: "Bass" },
  lowMid: { low: 200, high: 500, name: "Low Mids" },
  mid: { low: 400, high: 2000, name: "Mids" },
  highMid: { low: 2000, high: 6000, name: "High Mids" },
  presence: { low: 4000, high: 8000, name: "Presence" },
  air: { low: 8000, high: 20000, name: "Air" },
};

/**
 * Generate sound palette entries based on style and spec
 */
export function generatePaletteEntries(
  stylePrior: StylePrior,
  spec: ProductionSpec
): PaletteEntry[] {
  const entries: PaletteEntry[] = [];
  const genreKeywords = stylePrior.guardrails.energyProfile.toLowerCase();

  // Always include drums
  entries.push({
    id: "kick-1",
    name: "Kick Drum",
    role: "sub",
    type: "sample",
    frequencyRange: FREQUENCY_BANDS.sub,
    characteristics: ["punchy", "tight"],
    processingHints: ["EQ low end", "compression"],
  });

  entries.push({
    id: "snare-1",
    name: "Snare/Clap",
    role: "mid",
    type: "sample",
    frequencyRange: FREQUENCY_BANDS.mid,
    characteristics: ["snappy", "present"],
    processingHints: ["transient shaping", "reverb send"],
  });

  entries.push({
    id: "hihat-1",
    name: "Hi-Hat",
    role: "highMid",
    type: "sample",
    frequencyRange: FREQUENCY_BANDS.highMid,
    characteristics: ["crisp", "bright"],
    processingHints: ["high-pass filter"],
  });

  // Bass based on genre
  if (genreKeywords.includes("house") || genreKeywords.includes("techno")) {
    entries.push({
      id: "bass-1",
      name: "Synth Bass",
      role: "bass",
      type: "synth",
      frequencyRange: FREQUENCY_BANDS.bass,
      characteristics: ["warm", "subby"],
      processingHints: ["saturation", "side-chain compression"],
    });
  } else if (genreKeywords.includes("dnb") || genreKeywords.includes("dubstep")) {
    entries.push({
      id: "bass-1",
      name: "Reese Bass",
      role: "bass",
      type: "synth",
      frequencyRange: { low: 40, high: 500 },
      characteristics: ["growling", "distorted"],
      processingHints: ["heavy saturation", "band splitting"],
    });
  } else {
    entries.push({
      id: "bass-1",
      name: "Bass",
      role: "bass",
      type: "synth",
      frequencyRange: FREQUENCY_BANDS.bass,
      characteristics: ["solid", "foundational"],
      processingHints: ["compression", "EQ"],
    });
  }

  // Lead synth
  entries.push({
    id: "lead-1",
    name: "Lead Synth",
    role: "presence",
    type: "synth",
    frequencyRange: FREQUENCY_BANDS.presence,
    characteristics: ["bright", "cutting"],
    processingHints: ["delay", "chorus"],
  });

  // Pad for texture
  entries.push({
    id: "pad-1",
    name: "Pad",
    role: "lowMid",
    type: "synth",
    frequencyRange: FREQUENCY_BANDS.lowMid,
    characteristics: ["warm", "evolving"],
    processingHints: ["reverb", "slow attack"],
  });

  // Add genre-specific elements
  if (genreKeywords.includes("trance")) {
    entries.push({
      id: "supersaw-1",
      name: "Supersaw",
      role: "mid",
      type: "synth",
      frequencyRange: { low: 300, high: 8000 },
      characteristics: ["layered", "bright", "wide"],
      processingHints: ["stereo widening", "reverb"],
    });
  }

  if (genreKeywords.includes("ambient")) {
    entries.push({
      id: "texture-1",
      name: "Ambient Texture",
      role: "air",
      type: "sample",
      frequencyRange: FREQUENCY_BANDS.air,
      characteristics: ["ethereal", "evolving"],
      processingHints: ["heavy reverb", "granular processing"],
    });
  }

  // Add air/presence element
  entries.push({
    id: "air-1",
    name: "Shimmer/Air",
    role: "air",
    type: "synth",
    frequencyRange: FREQUENCY_BANDS.air,
    characteristics: ["bright", "airy"],
    processingHints: ["high-pass", "reverb"],
  });

  return entries;
}

/**
 * Calculate frequency coverage by role
 */
export function calculateCoverage(entries: PaletteEntry[]): Record<string, number> {
  const coverage: Record<string, number> = {
    sub: 0,
    bass: 0,
    lowMid: 0,
    mid: 0,
    highMid: 0,
    presence: 0,
    air: 0,
  };

  for (const entry of entries) {
    if (coverage[entry.role] !== undefined) {
      coverage[entry.role]++;
    }
  }

  return coverage;
}

/**
 * Validate palette coverage
 */
export function validatePaletteCoverage(palette: SoundPalette): {
  isValid: boolean;
  missingRoles: string[];
  warnings: string[];
} {
  const coverage = calculateCoverage(palette.entries);
  const missingRoles: string[] = [];
  const warnings: string[] = [];

  // Check essential coverage
  const essentialRoles = ["sub", "bass", "mid", "highMid"];
  for (const role of essentialRoles) {
    if (!coverage[role]) {
      missingRoles.push(role);
    }
  }

  // Warnings for potentially thin areas
  if (!coverage.air) {
    warnings.push("No air/shimmer elements - mix may lack sparkle");
  }
  if (!coverage.lowMid) {
    warnings.push("No low-mid elements - may lack warmth");
  }

  // Check for too many elements in same range (masking risk)
  for (const [role, count] of Object.entries(coverage)) {
    if (count > 3) {
      warnings.push(`${count} elements in ${role} range - potential frequency masking`);
    }
  }

  // Check max elements
  if (palette.entries.length > palette.maxElements) {
    warnings.push(`Palette has ${palette.entries.length} elements, exceeding max of ${palette.maxElements}`);
  }

  return {
    isValid: missingRoles.length === 0,
    missingRoles,
    warnings,
  };
}

/**
 * Tool schema for assembling palette
 */
const AssemblePaletteInputSchema = z.object({
  stylePrior: StylePriorSchema.describe("The style prior"),
  spec: ProductionSpecSchema.describe("The production spec"),
  maxElements: z.number().optional().describe("Maximum palette elements (default 12)"),
});

/**
 * Tool for assembling a sound palette
 */
export const workflowAssemblePalette = tool(
  async (input): Promise<SoundPalette> => {
    const entries = generatePaletteEntries(input.stylePrior, input.spec);
    const maxElements = input.maxElements || 12;
    const coverage = calculateCoverage(entries);

    // Collect forbidden elements from style prior
    const forbidden = input.stylePrior.guardrails.avoidCliches || [];

    return {
      maxElements,
      entries: entries.slice(0, maxElements),
      coverageByRole: coverage,
      forbidden,
    };
  },
  {
    name: "workflowAssemblePalette",
    description:
      "Assemble a sound palette based on the style prior and production spec. " +
      "Creates a collection of sound design elements covering the frequency spectrum.",
    schema: AssemblePaletteInputSchema,
  }
);

/**
 * Tool schema for validating palette
 */
const ValidatePaletteInputSchema = z.object({
  palette: z.object({
    maxElements: z.number(),
    entries: z.array(PaletteEntrySchema),
    coverageByRole: z.record(z.number()),
    forbidden: z.array(z.string()),
  }).describe("The sound palette to validate"),
});

/**
 * Tool for validating palette coverage
 */
export const workflowValidatePaletteCoverage = tool(
  async (input): Promise<{ isValid: boolean; missingRoles: string[]; warnings: string[] }> => {
    return validatePaletteCoverage(input.palette);
  },
  {
    name: "workflowValidatePaletteCoverage",
    description:
      "Validate that the sound palette has adequate frequency coverage. " +
      "Returns validation status, missing roles, and any warnings.",
    schema: ValidatePaletteInputSchema,
  }
);

// Export all stage 4 tools
export const stage4Tools = [workflowAssemblePalette, workflowValidatePaletteCoverage];
