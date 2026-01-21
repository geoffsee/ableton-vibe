/**
 * Rhythm utilities for beat subdivision, swing, and humanization
 */

/**
 * Standard subdivisions in beats (assuming 4/4 time)
 */
export const SUBDIVISIONS = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  sixteenth: 0.25,
  thirtySecond: 0.125,
  tripletQuarter: 4 / 3,
  tripletEighth: 2 / 3,
  tripletSixteenth: 1 / 3,
  dottedHalf: 3,
  dottedQuarter: 1.5,
  dottedEighth: 0.75,
};

/**
 * Time signature type
 */
export interface TimeSignature {
  numerator: number;
  denominator: number;
}

/**
 * Parse time signature string (e.g., "4/4", "6/8")
 */
export function parseTimeSignature(timeSig: string): TimeSignature {
  const [num, denom] = timeSig.split("/").map(Number);
  if (!num || !denom || isNaN(num) || isNaN(denom)) {
    throw new Error(`Invalid time signature: ${timeSig}`);
  }
  return { numerator: num, denominator: denom };
}

/**
 * Get beats per bar for a time signature
 */
export function getBeatsPerBar(timeSig: string | TimeSignature): number {
  const sig = typeof timeSig === "string" ? parseTimeSignature(timeSig) : timeSig;
  // Beats are relative to quarter notes
  return (sig.numerator * 4) / sig.denominator;
}

/**
 * Get the 16th note grid positions for a given number of bars
 */
export function get16thNoteGrid(bars: number, beatsPerBar = 4): number[] {
  const totalSixteenths = bars * beatsPerBar * 4;
  return Array.from({ length: totalSixteenths }, (_, i) => i);
}

/**
 * Convert 16th note position to beat position
 */
export function sixteenthToBeat(sixteenth: number): number {
  return sixteenth / 4;
}

/**
 * Convert beat position to 16th note position
 */
export function beatToSixteenth(beat: number): number {
  return Math.round(beat * 4);
}

/**
 * Apply swing to a beat position
 * @param beat - The beat position
 * @param swingAmount - Swing amount (0-100, 50 = no swing)
 * @param swingSubdivision - Which subdivision to swing ("8th" or "16th")
 */
export function applySwing(
  beat: number,
  swingAmount: number,
  swingSubdivision: "8th" | "16th" = "8th"
): number {
  // Normalize swing to -0.5 to 0.5 range (50 = 0, 0 = -0.5, 100 = 0.5)
  const swingOffset = (swingAmount - 50) / 100;

  // Grid size based on subdivision
  const gridSize = swingSubdivision === "8th" ? 0.5 : 0.25;

  // Check if this beat is on the off-beat of the swing grid
  const gridPosition = beat / gridSize;
  const isOffBeat = Math.abs(gridPosition % 2 - 1) < 0.001;

  if (isOffBeat) {
    // Push the off-beat by the swing amount
    return beat + swingOffset * gridSize;
  }

  return beat;
}

/**
 * Apply humanization (timing jitter) to a beat position
 */
export function humanizeTiming(
  beat: number,
  jitterMs: number,
  tempo: number
): number {
  // Convert ms to beats
  const msPerBeat = 60000 / tempo;
  const jitterBeats = jitterMs / msPerBeat;

  // Random offset within jitter range
  const offset = (Math.random() - 0.5) * 2 * jitterBeats;
  return beat + offset;
}

/**
 * Apply velocity humanization
 */
export function humanizeVelocity(
  velocity: number,
  variance: number
): number {
  const offset = (Math.random() - 0.5) * 2 * variance;
  return Math.max(1, Math.min(127, Math.round(velocity + offset)));
}

/**
 * Quantize a beat position to a grid
 */
export function quantize(
  beat: number,
  gridSize: number,
  strength = 1.0
): number {
  const nearestGrid = Math.round(beat / gridSize) * gridSize;
  return beat + (nearestGrid - beat) * strength;
}

/**
 * Check if a beat position is on the downbeat (beat 1)
 */
export function isDownbeat(beat: number, beatsPerBar = 4): boolean {
  return Math.abs(beat % beatsPerBar) < 0.001;
}

/**
 * Check if a beat position is on the backbeat (beats 2 and 4 in 4/4)
 */
export function isBackbeat(beat: number, beatsPerBar = 4): boolean {
  const posInBar = beat % beatsPerBar;
  if (beatsPerBar === 4) {
    return Math.abs(posInBar - 1) < 0.001 || Math.abs(posInBar - 3) < 0.001;
  }
  // For other time signatures, use half-bar position
  return Math.abs(posInBar - beatsPerBar / 2) < 0.001;
}

/**
 * Check if a position is syncopated (off the main beats)
 */
export function isSyncopated(beat: number, gridSize = 1): boolean {
  return Math.abs(beat % gridSize) > 0.001;
}

/**
 * Generate an accented pattern for a given meter
 * Returns velocity multipliers for each beat in the bar
 */
