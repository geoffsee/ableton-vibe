/**
 * Rhythm generators
 * Generate rhythm patterns for various musical contexts
 */

import type { MotifNote, StylePrior } from "../types";
import { euclideanRhythm, applySwing, humanizeVelocity, rotatePattern as rotatePatternUtil } from "../utils/rhythmUtils";

/**
 * Represents a rhythm pattern with steps and accents
 */
export interface RhythmPattern {
  steps: number[];      // Which steps have hits (0-15 for 16th notes)
  accents: number[];    // Which steps are accented
  subdivision: number;  // Duration of each step in beats (0.25 = 16th note)
  length: number;       // Total steps in the pattern
}

/**
 * Generate a basic pulse pattern
 */
export function generatePulsePattern(
  notesPerBar: 4 | 8 | 16 = 8,
  bars: number = 1
): RhythmPattern {
  const step = 16 / notesPerBar;
  const totalSteps = 16 * bars;
  const steps: number[] = [];

  for (let i = 0; i < totalSteps; i += step) {
    steps.push(i);
  }

  // Accent every quarter note
  const accents = steps.filter((s) => s % 4 === 0);

  return {
    steps,
    accents,
    subdivision: 0.25,
    length: totalSteps,
  };
}

/**
 * Generate an offbeat pattern (hits on the "and" of each beat)
 */
export function generateOffbeatPattern(
  bars: number = 1
): RhythmPattern {
  const steps: number[] = [];
  const totalSteps = 16 * bars;

  for (let i = 2; i < totalSteps; i += 4) {
    steps.push(i);
  }

  return {
    steps,
    accents: [],
    subdivision: 0.25,
    length: totalSteps,
  };
}

/**
 * Generate a syncopated pattern
 */
export function generateSyncopatedPattern(
  density: "light" | "medium" | "heavy" = "medium"
): RhythmPattern {
  const patterns: Record<string, number[]> = {
    light: [0, 3, 6, 10], // Minimal syncopation
    medium: [0, 3, 6, 9, 11, 14], // Moderate syncopation
    heavy: [0, 2, 5, 7, 9, 11, 13, 15], // Heavy syncopation
  };

  const steps = patterns[density]!;
  const accents = steps.filter((_, i) => i % 2 === 0);

  return {
    steps,
    accents,
    subdivision: 0.25,
    length: 16,
  };
}

/**
 * Generate a euclidean rhythm pattern
 */
export function generateEuclideanPattern(
  hits: number,
  steps: number = 16,
  rotation: number = 0
): RhythmPattern {
  const pattern = euclideanRhythm(hits, steps, rotation);

  return {
    steps: pattern,
    accents: [pattern[0]!], // Accent first hit
    subdivision: 0.25,
    length: steps,
  };
}

/**
 * Generate a clave pattern (3-2 or 2-3)
 */
export function generateClavePattern(
  variant: "3-2" | "2-3" | "rumba" = "3-2"
): RhythmPattern {
  const patterns: Record<string, number[]> = {
    "3-2": [0, 3, 7, 12, 14], // Son clave 3-2
    "2-3": [0, 4, 6, 10, 12], // Son clave 2-3
    rumba: [0, 3, 7, 10, 12], // Rumba clave
  };

  return {
    steps: patterns[variant]!,
    accents: [0, 12], // Accent downbeats
    subdivision: 0.25,
    length: 16,
  };
}

/**
 * Generate a tresillo pattern (fundamental Latin rhythm)
 */
export function generateTresilloPattern(): RhythmPattern {
  return {
    steps: [0, 3, 6, 8, 11, 14], // Tresillo over 2 beats, repeated
    accents: [0, 8],
    subdivision: 0.25,
    length: 16,
  };
}

/**
 * Generate a shuffle/triplet feel pattern
 */
export function generateShufflePattern(
  intensity: "light" | "full" = "full"
): RhythmPattern {
  // Shuffle uses triplet subdivisions
  // In 16th note grid, this means hits on 0, 3, 4, 7, 8, 11, 12, 15
  // (skipping the second 16th of each triplet group)
  const fullShuffle = [0, 3, 4, 7, 8, 11, 12, 15];
  const lightShuffle = [0, 3, 8, 11]; // Just the swung notes

  return {
    steps: intensity === "full" ? fullShuffle : lightShuffle,
    accents: [0, 4, 8, 12],
    subdivision: 0.25,
    length: 16,
  };
}

