/**
 * Stage 6: Draft Macro-Structure
 *
 * Tools for drafting arrangement structure and validating energy curves
 */

import { z } from "zod";
import { tool } from "@langchain/core/tools";
import {
  StylePriorSchema,
  ProductionBriefSchema,
  ProductionSpecSchema,
  ArrangementSectionSchema,
  type StylePrior,
  type ProductionBrief,
  type ProductionSpec,
  type MacroStructure,
  type ArrangementSection,
} from "../types";
import {
  generateMacroStructure,
  suggestArchetypeForGenre,
  scoreEnergyCurveSmoothness,
  validateStructure,
  ARCHETYPE_STRUCTURES,
} from "../utils/structureTemplates";

/**
 * Tool schema for drafting macro structure
 */
const DraftMacroStructureInputSchema = z.object({
  brief: ProductionBriefSchema.describe("The production brief"),
  spec: ProductionSpecSchema.describe("The production spec"),
  stylePrior: StylePriorSchema.describe("The style prior"),
  archetype: z
    .enum(Object.keys(ARCHETYPE_STRUCTURES) as [string, ...string[]])
    .optional()
    .describe("Structure archetype (auto-detected if not provided)"),
});

/**
 * Tool for drafting the macro structure
 */
export const workflowDraftMacroStructure = tool(
  async (input): Promise<MacroStructure> => {
    // Auto-detect archetype from genre if not provided
    const archetype = input.archetype || suggestArchetypeForGenre(input.brief.genres[0] || "edm");

    const structure = generateMacroStructure(
      archetype as keyof typeof ARCHETYPE_STRUCTURES,
      { totalBars: input.brief.targetDurationBars }
    );

    // Apply energy arc from spec
    const energyCurve = input.spec.energyArc.map((point) => ({
      bar: Math.round(point.position * structure.totalBars),
      energy: point.energy,
    }));

    // Identify key moments (highest energy points)
    const keyMoments = energyCurve
      .filter((point) => point.energy >= 80)
      .map((point) => ({
        bar: point.bar,
        description: point.energy >= 90 ? "Peak moment" : "High energy section",
      }));

    return {
      ...structure,
      energyCurve,
      keyMoments,
    };
  },
  {
    name: "workflowDraftMacroStructure",
    description:
      "Draft the macro-structure of the arrangement. " +
      "Creates sections (intro, verse, drop, breakdown, etc.) based on the genre archetype.",
    schema: DraftMacroStructureInputSchema,
  }
);

/**
 * Tool schema for validating energy curve
 */
const ValidateEnergyCurveInputSchema = z.object({
  structure: z.object({
    archetype: z.string(),
    totalBars: z.number(),
    sections: z.array(ArrangementSectionSchema),
    energyCurve: z.array(z.object({ bar: z.number(), energy: z.number() })),
    keyMoments: z.array(z.object({ bar: z.number(), description: z.string() })),
  }).describe("The macro structure to validate"),
});

/**
 * Tool for validating the energy curve
 */
export const workflowValidateEnergyCurve = tool(
  async (input): Promise<{
    isValid: boolean;
    smoothnessScore: number;
    warnings: string[];
    suggestions: string[];
  }> => {
    const { structure } = input;
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Calculate smoothness score
    const smoothnessScore = scoreEnergyCurveSmoothness(
      structure.sections.map((s) => ({ bar: s.startBar, energy: s.energyLevel }))
    );

    // Check for abrupt energy changes
    for (let i = 1; i < structure.sections.length; i++) {
      const prev = structure.sections[i - 1]!;
      const curr = structure.sections[i]!;
      const energyDiff = Math.abs(curr.energyLevel - prev.energyLevel);

      if (energyDiff > 40) {
        warnings.push(
          `Large energy jump (${energyDiff}) between ${prev.name} and ${curr.name}`
        );
        suggestions.push(
          `Consider adding a transition section or adjusting energy levels`
        );
      }
    }

    // Validate structure integrity
    const validation = validateStructure(structure, {});
    if (!validation.valid) {
      warnings.push(...validation.issues);
    }

    // Check for key moments
    if (structure.keyMoments.length === 0) {
      suggestions.push("No peak moments identified - consider adding a climax section");
    }

    // Check energy variety
    const energyLevels = structure.sections.map((s) => s.energyLevel);
    const minEnergy = Math.min(...energyLevels);
    const maxEnergy = Math.max(...energyLevels);
    const energyRange = maxEnergy - minEnergy;

    if (energyRange < 30) {
      warnings.push("Limited energy dynamic range may result in flat arrangement");
      suggestions.push("Add more contrast between sections");
    }

    return {
      isValid: warnings.length === 0 && smoothnessScore >= 60,
      smoothnessScore,
      warnings,
      suggestions,
    };
  },
  {
    name: "workflowValidateEnergyCurve",
    description:
      "Validate the energy curve of the arrangement. " +
      "Checks for smooth transitions, proper dynamic range, and key moments.",
    schema: ValidateEnergyCurveInputSchema,
  }
);

/**
 * Tool schema for adjusting section
 */
const AdjustSectionInputSchema = z.object({
  structure: z.object({
    archetype: z.string(),
    totalBars: z.number(),
    sections: z.array(ArrangementSectionSchema),
    energyCurve: z.array(z.object({ bar: z.number(), energy: z.number() })),
    keyMoments: z.array(z.object({ bar: z.number(), description: z.string() })),
  }).describe("The current macro structure"),
  sectionId: z.string().describe("ID of the section to adjust"),
  changes: z.object({
    lengthBars: z.number().optional(),
    energyLevel: z.number().optional(),
    name: z.string().optional(),
  }).describe("Changes to apply to the section"),
});

/**
 * Tool for adjusting a section in the structure
 */
export const workflowAdjustSection = tool(
  async (input): Promise<MacroStructure> => {
    const { structure, sectionId, changes } = input;

    const updatedSections = structure.sections.map((section) => {
      if (section.id !== sectionId) return section;

      const updated = { ...section };
      if (changes.lengthBars !== undefined) updated.lengthBars = changes.lengthBars;
      if (changes.energyLevel !== undefined) updated.energyLevel = changes.energyLevel;
      if (changes.name !== undefined) updated.name = changes.name;

      return updated;
    });

    // Recalculate start bars
    let currentBar = 0;
    for (const section of updatedSections) {
      section.startBar = currentBar;
      currentBar += section.lengthBars;
    }

    // Update total bars
    const totalBars = updatedSections.reduce((sum, s) => sum + s.lengthBars, 0);

    // Update energy curve
    const energyCurve = updatedSections.map((s) => ({
      bar: s.startBar,
      energy: s.energyLevel,
    }));

    return {
      archetype: structure.archetype,
      totalBars,
      sections: updatedSections,
      energyCurve,
      keyMoments: structure.keyMoments,
    };
  },
  {
    name: "workflowAdjustSection",
    description:
      "Adjust a specific section in the macro structure. " +
      "Can change length, energy level, or name of a section.",
    schema: AdjustSectionInputSchema,
  }
);

// Export all stage 6 tools
export const stage6Tools = [
  workflowDraftMacroStructure,
  workflowValidateEnergyCurve,
  workflowAdjustSection,
];