export function getAccentPattern(timeSig: string): number[] {
  const { numerator, denominator } = parseTimeSignature(timeSig);

  if (numerator === 4 && denominator === 4) {
    // 4/4: strong, weak, medium, weak
    return [1.0, 0.6, 0.8, 0.6];
  } else if (numerator === 3 && denominator === 4) {
    // 3/4: strong, weak, weak
    return [1.0, 0.6, 0.6];
  } else if (numerator === 6 && denominator === 8) {
    // 6/8: strong, weak, weak, medium, weak, weak
    return [1.0, 0.5, 0.5, 0.8, 0.5, 0.5];
  } else if (numerator === 2 && denominator === 4) {
    // 2/4: strong, weak
    return [1.0, 0.6];
  } else if (numerator === 5 && denominator === 4) {
    // 5/4: can be 3+2 or 2+3
    return [1.0, 0.6, 0.6, 0.8, 0.6];
  } else if (numerator === 7 && denominator === 8) {
    // 7/8: typically 2+2+3 or 3+2+2
    return [1.0, 0.6, 0.8, 0.6, 0.8, 0.5, 0.5];
  }

  // Default: accent on first beat
  return Array(numerator).fill(0.6).map((v, i) => (i === 0 ? 1.0 : v));
}

/**
 * Generate a basic rhythm pattern
 * @param bars - Number of bars
 * @param density - Note density (0-1, where 1 is every 16th note)
 * @param timeSig - Time signature
 */
export function generateBasicPattern(
  bars: number,
  density: number,
  timeSig = "4/4"
): number[] {
  const beatsPerBar = getBeatsPerBar(timeSig);
  const totalSixteenths = Math.round(bars * beatsPerBar * 4);
  const pattern: number[] = [];

  for (let i = 0; i < totalSixteenths; i++) {
    if (Math.random() < density) {
      pattern.push(i);
    }
  }

  return pattern;
}

/**
 * Generate a euclidean rhythm pattern as boolean array
 * Distributes n hits as evenly as possible across k steps
 */
export function euclideanRhythmBool(hits: number, steps: number): boolean[] {
  if (hits > steps) hits = steps;
  if (hits === 0) return Array(steps).fill(false);

  const pattern: boolean[] = [];
  let bucket = 0;

  for (let i = 0; i < steps; i++) {
    bucket += hits;
    if (bucket >= steps) {
      bucket -= steps;
      pattern.push(true);
    } else {
      pattern.push(false);
    }
  }

  return pattern;
}

/**
 * Generate a euclidean rhythm pattern as step indices
 * Distributes n hits as evenly as possible across k steps
 * Returns array of step numbers where hits occur
 */
export function euclideanRhythm(hits: number, steps: number, rotation: number = 0): number[] {
  const boolPattern = euclideanRhythmBool(hits, steps);

  // Apply rotation
  const rotated = rotation !== 0 ? rotatePattern(boolPattern, rotation) : boolPattern;

  // Convert to step indices
  const stepIndices: number[] = [];
  rotated.forEach((hit, index) => {
    if (hit) stepIndices.push(index);
  });

  return stepIndices;
}

/**
 * Rotate a pattern by n steps
 */
export function rotatePattern<T>(pattern: T[], steps: number): T[] {
  const n = pattern.length;
  if (n === 0) return pattern;
  const normalizedSteps = ((steps % n) + n) % n;
  return [...pattern.slice(normalizedSteps), ...pattern.slice(0, normalizedSteps)];
}

/**
 * Calculate groove "pocket" based on timing relationships
 * Returns a score 0-100
 */
export function calculatePocketScore(
  kickPositions: number[],
  snarePositions: number[],
  bassPositions: number[],
  beatsPerBar = 4
): number {
  let score = 100;

  // Check kick-snare relationship
  for (const kick of kickPositions) {
    for (const snare of snarePositions) {
      const distance = Math.abs(kick - snare) % beatsPerBar;
      // Penalize kicks too close to snares (flam territory)
      if (distance > 0 && distance < 0.125) {
        score -= 10;
      }
    }
  }

  // Check bass-kick alignment
  for (const bass of bassPositions) {
    const nearestKick = kickPositions.reduce(
      (nearest, kick) =>
        Math.abs(kick - bass) < Math.abs(nearest - bass) ? kick : nearest,
      Infinity
    );
    const distance = Math.abs(bass - nearestKick);
    // Reward bass notes that are close to kicks
    if (distance < 0.0625) {
      score += 2;
    }
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Tempo ranges for common genres
 */
export const GENRE_TEMPO_RANGES: Record<string, { min: number; max: number; typical: number }> = {
  techno: { min: 125, max: 145, typical: 130 },
  house: { min: 118, max: 135, typical: 124 },
  trance: { min: 130, max: 150, typical: 140 },
  dubstep: { min: 138, max: 142, typical: 140 },
  dnb: { min: 160, max: 180, typical: 174 },
  hiphop: { min: 70, max: 100, typical: 90 },
  trap: { min: 130, max: 170, typical: 140 },
  downtempo: { min: 70, max: 110, typical: 90 },
  ambient: { min: 60, max: 100, typical: 80 },
  disco: { min: 110, max: 130, typical: 120 },
  funk: { min: 100, max: 130, typical: 110 },
  rock: { min: 100, max: 140, typical: 120 },
  pop: { min: 100, max: 130, typical: 115 },
  jazz: { min: 80, max: 200, typical: 120 },
  reggae: { min: 60, max: 90, typical: 75 },
  garage: { min: 130, max: 140, typical: 135 },
};

/**
 * Get typical tempo range for a genre
 */
export function getGenreTempoRange(genre: string): { min: number; max: number; typical: number } {
  const lowerGenre = genre.toLowerCase();
  return (
    GENRE_TEMPO_RANGES[lowerGenre] || {
      min: 80,
      max: 140,
      typical: 120,
    }
  );
}
