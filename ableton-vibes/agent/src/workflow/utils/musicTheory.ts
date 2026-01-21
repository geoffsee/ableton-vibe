/**
 * Music theory utilities for scales, chords, intervals, and transposition
 */

// MIDI note names
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTE_NAMES_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

// Scale intervals (semitones from root)
export const SCALES: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  melodicMinor: [0, 2, 3, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  pentatonicMajor: [0, 2, 4, 7, 9],
  pentatonicMinor: [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  wholeTone: [0, 2, 4, 6, 8, 10],
};

// Chord intervals (semitones from root)
export const CHORDS: Record<string, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
  augmented: [0, 4, 8],
  major7: [0, 4, 7, 11],
  minor7: [0, 3, 7, 10],
  dominant7: [0, 4, 7, 10],
  diminished7: [0, 3, 6, 9],
  halfDiminished7: [0, 3, 6, 10],
  majorAdd9: [0, 4, 7, 14],
  minorAdd9: [0, 3, 7, 14],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  power: [0, 7],
};

// Interval names
export const INTERVALS: Record<number, string> = {
  0: "unison",
  1: "minor 2nd",
  2: "major 2nd",
  3: "minor 3rd",
  4: "major 3rd",
  5: "perfect 4th",
  6: "tritone",
  7: "perfect 5th",
  8: "minor 6th",
  9: "major 6th",
  10: "minor 7th",
  11: "major 7th",
  12: "octave",
};

/**
 * Convert note name to MIDI pitch (C4 = 60)
 */