/**
 * Generate a polyrhythmic pattern
 */
export function generatePolyrhythm(
  ratio: "3:4" | "5:4" | "7:4" | "3:2" = "3:4"
): { pattern1: RhythmPattern; pattern2: RhythmPattern } {
  const [a, b] = ratio.split(":").map(Number) as [number, number];

  // Generate both patterns using euclidean distribution
  const pattern1 = generateEuclideanPattern(a, 16);
  const pattern2 = generateEuclideanPattern(b, 16);

  return {
    pattern1: {
      ...pattern1,
      accents: [pattern1.steps[0]!],
    },
    pattern2: {
      ...pattern2,
      accents: [pattern2.steps[0]!],
    },
  };
}

/**
 * Convert a rhythm pattern to MIDI notes
 */
export function patternToNotes(
  pattern: RhythmPattern,
  pitch: number = 60,
  baseVelocity: number = 90,
  accentVelocity: number = 110,
  noteDuration?: number
): MotifNote[] {
  const duration = noteDuration || pattern.subdivision;

  return pattern.steps.map((step) => ({
    pitch,
    time: step * pattern.subdivision,
    duration,
    velocity: pattern.accents.includes(step) ? accentVelocity : baseVelocity,
  }));
}

/**
 * Apply humanization to rhythm notes
 */
export function humanizeRhythm(
  notes: MotifNote[],
  timingJitter: number = 5,
  velocityJitter: number = 10
): MotifNote[] {
  return notes.map((note) => {
    // Apply simple random timing offset (jitter percentage)
    const offset = (Math.random() - 0.5) * (timingJitter / 50);
    return {
      ...note,
      time: note.time + offset,
      velocity: humanizeVelocity(note.velocity, velocityJitter),
    };
  });
}

/**
 * Apply swing to rhythm notes
 */
export function swingRhythm(
  notes: MotifNote[],
  swingAmount: number,
  subdivision: "8th" | "16th" = "16th"
): MotifNote[] {
  return notes.map((note) => ({
    ...note,
    time: applySwing(note.time, swingAmount, subdivision),
  }));
}

/**
 * Combine two rhythm patterns
 */
export function combinePatterns(
  pattern1: RhythmPattern,
  pattern2: RhythmPattern
): RhythmPattern {
  const combinedSteps = [...new Set([...pattern1.steps, ...pattern2.steps])].sort((a, b) => a - b);
  const combinedAccents = [...new Set([...pattern1.accents, ...pattern2.accents])];

  return {
    steps: combinedSteps,
    accents: combinedAccents,
    subdivision: Math.min(pattern1.subdivision, pattern2.subdivision),
    length: Math.max(pattern1.length, pattern2.length),
  };
}

/**
 * Subtract one pattern from another
 */
export function subtractPattern(
  basePattern: RhythmPattern,
  subtractPattern: RhythmPattern
): RhythmPattern {
  const steps = basePattern.steps.filter((s) => !subtractPattern.steps.includes(s));
  const accents = basePattern.accents.filter((a) => steps.includes(a));

  return {
    steps,
    accents,
    subdivision: basePattern.subdivision,
    length: basePattern.length,
  };
}

/**
 * Rotate a rhythm pattern
 */
export function rotateRhythmPattern(
  pattern: RhythmPattern,
  steps: number
): RhythmPattern {
  const rotated = pattern.steps.map((s) => (s + steps + pattern.length) % pattern.length);
  const rotatedAccents = pattern.accents.map((a) => (a + steps + pattern.length) % pattern.length);

  return {
    steps: rotated.sort((a, b) => a - b),
    accents: rotatedAccents.filter((a) => rotated.includes(a)),
    subdivision: pattern.subdivision,
    length: pattern.length,
  };
}

/**
 * Invert a rhythm pattern (turn rests into hits and hits into rests)
 */
export function invertPattern(pattern: RhythmPattern): RhythmPattern {
  const allSteps = Array.from({ length: pattern.length }, (_, i) => i);
  const invertedSteps = allSteps.filter((s) => !pattern.steps.includes(s));

  return {
    steps: invertedSteps,
    accents: invertedSteps.filter((_, i) => i % 4 === 0),
    subdivision: pattern.subdivision,
    length: pattern.length,
  };
}

