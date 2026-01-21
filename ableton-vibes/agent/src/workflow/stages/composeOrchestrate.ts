/**
 * Stage 7: Compose & Orchestrate Per Section
 *
 * Tools for composing sections, orchestrating voices, and scoring compositions
 */

import { z } from "zod";
import { tool } from "@langchain/core/tools";
import {
  ArrangementSectionSchema,
  MotifSeedSchema,
  HarmonyProgressionSchema,
  VoiceSchema,
  type ArrangementSection,
  type SectionComposition,
  type Voice,
  type MotifSeed,
  type MotifNote,
  type HarmonyProgression,
  type CompositionScore,
} from "../types";
import { calculateCompositionScore } from "../scoring/coherence";
import { varyMotif } from "../generators/motif";
import { generateProgressionFromTemplate, PROGRESSION_TEMPLATES } from "../generators/harmony";

/**
 * Generate voice notes from motif and section parameters
 */
function generateVoiceFromMotif(
  motif: MotifSeed,
  section: ArrangementSection,
  role: Voice["role"]
): Voice {
  // Repeat motif to fill section
  const notes: MotifNote[] = [];
  const barsToFill = section.lengthBars;
  const motifLengthBars = motif.lengthBars;
  const repetitions = Math.ceil(barsToFill / motifLengthBars);

  for (let rep = 0; rep < repetitions; rep++) {
    const offset = rep * motifLengthBars * 4; // 4 beats per bar
    for (const note of motif.notes) {
      const newNote = { ...note, time: note.time + offset };
      // Only include if within section bounds
      if (newNote.time < barsToFill * 4) {
        notes.push(newNote);
      }
    }
  }

  return {
    role,
    trackName: `${role}-${section.id}`,
    clipName: `${motif.name}-${section.name}`,
    notes,
  };
}

/**
 * Calculate density level based on energy
 */
function densityFromEnergy(energy: number): number {
  if (energy < 30) return 2;
  if (energy < 50) return 4;
  if (energy < 70) return 6;
  if (energy < 85) return 8;
  return 10;
}

/**
 * Generate register distribution from voices
 */
function analyzeRegisterDistribution(voices: Voice[]): Record<string, number> {
  const distribution: Record<string, number> = {
    sub: 0,
    bass: 0,
    low: 0,
    mid: 0,
    high: 0,
  };

  for (const voice of voices) {
    if (voice.notes.length === 0) continue;

    const avgPitch = voice.notes.reduce((sum, n) => sum + n.pitch, 0) / voice.notes.length;

    if (avgPitch < 40) distribution.sub++;
    else if (avgPitch < 55) distribution.bass++;
    else if (avgPitch < 65) distribution.low++;
    else if (avgPitch < 80) distribution.mid++;
    else distribution.high++;
  }

  return distribution;
}

/**
 * Tool schema for composing a section
 */
const ComposeSectionInputSchema = z.object({
  section: ArrangementSectionSchema.describe("The section to compose"),
  motifs: z.array(MotifSeedSchema).describe("Available motifs to use"),
  key: z.string().optional().describe("Musical key (default C)"),
  chordProgression: z.string().optional().describe("Chord progression template name"),
});

/**
 * Tool for composing a single section
 */
