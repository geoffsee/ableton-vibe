/**
 * Harmony generators
 * Generate chord progressions and harmonic structures
 */

import type { HarmonyProgression, StylePrior } from "../types";
import { noteNameToPitch, getScalePitchClasses, CHORDS, SCALES } from "../utils/musicTheory";

/**
 * Common chord progression templates
 * Numbers represent scale degrees (1-based)
 */
export const PROGRESSION_TEMPLATES: Record<string, { degrees: number[]; name: string }> = {
  // Pop/Rock progressions
  "I-V-vi-IV": { degrees: [1, 5, 6, 4], name: "Pop progression" },
  "I-IV-V-I": { degrees: [1, 4, 5, 1], name: "Classic rock" },
  "vi-IV-I-V": { degrees: [6, 4, 1, 5], name: "Emotional pop" },
  "I-vi-IV-V": { degrees: [1, 6, 4, 5], name: "50s progression" },

  // EDM/House progressions
  "i-VI-III-VII": { degrees: [1, 6, 3, 7], name: "Dark house" },
  "i-VII-VI-VII": { degrees: [1, 7, 6, 7], name: "Driving house" },
  "i-iv-VII-III": { degrees: [1, 4, 7, 3], name: "Deep house" },

  // Jazz/Neo-soul progressions
  "ii-V-I": { degrees: [2, 5, 1], name: "Jazz ii-V-I" },
  "I-vi-ii-V": { degrees: [1, 6, 2, 5], name: "Jazz turnaround" },
  "IVmaj7-iii7-vi7-ii7-V7": { degrees: [4, 3, 6, 2, 5], name: "Neo-soul" },

  // Ambient/Cinematic
  "I-III-IV-iv": { degrees: [1, 3, 4, 4], name: "Major to minor IV" },
  "i-VI-i-VII": { degrees: [1, 6, 1, 7], name: "Cinematic minor" },

  // Trance/Progressive
  "i-VI-VII-i": { degrees: [1, 6, 7, 1], name: "Epic trance" },
  "vi-IV-I-V-uplifting": { degrees: [6, 4, 1, 5], name: "Uplifting trance" },
};

/**
 * Get the chord quality for a scale degree
 */
function getChordQualityForDegree(
  degree: number,
  scale: "major" | "minor" | "dorian" | "mixolydian" | "phrygian"
): "maj" | "min" | "dim" | "aug" {
  const qualities: Record<string, Array<"maj" | "min" | "dim" | "aug">> = {
    major: ["maj", "min", "min", "maj", "maj", "min", "dim"],
    minor: ["min", "dim", "maj", "min", "min", "maj", "maj"],
    dorian: ["min", "min", "maj", "maj", "min", "dim", "maj"],
    mixolydian: ["maj", "min", "dim", "maj", "min", "min", "maj"],
    phrygian: ["min", "maj", "maj", "min", "dim", "maj", "min"],
  };

  const scaleQualities = qualities[scale] || qualities.major;
  return scaleQualities[(degree - 1) % 7]!;
}

/**
 * Convert scale degree to chord symbol
 */
export function degreeToChord(
  degree: number,
  key: string,
  scale: keyof typeof SCALES = "major"
): string {
  const scalePitchClasses = getScalePitchClasses(key, scale);
  const rootPitchClass = scalePitchClasses[(degree - 1) % scalePitchClasses.length]!;

  // Convert pitch class to note name
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const rootNote = noteNames[rootPitchClass]!;

  // Get chord quality based on scale degree and mode
  const simpleScale = scale.includes("minor") ? "minor" : "major";
  const quality = getChordQualityForDegree(degree, simpleScale as any);

  return `${rootNote}${quality}`;
}

/**
 * Generate a chord progression from a template
 */
export function generateProgressionFromTemplate(
  templateName: string,
  key: string,
  scale: keyof typeof SCALES = "major",
  beatsPerChord: number = 4
): HarmonyProgression[] {
  const template = PROGRESSION_TEMPLATES[templateName];
  if (!template) {
    throw new Error(`Unknown progression template: ${templateName}`);
  }

  return template.degrees.map((degree, index) => ({
    startBeat: index * beatsPerChord,
    chord: degreeToChord(degree, key, scale),
    duration: beatsPerChord,
  }));
}

/**
 * Generate a simple I-IV-V-I progression
 */
