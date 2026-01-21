/**
 * Motif generators
 * Generate melodic, rhythmic, harmonic, and textural motifs
 */

import type { MotifSeed, MotifNote, StylePrior } from "../types";
import {
  getScalePitches,
  transposeAll,
  invertMelody,
  retrogradeMelody,
  SCALES,
} from "../utils/musicTheory";
import { euclideanRhythm, humanizeVelocity } from "../utils/rhythmUtils";

/**
 * Generate a simple ascending scale motif
 */
export function generateScaleMotif(
  key: string = "C",
  scale: keyof typeof SCALES = "major",
  octave: number = 4,
  lengthNotes: number = 4,
  duration: number = 0.5
): MotifNote[] {
  const scalePitches = getScalePitches(key, scale, octave);
  return scalePitches.slice(0, lengthNotes).map((pitch, i) => ({
    pitch,
    time: i * duration,
    duration,
    velocity: 100,
  }));
}

/**
 * Generate a motif using chord tones
 */
export function generateArpeggioMotif(
  rootPitch: number,
  pattern: "up" | "down" | "updown" | "random" = "up",
  intervals: number[] = [0, 4, 7, 12], // Major triad + octave
  noteDuration: number = 0.25
): MotifNote[] {
  const pitches = intervals.map((i) => rootPitch + i);
  let orderedPitches: number[];

  switch (pattern) {
    case "up":
      orderedPitches = pitches;
      break;
    case "down":
      orderedPitches = [...pitches].reverse();
      break;
    case "updown":
      orderedPitches = [...pitches, ...pitches.slice(1, -1).reverse()];
      break;
    case "random":
      orderedPitches = [...pitches].sort(() => Math.random() - 0.5);
      break;
  }

  return orderedPitches.map((pitch, i) => ({
    pitch,
    time: i * noteDuration,
    duration: noteDuration,
    velocity: i === 0 ? 100 : 85, // Accent the first note
  }));
}

/**
 * Generate a melodic motif with contour shape
 */
export function generateContourMotif(
  key: string,
  scale: keyof typeof SCALES,
  contour: "arch" | "descending" | "ascending" | "wave" | "valley",
  lengthNotes: number = 8,
  baseOctave: number = 4
): MotifNote[] {
  const scalePitches = getScalePitches(key, scale, baseOctave);
  const notes: MotifNote[] = [];

  const contourPatterns: Record<string, number[]> = {
    arch: [0, 1, 2, 3, 4, 3, 2, 1], // Up then down
    descending: [4, 3, 2, 1, 0, -1, -2, -3].map((x) => x + 4), // High to low
    ascending: [0, 1, 2, 3, 4, 5, 6, 7], // Low to high
    wave: [0, 2, 1, 3, 2, 4, 3, 5], // Oscillating up
    valley: [4, 3, 2, 1, 0, 1, 2, 3], // Down then up
  };

  const pattern = contourPatterns[contour] || contourPatterns.arch;
  const usedPattern = pattern.slice(0, lengthNotes);

  for (let i = 0; i < usedPattern.length; i++) {
    const scaleIndex = Math.max(0, Math.min(usedPattern[i]!, scalePitches.length - 1));
    notes.push({
      pitch: scalePitches[scaleIndex]!,
      time: i * 0.5,
      duration: 0.5,
      velocity: i === 0 || i === usedPattern.length - 1 ? 100 : 90,
    });
  }

  return notes;
}

/**
 * Generate a rhythmic motif (drum-like, single pitch)
 */
export function generateRhythmicMotif(
  pitch: number = 60, // Default to C4
  pattern: number[] = [0, 2, 4, 6, 8, 10, 12, 14], // 8th notes
  subdivision: number = 0.25, // 16th notes
  accents: number[] = [0, 4, 8, 12] // Where to accent
): MotifNote[] {
  return pattern.map((step) => ({
    pitch,
    time: step * subdivision,
    duration: subdivision,
    velocity: accents.includes(step) ? 100 : 70,
  }));
}

/**
 * Generate an euclidean rhythm motif
 */
export function generateEuclideanMotif(
  pitch: number,
  hits: number,
  steps: number = 16,
  rotation: number = 0,
  subdivision: number = 0.25
): MotifNote[] {
  const pattern = euclideanRhythm(hits, steps, rotation);
  return pattern.map((step, i) => ({
    pitch,
    time: step * subdivision,
    duration: subdivision,
    velocity: humanizeVelocity(90, 15),
  }));
}

/**
 * Generate a harmonic motif (block chords)
 */
export function generateChordMotif(
  rootPitches: number[], // Root notes for each chord
  chordType: "major" | "minor" | "seventh" | "sus4" = "major",
  duration: number = 1
): MotifNote[] {
  const intervals: Record<string, number[]> = {
    major: [0, 4, 7],
    minor: [0, 3, 7],
    seventh: [0, 4, 7, 10],
    sus4: [0, 5, 7],
  };

  const chordIntervals = intervals[chordType];
  const notes: MotifNote[] = [];

  rootPitches.forEach((root, chordIndex) => {
    chordIntervals.forEach((interval) => {
      notes.push({
        pitch: root + interval,
        time: chordIndex * duration,
        duration,
        velocity: 85,
      });
    });
  });

  return notes;
}