export function noteNameToPitch(noteName: string): number {
  const match = noteName.match(/^([A-G])([#b]?)(-?\d)?$/i);
  if (!match) {
    throw new Error(`Invalid note name: ${noteName}`);
  }

  const [, letter, accidental, octaveStr] = match;
  const octave = octaveStr ? parseInt(octaveStr, 10) : 4;

  let pitchClass = NOTE_NAMES.indexOf(letter!.toUpperCase());
  if (pitchClass === -1) {
    pitchClass = NOTE_NAMES_FLAT.indexOf(letter!.toUpperCase());
  }

  if (accidental === "#") pitchClass += 1;
  if (accidental === "b") pitchClass -= 1;

  // Normalize pitch class
  pitchClass = ((pitchClass % 12) + 12) % 12;

  return pitchClass + (octave + 1) * 12;
}

/**
 * Convert MIDI pitch to note name
 */
export function pitchToNoteName(pitch: number, useFlats = false): string {
  const pitchClass = ((pitch % 12) + 12) % 12;
  const octave = Math.floor(pitch / 12) - 1;
  const noteNames = useFlats ? NOTE_NAMES_FLAT : NOTE_NAMES;
  return `${noteNames[pitchClass]}${octave}`;
}

/**
 * Get pitch class (0-11) from MIDI pitch
 */
export function getPitchClass(pitch: number): number {
  return ((pitch % 12) + 12) % 12;
}

/**
 * Get scale pitches for a given root and scale type
 */
export function getScalePitches(
  root: string | number,
  scale: keyof typeof SCALES,
  octave = 4
): number[] {
  const rootPitch = typeof root === "string" ? noteNameToPitch(`${root}${octave}`) : root;
  const intervals = SCALES[scale];
  if (!intervals) {
    throw new Error(`Unknown scale: ${scale}`);
  }
  return intervals.map((interval) => rootPitch + interval);
}

/**
 * Get scale pitch classes (0-11) for a given root and scale
 */
export function getScalePitchClasses(
  root: string | number,
  scale: keyof typeof SCALES
): number[] {
  const rootPitchClass =
    typeof root === "string" ? getPitchClass(noteNameToPitch(root)) : getPitchClass(root);
  const intervals = SCALES[scale];
  if (!intervals) {
    throw new Error(`Unknown scale: ${scale}`);
  }
  return intervals.map((interval) => (rootPitchClass + interval) % 12);
}

/**
 * Check if a pitch is in a given scale
 */
export function isPitchInScale(
  pitch: number,
  root: string | number,
  scale: keyof typeof SCALES
): boolean {
  const pitchClass = getPitchClass(pitch);
  const scalePitchClasses = getScalePitchClasses(root, scale);
  return scalePitchClasses.includes(pitchClass);
}

/**
 * Get chord pitches for a given root and chord type
 */
export function getChordPitches(
  root: string | number,
  chord: keyof typeof CHORDS,
  octave = 4
): number[] {
  const rootPitch = typeof root === "string" ? noteNameToPitch(`${root}${octave}`) : root;
  const intervals = CHORDS[chord];
  if (!intervals) {
    throw new Error(`Unknown chord: ${chord}`);
  }
  return intervals.map((interval) => rootPitch + interval);
}

/**
 * Transpose a pitch by semitones
 */
export function transpose(pitch: number, semitones: number): number {
  return pitch + semitones;
}

/**
 * Transpose an array of pitches
 */
export function transposeAll(pitches: number[], semitones: number): number[] {
  return pitches.map((p) => transpose(p, semitones));
}

/**
 * Get interval between two pitches (in semitones)
 */
export function getInterval(pitch1: number, pitch2: number): number {
  return Math.abs(pitch2 - pitch1);
}

/**
 * Get interval name
 */
export function getIntervalName(semitones: number): string {
  const normalized = Math.abs(semitones) % 12;
  return INTERVALS[normalized] || `${normalized} semitones`;
}

/**
 * Invert a melody (flip around a pivot pitch)
 */
export function invertMelody(pitches: number[], pivot?: number): number[] {
  const effectivePivot = pivot ?? pitches[0] ?? 60;
  return pitches.map((p) => effectivePivot * 2 - p);
}

/**
 * Retrograde a melody (reverse order)
 */
export function retrogradeMelody(pitches: number[]): number[] {
  return [...pitches].reverse();
}

/**
 * Quantize a pitch to the nearest scale degree
 */
export function quantizeToScale(
  pitch: number,
  root: string | number,
  scale: keyof typeof SCALES
): number {
  const scalePitchClasses = getScalePitchClasses(root, scale);
  const pitchClass = getPitchClass(pitch);
  const octave = Math.floor(pitch / 12);

  // Find nearest scale pitch class
  let minDistance = Infinity;
  let nearestPitchClass = pitchClass;

  for (const scalePc of scalePitchClasses) {
    const distance = Math.min(
      Math.abs(pitchClass - scalePc),
      Math.abs(pitchClass - scalePc + 12),
      Math.abs(pitchClass - scalePc - 12)
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearestPitchClass = scalePc;
    }
  }

  return octave * 12 + nearestPitchClass;
}

/**
 * Parse a chord symbol (e.g., "Cmaj7", "F#m", "Bb7")
 */
export function parseChordSymbol(symbol: string): { root: string; type: string } | null {
  const match = symbol.match(/^([A-G][#b]?)(m|maj|min|dim|aug|7|maj7|m7|dim7)?$/i);
  if (!match) return null;

  const [, root, quality] = match;
  let type = "major";

  if (quality) {
    const q = quality.toLowerCase();
    if (q === "m" || q === "min") type = "minor";
    else if (q === "dim") type = "diminished";
    else if (q === "aug") type = "augmented";
    else if (q === "7") type = "dominant7";
    else if (q === "maj7") type = "major7";
    else if (q === "m7") type = "minor7";
    else if (q === "dim7") type = "diminished7";
  }

  return { root: root!, type };
}

/**
 * Get diatonic chord for a scale degree
 */
export function getDiatonicChord(
  root: string,
  scale: keyof typeof SCALES,
  degree: number
): { root: string; type: string } {
  const scalePitchClasses = getScalePitchClasses(root, scale);
  const chordRoot = scalePitchClasses[(degree - 1) % 7];
  const third = scalePitchClasses[(degree + 1) % 7];
  const fifth = scalePitchClasses[(degree + 3) % 7];

  // Determine chord quality based on intervals
  const thirdInterval = (third - chordRoot + 12) % 12;
  const fifthInterval = (fifth - chordRoot + 12) % 12;

  let type = "major";
  if (thirdInterval === 3 && fifthInterval === 7) type = "minor";
  else if (thirdInterval === 3 && fifthInterval === 6) type = "diminished";
  else if (thirdInterval === 4 && fifthInterval === 8) type = "augmented";

  const rootName = NOTE_NAMES[chordRoot];
  return { root: rootName!, type };
}

/**
 * Common chord progressions by genre
 */
export const COMMON_PROGRESSIONS: Record<string, string[][]> = {
  pop: [
    ["I", "V", "vi", "IV"],
    ["I", "IV", "V", "V"],
    ["vi", "IV", "I", "V"],
  ],
  electronic: [
    ["i", "VI", "III", "VII"],
    ["i", "iv", "v", "i"],
    ["i", "VII", "VI", "VII"],
  ],
  jazz: [
    ["IIM7", "V7", "IM7", "IM7"],
    ["IM7", "VI7", "IIM7", "V7"],
  ],
  hiphop: [
    ["i", "iv", "VI", "V"],
    ["i", "VI", "iv", "V"],
  ],
};

/**
 * Convert roman numeral to chord in a key
 */
export function romanToChord(
  roman: string,
  key: string,
  mode: "major" | "minor" = "major"
): { root: string; type: string } {
  const isMinor = roman === roman.toLowerCase();
  const numeral = roman.toUpperCase().replace(/[^IViv]/g, "");

  const degrees: Record<string, number> = {
    I: 0,
    II: 1,
    III: 2,
    IV: 3,
    V: 4,
    VI: 5,
    VII: 6,
  };

  const degree = degrees[numeral];
  if (degree === undefined) {
    return { root: key, type: "major" };
  }

  const scale = mode === "major" ? "major" : "minor";
  const scalePitches = getScalePitchClasses(key, scale);
  const rootPitchClass = scalePitches[degree];
  const rootName = NOTE_NAMES[rootPitchClass!];

  let type = isMinor ? "minor" : "major";
  if (roman.includes("7")) type = isMinor ? "minor7" : "dominant7";
  if (roman.includes("M7") || roman.includes("maj7")) type = "major7";
  if (roman.includes("dim")) type = "diminished";

  return { root: rootName!, type };
}