export function generateBasicProgression(
  key: string,
  scale: keyof typeof SCALES = "major",
  beatsPerChord: number = 4
): HarmonyProgression[] {
  return generateProgressionFromTemplate("I-IV-V-I", key, scale, beatsPerChord);
}

/**
 * Generate a pop chord progression
 */
export function generatePopProgression(
  key: string,
  variant: "standard" | "emotional" | "50s" = "standard",
  beatsPerChord: number = 4
): HarmonyProgression[] {
  const templates: Record<string, string> = {
    standard: "I-V-vi-IV",
    emotional: "vi-IV-I-V",
    "50s": "I-vi-IV-V",
  };
  return generateProgressionFromTemplate(templates[variant]!, key, "major", beatsPerChord);
}

/**
 * Generate a house/EDM chord progression
 */
export function generateEDMProgression(
  key: string,
  variant: "dark" | "driving" | "deep" = "driving",
  beatsPerChord: number = 4
): HarmonyProgression[] {
  const templates: Record<string, string> = {
    dark: "i-VI-III-VII",
    driving: "i-VII-VI-VII",
    deep: "i-iv-VII-III",
  };
  return generateProgressionFromTemplate(templates[variant]!, key, "minor", beatsPerChord);
}

/**
 * Generate a trance/progressive progression
 */
export function generateTranceProgression(
  key: string,
  variant: "epic" | "uplifting" = "epic",
  beatsPerChord: number = 8
): HarmonyProgression[] {
  const templates: Record<string, string> = {
    epic: "i-VI-VII-i",
    uplifting: "vi-IV-I-V",
  };
  const scale: keyof typeof SCALES = variant === "epic" ? "minor" : "major";
  return generateProgressionFromTemplate(templates[variant]!, key, scale, beatsPerChord);
}

/**
 * Generate a jazz progression
 */
export function generateJazzProgression(
  key: string,
  variant: "ii-V-I" | "turnaround" = "ii-V-I",
  beatsPerChord: number = 4
): HarmonyProgression[] {
  const templates: Record<string, string> = {
    "ii-V-I": "ii-V-I",
    turnaround: "I-vi-ii-V",
  };
  return generateProgressionFromTemplate(templates[variant]!, key, "major", beatsPerChord);
}

/**
 * Generate a random progression within harmonic rules
 */
export function generateRandomProgression(
  key: string,
  scale: keyof typeof SCALES = "minor",
  chordCount: number = 4,
  beatsPerChord: number = 4
): HarmonyProgression[] {
  // Common chord movement rules (which degrees commonly follow which)
  const transitions: Record<number, number[]> = {
    1: [4, 5, 6, 2], // I can go to IV, V, vi, ii
    2: [5, 4, 7], // ii can go to V, IV, vii
    3: [6, 4, 2], // iii can go to vi, IV, ii
    4: [5, 1, 2, 7], // IV can go to V, I, ii, vii
    5: [1, 6, 4], // V can go to I, vi, IV
    6: [4, 2, 5, 3], // vi can go to IV, ii, V, iii
    7: [1, 3], // vii can go to I, iii
  };

  const progression: HarmonyProgression[] = [];
  let currentDegree = 1; // Start on I

  for (let i = 0; i < chordCount; i++) {
    progression.push({
      startBeat: i * beatsPerChord,
      chord: degreeToChord(currentDegree, key, scale),
      duration: beatsPerChord,
    });

    // Pick next chord from valid transitions
    const validNext = transitions[currentDegree] || [1];
    currentDegree = validNext[Math.floor(Math.random() * validNext.length)]!;
  }

  return progression;
}

/**
 * Extend a progression by repeating with variations
 */
export function extendProgression(
  progression: HarmonyProgression[],
  totalBars: number,
  beatsPerBar: number = 4
): HarmonyProgression[] {
  const extended: HarmonyProgression[] = [];
  const progressionLength = progression.length;
  const totalBeats = totalBars * beatsPerBar;

  let currentBeat = 0;
  let chordIndex = 0;

  while (currentBeat < totalBeats) {
    const original = progression[chordIndex % progressionLength]!;
    extended.push({
      ...original,
      startBeat: currentBeat,
    });
    currentBeat += original.duration;
    chordIndex++;
  }

  return extended;
}

/**
 * Generate progression candidates based on style
 */
