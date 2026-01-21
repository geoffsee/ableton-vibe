/**
 * Motif scoring functions for memorability, singability, tension/relief, novelty
 */

import type { MotifSeed, MotifScore, StylePrior, MotifBreakdown, MotifNote } from "../types";
import { getScalePitchClasses, getPitchClass, getInterval, SCALES } from "../utils/musicTheory";

/**
 * Analyze interval variety in a melody
 * Returns 0-100 where higher means more variety
 */
export function analyzeIntervalVariety(notes: MotifNote[]): number {
  if (notes.length < 2) return 50; // Neutral for single notes

  const intervals = new Set<number>();
  const sortedNotes = [...notes].sort((a, b) => a.time - b.time);

  for (let i = 1; i < sortedNotes.length; i++) {
    const interval = Math.abs(sortedNotes[i]!.pitch - sortedNotes[i - 1]!.pitch);
    intervals.add(interval % 12); // Normalize to within octave
  }

  // If all intervals are unisons (0), there's no melodic variety
  if (intervals.size === 1 && intervals.has(0)) {
    return 0;
  }

  // Don't count unisons as contributing to variety
  const meaningfulIntervals = new Set([...intervals].filter(i => i !== 0));

  // Score based on number of unique meaningful intervals
  const maxUniqueIntervals = Math.min(sortedNotes.length - 1, 7);
  const varietyRatio = meaningfulIntervals.size / maxUniqueIntervals;

  return Math.round(varietyRatio * 100);
}

/**
 * Analyze rhythmic interest
 * Considers note density, syncopation, and duration variety
 */
