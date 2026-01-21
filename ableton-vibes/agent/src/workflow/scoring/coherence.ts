/**
 * Coherence scoring functions for voice-leading, density, and register collision detection
 */

import type {
  SectionComposition,
  ArrangementSection,
  CompositionScore,
  Voice,
  MotifNote,
} from "../types";

/**
 * Check for parallel fifths between two voice lines
 * Returns count of parallel fifth instances (lower is better)
 */
export function checkParallelFifths(
  voice1: MotifNote[],
  voice2: MotifNote[]
): number {
  if (voice1.length < 2 || voice2.length < 2) return 0;

  const sorted1 = [...voice1].sort((a, b) => a.time - b.time);
  const sorted2 = [...voice2].sort((a, b) => a.time - b.time);

  let parallelFifths = 0;

  // Find simultaneous notes
  for (let i = 0; i < sorted1.length - 1; i++) {
    const note1a = sorted1[i]!;
    const note1b = sorted1[i + 1]!;

    // Find corresponding notes in voice2 at similar times
    const note2a = sorted2.find(
      (n) => Math.abs(n.time - note1a.time) < 0.1
    );
    const note2b = sorted2.find(
      (n) => Math.abs(n.time - note1b.time) < 0.1
    );

    if (note2a && note2b) {
      const interval1 = Math.abs(note1a.pitch - note2a.pitch) % 12;
      const interval2 = Math.abs(note1b.pitch - note2b.pitch) % 12;

      // Check for parallel perfect fifths (7 semitones)
      if (interval1 === 7 && interval2 === 7) {
        // Check if both voices moved in the same direction
        const motion1 = note1b.pitch - note1a.pitch;
        const motion2 = note2b.pitch - note2a.pitch;

        if ((motion1 > 0 && motion2 > 0) || (motion1 < 0 && motion2 < 0)) {
          parallelFifths++;
        }
      }
    }
  }

  return parallelFifths;
}

/**
 * Check for parallel octaves between two voice lines
 */
export function checkParallelOctaves(
  voice1: MotifNote[],
  voice2: MotifNote[]
): number {
  if (voice1.length < 2 || voice2.length < 2) return 0;

  const sorted1 = [...voice1].sort((a, b) => a.time - b.time);
  const sorted2 = [...voice2].sort((a, b) => a.time - b.time);

  let parallelOctaves = 0;

  for (let i = 0; i < sorted1.length - 1; i++) {
    const note1a = sorted1[i]!;
    const note1b = sorted1[i + 1]!;

    const note2a = sorted2.find(
      (n) => Math.abs(n.time - note1a.time) < 0.1
    );
    const note2b = sorted2.find(
      (n) => Math.abs(n.time - note1b.time) < 0.1
    );

    if (note2a && note2b) {
      const interval1 = Math.abs(note1a.pitch - note2a.pitch) % 12;
      const interval2 = Math.abs(note1b.pitch - note2b.pitch) % 12;

      // Check for parallel octaves/unisons (0 semitones)
      if (interval1 === 0 && interval2 === 0) {
        const motion1 = note1b.pitch - note1a.pitch;
        const motion2 = note2b.pitch - note2a.pitch;

        if ((motion1 > 0 && motion2 > 0) || (motion1 < 0 && motion2 < 0)) {
          parallelOctaves++;
        }
      }
    }
  }

  return parallelOctaves;
}

/**
 * Analyze voice independence (how distinct are the lines)
 * Returns 0-100 where higher means more independent voices
 */
export function analyzeVoiceIndependence(voices: Voice[]): number {
  if (voices.length < 2) return 100;

  let totalOverlap = 0;
  let comparisons = 0;

  for (let i = 0; i < voices.length; i++) {
    for (let j = i + 1; j < voices.length; j++) {
      const voice1 = voices[i]!;
      const voice2 = voices[j]!;

      // Check for rhythmic overlap (notes at same time)
      const times1 = new Set(voice1.notes.map((n) => Math.round(n.time * 16) / 16));
      const times2 = new Set(voice2.notes.map((n) => Math.round(n.time * 16) / 16));

      const overlap = [...times1].filter((t) => times2.has(t)).length;
      const maxNotes = Math.max(times1.size, times2.size);

      if (maxNotes > 0) {
        totalOverlap += overlap / maxNotes;
        comparisons++;
      }
    }
  }

  if (comparisons === 0) return 100;

  // More overlap = less independence
  const avgOverlap = totalOverlap / comparisons;
  return Math.round((1 - avgOverlap * 0.5) * 100); // Some overlap is fine
}

/**
 * Score voice-leading sanity
 */