/**
 * Generate a textural motif (ambient, evolving)
 */
export function generateTexturalMotif(
  key: string,
  scale: keyof typeof SCALES,
  density: "sparse" | "medium" | "dense" = "medium",
  lengthBars: number = 2
): MotifNote[] {
  const scalePitches = getScalePitches(key, scale, 4);
  const notes: MotifNote[] = [];

  const densityParams = {
    sparse: { notesPerBar: 2, durationRange: [1, 2] },
    medium: { notesPerBar: 4, durationRange: [0.5, 1.5] },
    dense: { notesPerBar: 8, durationRange: [0.25, 1] },
  };

  const params = densityParams[density];
  const totalNotes = params.notesPerBar * lengthBars;
  const barLength = 4; // 4 beats per bar

  for (let i = 0; i < totalNotes; i++) {
    const scaleIndex = Math.floor(Math.random() * scalePitches.length);
    const time = (i / totalNotes) * (lengthBars * barLength) + (Math.random() * 0.5 - 0.25);
    const duration = params.durationRange[0]! + Math.random() * (params.durationRange[1]! - params.durationRange[0]!);

    notes.push({
      pitch: scalePitches[scaleIndex]!,
      time: Math.max(0, time),
      duration,
      velocity: 50 + Math.floor(Math.random() * 40), // Soft, varying
    });
  }

  return notes.sort((a, b) => a.time - b.time);
}

/**
 * Generate a bass motif
 */
export function generateBassMotif(
  key: string,
  scale: keyof typeof SCALES,
  pattern: "root" | "walking" | "syncopated" | "arpeggiated" = "root",
  lengthBars: number = 1
): MotifNote[] {
  const scalePitches = getScalePitches(key, scale, 2); // Bass octave
  const root = scalePitches[0]!;
  const fifth = scalePitches[4]!;
  const octave = root + 12;

  const patterns: Record<string, MotifNote[]> = {
    root: [
      { pitch: root, time: 0, duration: 1, velocity: 100 },
      { pitch: root, time: 1, duration: 1, velocity: 90 },
      { pitch: root, time: 2, duration: 1, velocity: 95 },
      { pitch: root, time: 3, duration: 1, velocity: 90 },
    ],
    walking: [
      { pitch: root, time: 0, duration: 0.5, velocity: 100 },
      { pitch: scalePitches[2]!, time: 0.5, duration: 0.5, velocity: 80 },
      { pitch: scalePitches[4]!, time: 1, duration: 0.5, velocity: 85 },
      { pitch: scalePitches[6]!, time: 1.5, duration: 0.5, velocity: 80 },
      { pitch: octave, time: 2, duration: 0.5, velocity: 90 },
      { pitch: scalePitches[6]!, time: 2.5, duration: 0.5, velocity: 80 },
      { pitch: fifth, time: 3, duration: 0.5, velocity: 85 },
      { pitch: scalePitches[2]!, time: 3.5, duration: 0.5, velocity: 80 },
    ],
    syncopated: [
      { pitch: root, time: 0, duration: 0.75, velocity: 100 },
      { pitch: root, time: 0.75, duration: 0.25, velocity: 70 },
      { pitch: fifth, time: 1.5, duration: 0.5, velocity: 85 },
      { pitch: root, time: 2, duration: 1, velocity: 90 },
      { pitch: fifth, time: 3.25, duration: 0.75, velocity: 80 },
    ],
    arpeggiated: [
      { pitch: root, time: 0, duration: 0.25, velocity: 100 },
      { pitch: scalePitches[2]!, time: 0.25, duration: 0.25, velocity: 75 },
      { pitch: fifth, time: 0.5, duration: 0.25, velocity: 80 },
      { pitch: octave, time: 0.75, duration: 0.25, velocity: 75 },
      { pitch: root, time: 1, duration: 0.25, velocity: 95 },
      { pitch: scalePitches[2]!, time: 1.25, duration: 0.25, velocity: 75 },
      { pitch: fifth, time: 1.5, duration: 0.25, velocity: 80 },
      { pitch: octave, time: 1.75, duration: 0.25, velocity: 75 },
      { pitch: root, time: 2, duration: 0.25, velocity: 100 },
      { pitch: scalePitches[2]!, time: 2.25, duration: 0.25, velocity: 75 },
      { pitch: fifth, time: 2.5, duration: 0.25, velocity: 80 },
      { pitch: octave, time: 2.75, duration: 0.25, velocity: 75 },
      { pitch: fifth, time: 3, duration: 0.25, velocity: 90 },
      { pitch: scalePitches[2]!, time: 3.25, duration: 0.25, velocity: 75 },
      { pitch: root, time: 3.5, duration: 0.5, velocity: 85 },
    ],
  };

  return patterns[pattern] || patterns.root;
}

/**
 * Apply variation to a motif
 */