export function generateProgressionCandidates(
  stylePrior: StylePrior,
  key: string = "C",
  count: number = 5
): Array<{ name: string; progression: HarmonyProgression[] }> {
  const candidates: Array<{ name: string; progression: HarmonyProgression[] }> = [];
  const genreKeywords = stylePrior.guardrails.energyProfile.toLowerCase();

  // Determine scale based on keywords
  const useMajor = genreKeywords.includes("happy") || genreKeywords.includes("uplifting") || genreKeywords.includes("bright");
  const defaultScale: keyof typeof SCALES = useMajor ? "major" : "minor";

  // Genre-specific progressions
  if (genreKeywords.includes("house") || genreKeywords.includes("techno") || genreKeywords.includes("edm")) {
    candidates.push({ name: "Dark house", progression: generateEDMProgression(key, "dark") });
    candidates.push({ name: "Driving house", progression: generateEDMProgression(key, "driving") });
    candidates.push({ name: "Deep house", progression: generateEDMProgression(key, "deep") });
  }

  if (genreKeywords.includes("trance") || genreKeywords.includes("progressive")) {
    candidates.push({ name: "Epic trance", progression: generateTranceProgression(key, "epic") });
    candidates.push({ name: "Uplifting trance", progression: generateTranceProgression(key, "uplifting") });
  }

  if (genreKeywords.includes("pop") || genreKeywords.includes("indie")) {
    candidates.push({ name: "Pop standard", progression: generatePopProgression(key, "standard") });
    candidates.push({ name: "Emotional pop", progression: generatePopProgression(key, "emotional") });
    candidates.push({ name: "50s style", progression: generatePopProgression(key, "50s") });
  }

  if (genreKeywords.includes("jazz") || genreKeywords.includes("lofi") || genreKeywords.includes("neo-soul")) {
    candidates.push({ name: "Jazz ii-V-I", progression: generateJazzProgression(key, "ii-V-I") });
    candidates.push({ name: "Jazz turnaround", progression: generateJazzProgression(key, "turnaround") });
  }

  // Add generic progressions if needed
  if (candidates.length < count) {
    candidates.push({ name: "Basic I-IV-V-I", progression: generateBasicProgression(key, defaultScale) });
    candidates.push({ name: "Random variation 1", progression: generateRandomProgression(key, defaultScale, 4) });
    candidates.push({ name: "Random variation 2", progression: generateRandomProgression(key, defaultScale, 8, 2) });
  }

  return candidates.slice(0, count);
}

/**
 * Transpose an entire progression
 */
export function transposeProgression(
  progression: HarmonyProgression[],
  semitones: number
): HarmonyProgression[] {
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  return progression.map((chord) => {
    // Extract root note and quality
    const match = chord.chord.match(/^([A-G]#?)(.*)$/);
    if (!match) return chord;

    const [, rootNote, quality] = match;
    const rootIndex = noteNames.indexOf(rootNote!);
    const newIndex = (rootIndex + semitones + 12) % 12;
    const newRoot = noteNames[newIndex]!;

    return {
      ...chord,
      chord: `${newRoot}${quality}`,
    };
  });
}

/**
 * Get the emotional character of a progression
 */
export function analyzeProgressionMood(progression: HarmonyProgression[]): {
  mood: "dark" | "bright" | "melancholy" | "triumphant" | "neutral";
  tension: number;
} {
  let minorCount = 0;
  let majorCount = 0;
  let diminishedCount = 0;

  for (const chord of progression) {
    const chordLower = chord.chord.toLowerCase();

    // Check for diminished first
    if (chordLower.includes("dim")) {
      diminishedCount++;
    }
    // Check for minor (but not in "dim")
    else if (chordLower.includes("min") || (chordLower.includes("m") && !chordLower.includes("maj"))) {
      minorCount++;
    }
    // Major chords
    else if (chordLower.includes("maj") || /^[a-g][#b]?$/.test(chordLower)) {
      majorCount++;
    }
  }

  const total = progression.length;
  const minorRatio = minorCount / total;
  const tension = (diminishedCount / total) * 100;

  let mood: "dark" | "bright" | "melancholy" | "triumphant" | "neutral";

  if (minorRatio > 0.7) {
    mood = tension > 20 ? "dark" : "melancholy";
  } else if (minorRatio < 0.3) {
    mood = tension > 20 ? "triumphant" : "bright";
  } else {
    mood = "neutral";
  }

  return { mood, tension };
}