export const workflowComposeSection = tool(
  async (input): Promise<SectionComposition> => {
    const { section, motifs } = input;
    const key = input.key || "C";
    const voices: Voice[] = [];

    // Select motifs based on section energy and type
    const melodicMotifs = motifs.filter((m) => m.type === "melodic");
    const rhythmicMotifs = motifs.filter((m) => m.type === "rhythmic");
    const harmonicMotifs = motifs.filter((m) => m.type === "harmonic");
    const texturalMotifs = motifs.filter((m) => m.type === "textural");

    // Always add bass for high energy sections
    if (section.energyLevel >= 40 && rhythmicMotifs.length > 0) {
      const bassMotif = rhythmicMotifs[0]!;
      voices.push(generateVoiceFromMotif(bassMotif, section, "bass"));
    }

    // Add lead/topline for verse and drop sections
    if (melodicMotifs.length > 0 && (section.type === "verse" || section.type === "drop")) {
      const leadMotif = melodicMotifs[0]!;
      voices.push(generateVoiceFromMotif(leadMotif, section, "topline"));
    }

    // Add harmony for breakdown sections
    if (harmonicMotifs.length > 0 && section.type === "breakdown") {
      const harmonyMotif = harmonicMotifs[0]!;
      voices.push(generateVoiceFromMotif(harmonyMotif, section, "harmony"));
    }

    // Add pad for atmospheric sections
    if (texturalMotifs.length > 0 && section.energyLevel >= 30) {
      const padMotif = texturalMotifs[0]!;
      voices.push(generateVoiceFromMotif(padMotif, section, "pad"));
    }

    // Add rhythm for most sections
    if (rhythmicMotifs.length > 0 && section.energyLevel >= 20) {
      const rhythmMotif = rhythmicMotifs[Math.min(1, rhythmicMotifs.length - 1)]!;
      voices.push(generateVoiceFromMotif(rhythmMotif, section, "rhythm"));
    }

    // Generate harmony progression
    let harmonyProgression: HarmonyProgression[] = [];
    if (input.chordProgression && PROGRESSION_TEMPLATES[input.chordProgression]) {
      harmonyProgression = generateProgressionFromTemplate(
        input.chordProgression,
        key,
        "minor",
        4
      );
    } else {
      // Default progression
      harmonyProgression = [
        { startBeat: 0, chord: `${key}min`, duration: 4 },
        { startBeat: 4, chord: `${key}min`, duration: 4 },
      ];
    }

    // Calculate density level
    const densityLevel = densityFromEnergy(section.energyLevel);

    // Analyze register distribution
    const registerDistribution = analyzeRegisterDistribution(voices);

    return {
      sectionId: section.id,
      voices,
      harmonyProgression,
      densityLevel,
      registerDistribution,
    };
  },
  {
    name: "workflowComposeSection",
    description:
      "Compose a single section using available motifs. " +
      "Assigns motifs to voices based on section type and energy level.",
    schema: ComposeSectionInputSchema,
  }
);

/**
 * Tool schema for scoring composition
 */
const ScoreCompositionInputSchema = z.object({
  composition: z.object({
    sectionId: z.string(),
    voices: z.array(VoiceSchema),
    harmonyProgression: z.array(HarmonyProgressionSchema),
    densityLevel: z.number(),
    registerDistribution: z.record(z.number()),
  }).describe("The composition to score"),
  section: ArrangementSectionSchema.describe("The section for context"),
});

/**
 * Tool for scoring a composition
 */
export const workflowScoreComposition = tool(
  async (input): Promise<CompositionScore> => {
    return calculateCompositionScore(input.composition, input.section);
  },
  {
    name: "workflowScoreComposition",
    description:
      "Score a section composition for voice leading, density, register collisions, and harmonic clarity. " +
      "Returns detailed coherence metrics.",
    schema: ScoreCompositionInputSchema,
  }
);

/**
 * Tool schema for composing all sections
 */
const ComposeAllSectionsInputSchema = z.object({
  sections: z.array(ArrangementSectionSchema).describe("All sections to compose"),
  motifs: z.array(MotifSeedSchema).describe("Available motifs"),
  key: z.string().optional().describe("Musical key"),
});

/**
 * Tool for composing all sections at once
 */
export const workflowComposeAllSections = tool(
  async (input): Promise<{
    compositions: SectionComposition[];
    scores: CompositionScore[];
    overallCoherence: number;
  }> => {
    const compositions: SectionComposition[] = [];
    const scores: CompositionScore[] = [];

    const key = input.key || "C";

    for (const section of input.sections) {
      // Compose each section
      const composeTool = workflowComposeSection;
      const composition = await composeTool.invoke({
        section,
        motifs: input.motifs,
        key,
      });

      compositions.push(composition);

      // Score the composition
      const score = calculateCompositionScore(composition, section);
      scores.push(score);
    }

    // Calculate overall coherence
    const overallCoherence =
      scores.length > 0
        ? Math.round(scores.reduce((sum, s) => sum + s.overall, 0) / scores.length)
        : 0;

    return {
      compositions,
      scores,
      overallCoherence,
    };
  },
  {
    name: "workflowComposeAllSections",
    description:
      "Compose all sections in the arrangement at once. " +
      "Returns compositions, scores, and overall coherence metric.",
    schema: ComposeAllSectionsInputSchema,
  }
);

// Export all stage 7 tools
export const stage7Tools = [
  workflowComposeSection,
  workflowScoreComposition,
  workflowComposeAllSections,
];