export function varyMotif(
  motif: MotifNote[],
  operation: "transpose" | "invert" | "retrograde" | "augment" | "diminish",
  param?: number
): MotifNote[] {
  const pitches = motif.map((n) => n.pitch);

  switch (operation) {
    case "transpose":
      const transposed = transposeAll(pitches, param || 12);
      return motif.map((n, i) => ({ ...n, pitch: transposed[i]! }));

    case "invert":
      const inverted = invertMelody(pitches, param || pitches[0]);
      return motif.map((n, i) => ({ ...n, pitch: inverted[i]! }));

    case "retrograde":
      const retrograded = retrogradeMelody(pitches);
      return motif.map((n, i) => ({ ...n, pitch: retrograded[i]! }));

    case "augment":
      const factor = param || 2;
      return motif.map((n) => ({
        ...n,
        time: n.time * factor,
        duration: n.duration * factor,
      }));

    case "diminish":
      const dimFactor = param || 0.5;
      return motif.map((n) => ({
        ...n,
        time: n.time * dimFactor,
        duration: n.duration * dimFactor,
      }));

    default:
      return motif;
  }
}

/**
 * Create a MotifSeed from notes
 */
export function createMotifSeed(
  notes: MotifNote[],
  type: MotifSeed["type"],
  key: string,
  scale: string,
  name?: string
): MotifSeed {
  const maxTime = Math.max(...notes.map((n) => n.time + n.duration));
  const lengthBars = Math.ceil(maxTime / 4);

  return {
    id: `motif-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    name: name || `${type} motif in ${key} ${scale}`,
    notes,
    lengthBars,
    key,
    scale,
    description: `${type} motif with ${notes.length} notes over ${lengthBars} bar(s)`,
  };
}

/**
 * Generate multiple motif candidates based on style prior
 */
export function generateMotifCandidates(
  stylePrior: StylePrior,
  type: MotifSeed["type"],
  key: string = "C",
  scale: keyof typeof SCALES = "minor",
  count: number = 5
): MotifSeed[] {
  const candidates: MotifSeed[] = [];
  const genreKeywords = stylePrior.guardrails.energyProfile.toLowerCase();

  switch (type) {
    case "melodic":
      // Generate various melodic motifs
      candidates.push(
        createMotifSeed(generateContourMotif(key, scale, "arch", 8), "melodic", key, scale, "Arch melody")
      );
      candidates.push(
        createMotifSeed(generateContourMotif(key, scale, "ascending", 6), "melodic", key, scale, "Rising melody")
      );
      candidates.push(
        createMotifSeed(generateContourMotif(key, scale, "wave", 8), "melodic", key, scale, "Wave melody")
      );
      candidates.push(
        createMotifSeed(generateArpeggioMotif(60, "updown", [0, 3, 7, 12]), "melodic", key, scale, "Arpeggio melody")
      );
      break;

    case "rhythmic":
      // Generate rhythmic patterns
      candidates.push(
        createMotifSeed(generateRhythmicMotif(60, [0, 4, 8, 12]), "rhythmic", key, scale, "Quarter note rhythm")
      );
      candidates.push(
        createMotifSeed(generateRhythmicMotif(60, [0, 2, 4, 6, 8, 10, 12, 14]), "rhythmic", key, scale, "8th note rhythm")
      );
      candidates.push(
        createMotifSeed(generateEuclideanMotif(60, 5, 16), "rhythmic", key, scale, "Euclidean 5/16 rhythm")
      );
      candidates.push(
        createMotifSeed(generateEuclideanMotif(60, 7, 16), "rhythmic", key, scale, "Euclidean 7/16 rhythm")
      );
      break;

    case "harmonic":
      // Generate chord-based motifs
      const rootPitch = 48; // C3
      candidates.push(
        createMotifSeed(generateChordMotif([rootPitch, rootPitch + 5, rootPitch + 7], "major"), "harmonic", key, scale, "I-IV-V progression")
      );
      candidates.push(
        createMotifSeed(generateChordMotif([rootPitch, rootPitch - 2, rootPitch + 5], "minor"), "harmonic", key, scale, "i-VII-IV progression")
      );
      candidates.push(
        createMotifSeed(generateChordMotif([rootPitch], "seventh", 2), "harmonic", key, scale, "Seventh chord pad")
      );
      break;

    case "textural":
      // Generate ambient/textural motifs
      candidates.push(
        createMotifSeed(generateTexturalMotif(key, scale, "sparse", 4), "textural", key, scale, "Sparse texture")
      );
      candidates.push(
        createMotifSeed(generateTexturalMotif(key, scale, "medium", 2), "textural", key, scale, "Medium texture")
      );
      candidates.push(
        createMotifSeed(generateTexturalMotif(key, scale, "dense", 2), "textural", key, scale, "Dense texture")
      );
      break;
  }

  // Add variations
  if (candidates.length > 0 && candidates.length < count) {
    const base = candidates[0]!;
    candidates.push(
      createMotifSeed(varyMotif(base.notes, "transpose", 5), type, key, scale, `${base.name} (transposed)`)
    );
    candidates.push(
      createMotifSeed(varyMotif(base.notes, "retrograde"), type, key, scale, `${base.name} (retrograde)`)
    );
  }

  return candidates.slice(0, count);
}
