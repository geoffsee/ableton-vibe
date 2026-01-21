import { describe, it, expect } from "vitest";
import {
  scoreMemorability,
  scoreSingability,
  scoreTensionRelief,
  scoreNovelty,
  analyzeIntervalVariety,
  analyzeContour,
  analyzeRepetitionBalance,
  analyzeRhythmicInterest,
  calculateMotifScore,
} from "../../../workflow/scoring/motif";
import type { MotifSeed, StylePrior, MotifNote } from "../../../workflow/types";

// Helper to create notes
function createNotes(pitches: number[], startTime = 0, duration = 0.5): MotifNote[] {
  return pitches.map((pitch, i) => ({
    pitch,
    time: startTime + i * duration,
    duration,
    velocity: 100,
  }));
}

// Helper to create a motif
function createMotif(overrides: Partial<MotifSeed> = {}): MotifSeed {
  return {
    id: "test-motif",
    type: "melodic",
    name: "Test Motif",
    notes: createNotes([60, 62, 64, 65, 67]), // C D E F G - ascending scale
    lengthBars: 1,
    key: "C",
    scale: "major",
    description: "Test motif",
    ...overrides,
  };
}

// Helper to create style prior
function createStylePrior(overrides: Partial<StylePrior> = {}): StylePrior {
  return {
    bpmSignature: { typical: 128, variance: 5 },
    swingProfile: { amount: 0, subdivision: "8th" },
    soundDesignTraits: [],
    arrangementNorms: {
      typicalIntroLength: 8,
      typicalDropLength: 16,
      typicalBreakdownLength: 8,
      transitionStyle: ["riser"],
    },
    guardrails: { energyProfile: "driving house", avoidCliches: [] },
    ...overrides,
  };
}