export function analyzeRhythmicInterest(notes: MotifNote[]): number {
  if (notes.length === 0) return 0;
  if (notes.length === 1) return 30;

  let score = 50; // Base score

  // Check duration variety
  const durations = new Set(notes.map((n) => Math.round(n.duration * 16) / 16));
  if (durations.size >= 2) score += 15;
  if (durations.size >= 3) score += 10;

  // Check for syncopation (notes not on strong beats)
  const strongBeats = [0, 1, 2, 3]; // Quarter note positions
  const syncopatedNotes = notes.filter((n) => {
    const beatPosition = n.time % 1;
    return beatPosition > 0.01; // Not exactly on a beat
  });
  const syncopationRatio = syncopatedNotes.length / notes.length;
  if (syncopationRatio >= 0.2 && syncopationRatio <= 0.6) {
    score += 15; // Good amount of syncopation
  }

  // Check note density
  const totalDuration = Math.max(...notes.map((n) => n.time + n.duration)) - Math.min(...notes.map((n) => n.time));
  if (totalDuration > 0) {
    const density = notes.length / totalDuration;
    if (density >= 0.5 && density <= 4) {
      score += 10; // Reasonable density
    }
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Analyze melodic contour
 * Returns 0-100 where higher means clearer, more interesting contour
 */
export function analyzeContour(notes: MotifNote[]): number {
  if (notes.length < 3) return 50;

  const sortedNotes = [...notes].sort((a, b) => a.time - b.time);
  const pitches = sortedNotes.map((n) => n.pitch);

  // Calculate direction changes
  let directionChanges = 0;
  let ascending = 0;
  let descending = 0;

  for (let i = 1; i < pitches.length; i++) {
    const diff = pitches[i]! - pitches[i - 1]!;
    if (i >= 2) {
      const prevDiff = pitches[i - 1]! - pitches[i - 2]!;
      if ((diff > 0 && prevDiff < 0) || (diff < 0 && prevDiff > 0)) {
        directionChanges++;
      }
    }
    if (diff > 0) ascending++;
    if (diff < 0) descending++;
  }

  let score = 50;

  // Reward clear contour (arch, ascending, descending)
  const total = ascending + descending || 1;
  const dominantDirection = Math.max(ascending, descending) / total;
  if (dominantDirection >= 0.6) {
    score += 20; // Clear directional tendency
  }

  // Moderate direction changes are interesting
  const maxChanges = pitches.length - 2;
  const changeRatio = maxChanges > 0 ? directionChanges / maxChanges : 0;
  if (changeRatio >= 0.2 && changeRatio <= 0.5) {
    score += 15; // Good balance of direction changes
  }

  // Check for arc shape (up then down or down then up)
  const midpoint = Math.floor(pitches.length / 2);
  const firstHalf = pitches.slice(0, midpoint);
  const secondHalf = pitches.slice(midpoint);

  const firstTrend = firstHalf.length > 1 ? firstHalf[firstHalf.length - 1]! - firstHalf[0]! : 0;
  const secondTrend = secondHalf.length > 1 ? secondHalf[secondHalf.length - 1]! - secondHalf[0]! : 0;

  if ((firstTrend > 2 && secondTrend < -2) || (firstTrend < -2 && secondTrend > 2)) {
    score += 15; // Arc shape is memorable
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Analyze repetition balance
 * Good motifs have some repetition for memorability but not too much
 */
export function analyzeRepetitionBalance(notes: MotifNote[]): number {
  if (notes.length < 4) return 50;

  const sortedNotes = [...notes].sort((a, b) => a.time - b.time);

  // Check for repeated pitch patterns
  let repeatedPitches = 0;
  const pitchCounts = new Map<number, number>();
  for (const note of sortedNotes) {
    const count = (pitchCounts.get(note.pitch) || 0) + 1;
    pitchCounts.set(note.pitch, count);
    if (count > 1) repeatedPitches++;
  }

  // Check for repeated intervals
  const intervals: number[] = [];
  for (let i = 1; i < sortedNotes.length; i++) {
    intervals.push(sortedNotes[i]!.pitch - sortedNotes[i - 1]!.pitch);
  }

  let repeatedIntervals = 0;
  const intervalCounts = new Map<number, number>();
  for (const interval of intervals) {
    const count = (intervalCounts.get(interval) || 0) + 1;
    intervalCounts.set(interval, count);
    if (count > 1) repeatedIntervals++;
  }

  // Calculate repetition ratio
  const pitchRepetitionRatio = repeatedPitches / sortedNotes.length;
  const intervalRepetitionRatio = intervals.length > 0 ? repeatedIntervals / intervals.length : 0;
  const avgRepetition = (pitchRepetitionRatio + intervalRepetitionRatio) / 2;

  // Ideal repetition is 20-50%
  let score = 50;
  if (avgRepetition >= 0.2 && avgRepetition <= 0.5) {
    score = 90; // Ideal balance
  } else if (avgRepetition < 0.1) {
    score = 60; // Too unique, might not be memorable
  } else if (avgRepetition > 0.7) {
    score = 40; // Too repetitive
  }

  return score;
}

/**
 * Score memorability based on repetition, contour, and patterns
 */
export function scoreMemorability(motif: MotifSeed): number {
  const { notes } = motif;

  const contourScore = analyzeContour(notes);
  const repetitionScore = analyzeRepetitionBalance(notes);

  // Simple motifs are more memorable
  const lengthPenalty = notes.length > 16 ? (notes.length - 16) * 2 : 0;

  // Large range can hurt memorability
  const pitches = notes.map((n) => n.pitch);
  const range = Math.max(...pitches) - Math.min(...pitches);
  const rangePenalty = range > 24 ? (range - 24) * 1.5 : 0;

  const rawScore = contourScore * 0.4 + repetitionScore * 0.6;
  return Math.max(0, Math.min(100, rawScore - lengthPenalty - rangePenalty));
}

/**
 * Score singability based on interval sizes and phrase structure
 */
export function scoreSingability(motif: MotifSeed): number {
  const { notes } = motif;
  if (notes.length === 0) return 0;
  if (notes.length === 1) return 70;

  let score = 70; // Base score

  const sortedNotes = [...notes].sort((a, b) => a.time - b.time);

  // Check interval sizes (stepwise motion is more singable)
  let largeLeaps = 0;
  for (let i = 1; i < sortedNotes.length; i++) {
    const interval = Math.abs(sortedNotes[i]!.pitch - sortedNotes[i - 1]!.pitch);
    if (interval > 7) largeLeaps++; // Greater than a fifth
    if (interval > 12) largeLeaps++; // Greater than an octave (double penalty)
  }

  const leapRatio = largeLeaps / (sortedNotes.length - 1);
  score -= leapRatio * 40; // Penalize leaps

  // Check range (most voices have ~1.5 octave comfortable range)
  const pitches = sortedNotes.map((n) => n.pitch);
  const range = Math.max(...pitches) - Math.min(...pitches);
  if (range <= 12) {
    score += 15; // Within an octave
  } else if (range <= 19) {
    score += 5; // Within 1.5 octaves
  } else {
    score -= 15; // Too wide
  }

  // Check for breath-friendly phrase lengths
  const maxNoteDuration = Math.max(...notes.map((n) => n.duration));
  const totalDuration = Math.max(...notes.map((n) => n.time + n.duration));
  const avgRestSpace = (totalDuration - notes.reduce((sum, n) => sum + n.duration, 0)) / notes.length;

  if (avgRestSpace >= 0.25) {
    score += 10; // Room to breathe
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Score tension/relief balance
 */
export function scoreTensionRelief(motif: MotifSeed, key?: string): number {
  const { notes } = motif;
  if (notes.length < 3) return 50;

  let score = 50;
  const effectiveKey = key || motif.key || "C";
  const scale = motif.scale || "major";

  // Get scale pitch classes
  let scalePitchClasses: number[];
  try {
    scalePitchClasses = getScalePitchClasses(effectiveKey, scale as keyof typeof SCALES);
  } catch {
    scalePitchClasses = getScalePitchClasses("C", "major");
  }

  const sortedNotes = [...notes].sort((a, b) => a.time - b.time);

  // Count scale tones vs non-scale tones
  let scaleTones = 0;
  let nonScaleTones = 0;
  for (const note of sortedNotes) {
    const pitchClass = getPitchClass(note.pitch);
    if (scalePitchClasses.includes(pitchClass)) {
      scaleTones++;
    } else {
      nonScaleTones++;
    }
  }

  // Some tension (non-scale tones) is good, but should resolve
  const tensionRatio = nonScaleTones / sortedNotes.length;
  if (tensionRatio >= 0.1 && tensionRatio <= 0.3) {
    score += 25; // Good tension
  } else if (tensionRatio > 0.5) {
    score -= 15; // Too much tension
  }

  // Check if phrase ends on a scale tone (resolution)
  const lastNote = sortedNotes[sortedNotes.length - 1]!;
  const lastPitchClass = getPitchClass(lastNote.pitch);
  if (scalePitchClasses.includes(lastPitchClass)) {
    score += 15; // Ends on resolution
    // Bonus for ending on root or fifth
    if (lastPitchClass === scalePitchClasses[0] || lastPitchClass === scalePitchClasses[4]) {
      score += 10;
    }
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Score novelty based on interval variety and unusual patterns
 */
export function scoreNovelty(motif: MotifSeed): number {
  const intervalVariety = analyzeIntervalVariety(motif.notes);
  const rhythmicInterest = analyzeRhythmicInterest(motif.notes);

  // Novelty comes from variety and unexpected patterns
  let score = (intervalVariety * 0.5 + rhythmicInterest * 0.5);

  // Check for unusual intervals (augmented, diminished)
  const sortedNotes = [...motif.notes].sort((a, b) => a.time - b.time);
  let unusualIntervals = 0;
  for (let i = 1; i < sortedNotes.length; i++) {
    const interval = Math.abs(sortedNotes[i]!.pitch - sortedNotes[i - 1]!.pitch) % 12;
    if ([1, 6, 10, 11].includes(interval)) {
      unusualIntervals++; // Minor 2nd, tritone, minor 7th, major 7th
    }
  }

  const unusualRatio = sortedNotes.length > 1 ? unusualIntervals / (sortedNotes.length - 1) : 0;
  if (unusualRatio >= 0.1 && unusualRatio <= 0.3) {
    score += 15; // Some spice
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Score genre fit for a motif
 */
export function scoreMotifGenreFit(motif: MotifSeed, stylePrior: StylePrior): number {
  let score = 60; // Base score

  // Check if motif type aligns with genre expectations
  const drumGenres = ["techno", "house", "dnb"];
  const melodicGenres = ["trance", "pop", "progressive"];

  const genreKeywords = stylePrior.guardrails.energyProfile.toLowerCase();

  if (motif.type === "rhythmic" && drumGenres.some((g) => genreKeywords.includes(g))) {
    score += 20;
  }

  if (motif.type === "melodic" && melodicGenres.some((g) => genreKeywords.includes(g))) {
    score += 20;
  }

  // Check if motif complexity matches genre
  const complexity = analyzeIntervalVariety(motif.notes) + analyzeRhythmicInterest(motif.notes);
  const avgComplexity = complexity / 2;

  // Minimal genres prefer simpler motifs
  const minimalGenres = ["minimal", "ambient", "techno"];
  if (minimalGenres.some((g) => genreKeywords.includes(g)) && avgComplexity < 50) {
    score += 15;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate detailed motif breakdown
 */
export function calculateMotifBreakdown(motif: MotifSeed): MotifBreakdown {
  return {
    intervalVariety: analyzeIntervalVariety(motif.notes),
    rhythmicInterest: analyzeRhythmicInterest(motif.notes),
    contour: analyzeContour(motif.notes),
    repetitionBalance: analyzeRepetitionBalance(motif.notes),
  };
}

/**
 * Calculate overall motif score
 */
export function calculateMotifScore(motif: MotifSeed, stylePrior: StylePrior): MotifScore {
  const memorability = scoreMemorability(motif);
  const singability = scoreSingability(motif);
  const tensionRelief = scoreTensionRelief(motif, motif.key);
  const novelty = scoreNovelty(motif);
  const genreFit = scoreMotifGenreFit(motif, stylePrior);
  const breakdown = calculateMotifBreakdown(motif);

  // Weighted overall score
  const overall = Math.round(
    memorability * 0.25 +
      singability * 0.2 +
      tensionRelief * 0.2 +
      novelty * 0.15 +
      genreFit * 0.2
  );

  return {
    motifId: motif.id,
    memorability,
    singability,
    tensionRelief,
    novelty,
    genreFit,
    overall,
    breakdown,
  };
}

/**
 * Rank multiple motifs by score
 */
export function rankMotifs(
  motifs: MotifSeed[],
  stylePrior: StylePrior
): Array<{ motif: MotifSeed; score: MotifScore }> {
  const scored = motifs.map((motif) => ({
    motif,
    score: calculateMotifScore(motif, stylePrior),
  }));

  return scored.sort((a, b) => b.score.overall - a.score.overall);
}