/**
 * Double the speed of a pattern
 */
export function doubleTime(pattern: RhythmPattern): RhythmPattern {
  const doubledSteps = pattern.steps.map((s) => Math.floor(s / 2));
  const uniqueSteps = [...new Set(doubledSteps)];

  return {
    steps: uniqueSteps,
    accents: pattern.accents.map((a) => Math.floor(a / 2)).filter((a) => uniqueSteps.includes(a)),
    subdivision: pattern.subdivision / 2,
    length: Math.floor(pattern.length / 2),
  };
}

/**
 * Halve the speed of a pattern
 */
export function halfTime(pattern: RhythmPattern): RhythmPattern {
  return {
    steps: pattern.steps.map((s) => s * 2),
    accents: pattern.accents.map((a) => a * 2),
    subdivision: pattern.subdivision * 2,
    length: pattern.length * 2,
  };
}

/**
 * Generate genre-specific rhythm patterns
 */
export function generateGenreRhythm(
  genre: string,
  element: "kick" | "snare" | "hihat" | "perc" = "hihat"
): RhythmPattern {
  const patterns: Record<string, Record<string, RhythmPattern>> = {
    house: {
      kick: { steps: [0, 4, 8, 12], accents: [0, 8], subdivision: 0.25, length: 16 },
      snare: { steps: [4, 12], accents: [4, 12], subdivision: 0.25, length: 16 },
      hihat: generateOffbeatPattern(),
      perc: generateEuclideanPattern(5, 16),
    },
    techno: {
      kick: { steps: [0, 4, 8, 12], accents: [0, 8], subdivision: 0.25, length: 16 },
      snare: { steps: [4, 12], accents: [12], subdivision: 0.25, length: 16 },
      hihat: generatePulsePattern(16),
      perc: generateEuclideanPattern(7, 16),
    },
    dnb: {
      kick: { steps: [0, 10], accents: [0], subdivision: 0.25, length: 16 },
      snare: { steps: [4, 12], accents: [4, 12], subdivision: 0.25, length: 16 },
      hihat: generatePulsePattern(16),
      perc: generateSyncopatedPattern("heavy"),
    },
    hiphop: {
      kick: { steps: [0, 5, 8, 13], accents: [0, 8], subdivision: 0.25, length: 16 },
      snare: { steps: [4, 12], accents: [4, 12], subdivision: 0.25, length: 16 },
      hihat: generatePulsePattern(8),
      perc: generateShufflePattern("light"),
    },
    latin: {
      kick: generateTresilloPattern(),
      snare: generateClavePattern("2-3"),
      hihat: generatePulsePattern(8),
      perc: generateClavePattern("rumba"),
    },
  };

  // Default to house if genre not found
  const genrePatterns = patterns[genre.toLowerCase()] || patterns.house;
  return genrePatterns[element] || genrePatterns.hihat!;
}

/**
 * Generate rhythm candidates based on style prior
 */
export function generateRhythmCandidates(
  stylePrior: StylePrior,
  element: "kick" | "snare" | "hihat" | "perc" = "hihat",
  count: number = 5
): RhythmPattern[] {
  const candidates: RhythmPattern[] = [];
  const genreKeywords = stylePrior.guardrails.energyProfile.toLowerCase();

  // Detect genre
  let detectedGenre = "house";
  if (genreKeywords.includes("techno")) detectedGenre = "techno";
  else if (genreKeywords.includes("dnb") || genreKeywords.includes("drum")) detectedGenre = "dnb";
  else if (genreKeywords.includes("hip") || genreKeywords.includes("trap")) detectedGenre = "hiphop";
  else if (genreKeywords.includes("latin") || genreKeywords.includes("salsa")) detectedGenre = "latin";

  // Add genre-specific pattern
  candidates.push(generateGenreRhythm(detectedGenre, element));

  // Add variations
  candidates.push(generateEuclideanPattern(Math.floor(Math.random() * 4) + 3, 16));
  candidates.push(generateSyncopatedPattern("medium"));
  candidates.push(generatePulsePattern(8));

  // Add a rotated version of the genre pattern
  const basePattern = generateGenreRhythm(detectedGenre, element);
  candidates.push(rotateRhythmPattern(basePattern, 2));

  return candidates.slice(0, count);
}