describe("Motif Scoring", () => {
  describe("analyzeIntervalVariety", () => {
    it("should return 50 for single note", () => {
      const notes = createNotes([60]);
      expect(analyzeIntervalVariety(notes)).toBe(50);
    });

    it("should score higher for more variety", () => {
      const stepwise = createNotes([60, 62, 64, 65]); // All seconds
      const varied = createNotes([60, 67, 62, 72]); // Different intervals

      expect(analyzeIntervalVariety(varied)).toBeGreaterThan(analyzeIntervalVariety(stepwise));
    });

    it("should handle repeated notes", () => {
      const repeated = createNotes([60, 60, 60, 60]);
      // All same notes means 0 unique intervals
      expect(analyzeIntervalVariety(repeated)).toBe(0);
    });
  });

  describe("analyzeRhythmicInterest", () => {
    it("should return 0 for empty notes", () => {
      expect(analyzeRhythmicInterest([])).toBe(0);
    });

    it("should score higher for varied durations", () => {
      const uniform: MotifNote[] = [
        { pitch: 60, time: 0, duration: 0.5, velocity: 100 },
        { pitch: 62, time: 0.5, duration: 0.5, velocity: 100 },
        { pitch: 64, time: 1, duration: 0.5, velocity: 100 },
      ];
      const varied: MotifNote[] = [
        { pitch: 60, time: 0, duration: 1, velocity: 100 },
        { pitch: 62, time: 1, duration: 0.25, velocity: 100 },
        { pitch: 64, time: 1.25, duration: 0.5, velocity: 100 },
      ];

      expect(analyzeRhythmicInterest(varied)).toBeGreaterThan(analyzeRhythmicInterest(uniform));
    });
  });

  describe("analyzeContour", () => {
    it("should score ascending melody well", () => {
      const ascending = createNotes([60, 62, 64, 67, 69, 72]);
      const score = analyzeContour(ascending);
      expect(score).toBeGreaterThan(60);
    });

    it("should score arch shape highly", () => {
      // Up then down
      const arch = createNotes([60, 64, 67, 72, 67, 64, 60]);
      const flat = createNotes([60, 61, 60, 61, 60, 61, 60]);

      expect(analyzeContour(arch)).toBeGreaterThan(analyzeContour(flat));
    });

    it("should return 50 for very short melodies", () => {
      const short = createNotes([60, 62]);
      expect(analyzeContour(short)).toBe(50);
    });
  });

  describe("analyzeRepetitionBalance", () => {
    it("should score repetitive patterns lower", () => {
      const repetitive = createNotes([60, 60, 60, 60, 60, 60, 60, 60]);
      const varied = createNotes([60, 62, 64, 65, 67, 69, 71, 72]);

      expect(analyzeRepetitionBalance(varied)).toBeGreaterThan(
        analyzeRepetitionBalance(repetitive)
      );
    });

    it("should prefer moderate repetition", () => {
      // Some repetition is good for memorability
      const someRepetition = createNotes([60, 62, 60, 64, 60, 65]);
      const score = analyzeRepetitionBalance(someRepetition);
      expect(score).toBeGreaterThanOrEqual(50);
    });
  });

  describe("scoreMemorability", () => {
    it("should score simple, clear motifs higher", () => {
      const simple = createMotif({
        notes: createNotes([60, 62, 64, 62, 60]), // Simple arc
      });
      const complex = createMotif({
        notes: createNotes([60, 73, 55, 68, 49, 75, 52, 70, 58, 65, 48, 72, 54, 67, 50, 69, 56, 63]),
      });

      expect(scoreMemorability(simple)).toBeGreaterThan(scoreMemorability(complex));
    });

    it("should penalize very wide range", () => {
      const narrow = createMotif({
        notes: createNotes([60, 62, 64, 65, 67]), // Within octave
      });
      const wide = createMotif({
        notes: createNotes([36, 84, 48, 72, 60]), // 4 octave range
      });

      expect(scoreMemorability(narrow)).toBeGreaterThan(scoreMemorability(wide));
    });
  });

  describe("scoreSingability", () => {
    it("should prefer stepwise motion", () => {
      const stepwise = createMotif({
        notes: createNotes([60, 62, 64, 65, 67]), // All steps
      });
      const leapy = createMotif({
        notes: createNotes([60, 72, 55, 79, 48]), // Large leaps
      });

      expect(scoreSingability(stepwise)).toBeGreaterThan(scoreSingability(leapy));
    });

    it("should reward narrow range", () => {
      const narrow = createMotif({
        notes: createNotes([60, 62, 64, 62, 60]), // Within fifth
      });
      const wide = createMotif({
        notes: createNotes([48, 60, 72, 84, 72]), // 3 octaves
      });

      expect(scoreSingability(narrow)).toBeGreaterThan(scoreSingability(wide));
    });

    it("should handle single note", () => {
      const single = createMotif({ notes: createNotes([60]) });
      expect(scoreSingability(single)).toBe(70);
    });
  });

  describe("scoreTensionRelief", () => {
    it("should reward resolution to scale tones", () => {
      const resolved = createMotif({
        key: "C",
        scale: "major",
        notes: createNotes([60, 62, 64, 65, 64, 62, 60]), // Returns to tonic
      });
      const unresolved = createMotif({
        key: "C",
        scale: "major",
        notes: createNotes([60, 62, 64, 66, 68, 70, 71]), // Ends on leading tone
      });

      expect(scoreTensionRelief(resolved)).toBeGreaterThan(scoreTensionRelief(unresolved));
    });

    it("should reward moderate tension", () => {
      const someTension = createMotif({
        key: "C",
        scale: "major",
        notes: createNotes([60, 62, 63, 64, 65, 67]), // One chromatic note
      });
      const allDiatonic = createMotif({
        key: "C",
        scale: "major",
        notes: createNotes([60, 62, 64, 65, 67, 69]),
      });

      // Some tension is rewarded
      const tensionScore = scoreTensionRelief(someTension);
      expect(tensionScore).toBeGreaterThanOrEqual(50);
    });
  });

  describe("scoreNovelty", () => {
    it("should score varied motifs higher", () => {
      const novel = createMotif({
        notes: [
          { pitch: 60, time: 0, duration: 0.25, velocity: 100 },
          { pitch: 66, time: 0.25, duration: 1, velocity: 80 },
          { pitch: 61, time: 1.5, duration: 0.5, velocity: 110 },
          { pitch: 68, time: 2, duration: 0.25, velocity: 90 },
        ],
      });
      const repetitive = createMotif({
        notes: createNotes([60, 60, 60, 60, 60]),
      });

      expect(scoreNovelty(novel)).toBeGreaterThan(scoreNovelty(repetitive));
    });
  });

  describe("calculateMotifScore", () => {
    it("should return complete score object", () => {
      const motif = createMotif();
      const stylePrior = createStylePrior();

      const score = calculateMotifScore(motif, stylePrior);

      expect(score.motifId).toBe(motif.id);
      expect(score.memorability).toBeGreaterThanOrEqual(0);
      expect(score.memorability).toBeLessThanOrEqual(100);
      expect(score.singability).toBeGreaterThanOrEqual(0);
      expect(score.singability).toBeLessThanOrEqual(100);
      expect(score.tensionRelief).toBeGreaterThanOrEqual(0);
      expect(score.tensionRelief).toBeLessThanOrEqual(100);
      expect(score.novelty).toBeGreaterThanOrEqual(0);
      expect(score.novelty).toBeLessThanOrEqual(100);
      expect(score.genreFit).toBeGreaterThanOrEqual(0);
      expect(score.genreFit).toBeLessThanOrEqual(100);
      expect(score.overall).toBeGreaterThanOrEqual(0);
      expect(score.overall).toBeLessThanOrEqual(100);
      expect(score.breakdown).toBeDefined();
    });
  });
});