export function scoreVoiceLeading(composition: SectionComposition): number {
  const { voices } = composition;

  if (voices.length < 2) return 100; // Single voice is always good

  let totalParallelFifths = 0;
  let totalParallelOctaves = 0;
  let comparisons = 0;

  // Check all voice pairs
  for (let i = 0; i < voices.length; i++) {
    for (let j = i + 1; j < voices.length; j++) {
      totalParallelFifths += checkParallelFifths(voices[i]!.notes, voices[j]!.notes);
      totalParallelOctaves += checkParallelOctaves(voices[i]!.notes, voices[j]!.notes);
      comparisons++;
    }
  }

  // Start with perfect score and penalize issues
  let score = 100;
  score -= totalParallelFifths * 5; // -5 per parallel fifth
  score -= totalParallelOctaves * 10; // -10 per parallel octave

  // Add voice independence bonus
  const independence = analyzeVoiceIndependence(voices);
  score = score * 0.7 + independence * 0.3;

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate note density for a section
 */
export function calculateDensity(voices: Voice[], lengthBars: number): number {
  const totalNotes = voices.reduce((sum, v) => sum + v.notes.length, 0);
  return totalNotes / lengthBars;
}

/**
 * Score density appropriateness for section energy level
 */
export function scoreDensity(
  composition: SectionComposition,
  section: ArrangementSection
): number {
  const density = calculateDensity(composition.voices, section.lengthBars);
  const energyLevel = section.energyLevel;

  // Expected density based on energy level
  // Low energy (0-30): 2-10 notes/bar
  // Medium energy (30-70): 10-30 notes/bar
  // High energy (70-100): 30-60 notes/bar
  let expectedMinDensity: number;
  let expectedMaxDensity: number;

  if (energyLevel < 30) {
    expectedMinDensity = 2;
    expectedMaxDensity = 10;
  } else if (energyLevel < 70) {
    expectedMinDensity = 10;
    expectedMaxDensity = 30;
  } else {
    expectedMinDensity = 30;
    expectedMaxDensity = 60;
  }

  // Score based on how well density matches expected range
  if (density >= expectedMinDensity && density <= expectedMaxDensity) {
    return 100; // Perfect match
  }

  // Penalize based on distance from expected range
  let penalty = 0;
  if (density < expectedMinDensity) {
    penalty = (expectedMinDensity - density) * 5;
  } else if (density > expectedMaxDensity) {
    penalty = (density - expectedMaxDensity) * 3;
  }

  return Math.max(0, 100 - penalty);
}

/**
 * Detect register collisions (overlapping frequency ranges)
 * Returns collision count (lower is better)
 */
export function detectRegisterCollisions(composition: SectionComposition): number {
  const { voices, registerDistribution } = composition;

  if (voices.length < 2) return 0;

  let collisions = 0;

  // Check for notes in similar pitch ranges at the same time
  for (let i = 0; i < voices.length; i++) {
    for (let j = i + 1; j < voices.length; j++) {
      const voice1 = voices[i]!;
      const voice2 = voices[j]!;

      // Different roles should be in different registers
      if (voice1.role === voice2.role) continue;

      for (const note1 of voice1.notes) {
        for (const note2 of voice2.notes) {
          // Check if notes overlap in time
          const timeOverlap =
            Math.abs(note1.time - note2.time) < 0.1 ||
            (note1.time < note2.time + note2.duration &&
              note2.time < note1.time + note1.duration);

          if (timeOverlap) {
            // Check pitch proximity (within 3 semitones is a collision)
            const pitchDiff = Math.abs(note1.pitch - note2.pitch);
            if (pitchDiff > 0 && pitchDiff <= 3) {
              collisions++;
            }
          }
        }
      }
    }
  }

  return collisions;
}

/**
 * Score harmonic clarity
 */
export function scoreHarmonicClarity(composition: SectionComposition): number {
  const { harmonyProgression, voices } = composition;

  if (harmonyProgression.length === 0) return 70; // No explicit harmony

  let score = 80; // Base score

  // Check that bass notes align with chord roots
  const bassVoice = voices.find((v) => v.role === "bass");
  if (bassVoice) {
    let alignedRoots = 0;
    let totalBassNotes = 0;

    for (const chord of harmonyProgression) {
      const chordStart = chord.startBeat;
      const chordEnd = chordStart + chord.duration;

      const bassNotesInChord = bassVoice.notes.filter(
        (n) => n.time >= chordStart && n.time < chordEnd
      );

      for (const bassNote of bassNotesInChord) {
        totalBassNotes++;
        // Simple check: bass note on strong beat should match chord root
        if (bassNote.time === chordStart || Math.abs(bassNote.time - chordStart) < 0.1) {
          alignedRoots++;
        }
      }
    }

    if (totalBassNotes > 0) {
      const alignmentRatio = alignedRoots / totalBassNotes;
      score += alignmentRatio * 20 - 10; // Bonus for good alignment
    }
  }

  // Check voice independence contributes to clarity
  const independence = analyzeVoiceIndependence(voices);
  score = score * 0.7 + independence * 0.3;

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate overall composition score
 */
export function calculateCompositionScore(
  composition: SectionComposition,
  section: ArrangementSection
): CompositionScore {
  const voiceLeadingSanity = scoreVoiceLeading(composition);
  const densityScore = scoreDensity(composition, section);
  const registerCollisions = detectRegisterCollisions(composition);
  const harmonicClarity = scoreHarmonicClarity(composition);

  // Convert collisions to a penalty-based score
  const collisionPenalty = Math.min(registerCollisions * 5, 50);
  const registerScore = 100 - collisionPenalty;

  // Weighted overall score
  const overall = Math.round(
    voiceLeadingSanity * 0.3 +
      densityScore * 0.25 +
      registerScore * 0.2 +
      harmonicClarity * 0.25
  );

  return {
    sectionId: composition.sectionId,
    voiceLeadingSanity,
    densityScore,
    registerCollisions,
    harmonicClarity,
    overall,
  };
}

/**
 * Evaluate coherence across multiple sections
 */
export function evaluateOverallCoherence(
  compositions: SectionComposition[],
  sections: ArrangementSection[]
): number {
  if (compositions.length === 0) return 0;

  const scores = compositions.map((comp) => {
    const section = sections.find((s) => s.id === comp.sectionId);
    if (!section) return 50;
    return calculateCompositionScore(comp, section).overall;
  });

  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}
