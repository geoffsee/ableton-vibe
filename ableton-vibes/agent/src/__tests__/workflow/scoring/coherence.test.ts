import { describe, it, expect } from "vitest";
import {
  scoreVoiceLeading,
  scoreDensity,
  detectRegisterCollisions,
  scoreHarmonicClarity,
  calculateCompositionScore,
  checkParallelFifths,
  analyzeVoiceIndependence,
} from "../../../workflow/scoring/coherence";
import type { SectionComposition, ArrangementSection, Voice, MotifNote } from "../../../workflow/types";

// Helper to create notes
function createNotes(pitchTimeVelDur: Array<[number, number, number?, number?]>): MotifNote[] {
  return pitchTimeVelDur.map(([pitch, time, velocity = 100, duration = 0.5]) => ({
    pitch,
    time,
    velocity,
    duration,
  }));
}

// Helper to create a voice
function createVoice(role: Voice["role"], notes: MotifNote[]): Voice {
  return {
    role,
    trackName: `${role}-track`,
    clipName: `${role}-clip`,
    notes,
  };
}

// Helper to create a composition
function createComposition(voices: Voice[]): SectionComposition {
  return {
    sectionId: "test-section",
    voices,
    harmonyProgression: [
      { startBeat: 0, chord: "Cmaj", duration: 4 },
      { startBeat: 4, chord: "Fmaj", duration: 4 },
    ],
    densityLevel: 5,
    registerDistribution: {},
  };
}

// Helper to create a section
function createSection(overrides: Partial<ArrangementSection> = {}): ArrangementSection {
  return {
    id: "test-section",
    type: "verse",
    name: "Test Verse",
    startBar: 0,
    lengthBars: 8,
    energyLevel: 50,
    elements: [],
    ...overrides,
  };
}

describe("Coherence Scoring", () => {
  describe("checkParallelFifths", () => {
    it("should detect parallel fifths", () => {
      // Voice 1: C4 -> D4 (parallel motion)
      // Voice 2: G4 -> A4 (parallel motion, both a fifth apart)
      const voice1 = createNotes([
        [60, 0],
        [62, 1],
      ]);
      const voice2 = createNotes([
        [67, 0],
        [69, 1],
      ]);

      const count = checkParallelFifths(voice1, voice2);
      expect(count).toBeGreaterThan(0);
    });

    it("should not flag contrary motion", () => {
      // Voice 1: C4 -> D4 (up)
      // Voice 2: G4 -> F4 (down)
      const voice1 = createNotes([
        [60, 0],
        [62, 1],
      ]);
      const voice2 = createNotes([
        [67, 0],
        [65, 1],
      ]);

      const count = checkParallelFifths(voice1, voice2);
      expect(count).toBe(0);
    });

    it("should handle empty voices", () => {
      const empty: MotifNote[] = [];
      const voice = createNotes([[60, 0]]);

      expect(checkParallelFifths(empty, voice)).toBe(0);
      expect(checkParallelFifths(voice, empty)).toBe(0);
    });
  });

  describe("analyzeVoiceIndependence", () => {
    it("should score independent voices highly", () => {
      // Different rhythms
      const voice1 = createVoice("topline", createNotes([[60, 0], [62, 1]]));
      const voice2 = createVoice("bass", createNotes([[48, 0.5], [50, 1.5]]));

      const score = analyzeVoiceIndependence([voice1, voice2]);
      expect(score).toBeGreaterThan(70);
    });

    it("should return 100 for single voice", () => {
      const voice = createVoice("topline", createNotes([[60, 0]]));
      expect(analyzeVoiceIndependence([voice])).toBe(100);
    });
  });

  describe("scoreVoiceLeading", () => {
    it("should score good voice leading highly", () => {
      const soprano = createVoice("topline", createNotes([[72, 0], [71, 1], [72, 2]]));
      const alto = createVoice("harmony", createNotes([[67, 0], [67, 1], [68, 2]]));
      const bass = createVoice("bass", createNotes([[48, 0], [50, 1], [48, 2]]));

      const composition = createComposition([soprano, alto, bass]);
      const score = scoreVoiceLeading(composition);

      expect(score).toBeGreaterThan(60);
    });

    it("should return 100 for single voice", () => {
      const voice = createVoice("topline", createNotes([[60, 0], [62, 1]]));
      const composition = createComposition([voice]);

      expect(scoreVoiceLeading(composition)).toBe(100);
    });
  });

  describe("scoreDensity", () => {
    it("should score appropriate density for energy level", () => {
      // High energy section with many notes (need 30-60 notes/bar for high energy)
      const voices = [
        createVoice("rhythm", createNotes(
          Array.from({ length: 256 }, (_, i) => [60, i * 0.125] as [number, number]) // Dense rhythm
        )),
        createVoice("bass", createNotes(
          Array.from({ length: 32 }, (_, i) => [36, i * 1] as [number, number])
        )),
      ];
      const composition = createComposition(voices);
      const highEnergySection = createSection({ energyLevel: 85, lengthBars: 8 });

      const score = scoreDensity(composition, highEnergySection);
      expect(score).toBeGreaterThan(50);
    });

    it("should penalize too sparse for high energy", () => {
      // Very sparse for high energy
      const voices = [createVoice("topline", createNotes([[60, 0], [62, 4]]))];
      const composition = createComposition(voices);
      const highEnergySection = createSection({ energyLevel: 90, lengthBars: 8 });

      const score = scoreDensity(composition, highEnergySection);
      expect(score).toBeLessThan(70);
    });
  });

  describe("detectRegisterCollisions", () => {
    it("should detect notes too close in pitch at same time", () => {
      // Two notes 2 semitones apart at same time
      const voice1 = createVoice("topline", createNotes([[60, 0]]));
      const voice2 = createVoice("harmony", createNotes([[62, 0]]));

      const composition = createComposition([voice1, voice2]);
      const collisions = detectRegisterCollisions(composition);

      expect(collisions).toBeGreaterThan(0);
    });

    it("should not flag well-separated voices", () => {
      // Octave apart
      const voice1 = createVoice("topline", createNotes([[72, 0]]));
      const voice2 = createVoice("bass", createNotes([[48, 0]]));

      const composition = createComposition([voice1, voice2]);
      const collisions = detectRegisterCollisions(composition);

      expect(collisions).toBe(0);
    });

    it("should return 0 for single voice", () => {
      const voice = createVoice("topline", createNotes([[60, 0]]));
      const composition = createComposition([voice]);

      expect(detectRegisterCollisions(composition)).toBe(0);
    });
  });

  describe("scoreHarmonicClarity", () => {
    it("should reward bass aligned with chord roots", () => {
      const bass = createVoice("bass", createNotes([
        [48, 0], // C at chord start
        [53, 4], // F at next chord start
      ]));
      const composition = createComposition([bass]);

      const score = scoreHarmonicClarity(composition);
      expect(score).toBeGreaterThan(70);
    });

    it("should handle empty harmony progression", () => {
      const voice = createVoice("topline", createNotes([[60, 0]]));
      const composition = { ...createComposition([voice]), harmonyProgression: [] };

      const score = scoreHarmonicClarity(composition);
      expect(score).toBe(70); // Default for no explicit harmony
    });
  });

  describe("calculateCompositionScore", () => {
    it("should return complete score object", () => {
      const voice = createVoice("topline", createNotes([[60, 0], [62, 1], [64, 2]]));
      const composition = createComposition([voice]);
      const section = createSection();

      const score = calculateCompositionScore(composition, section);

      expect(score.sectionId).toBe(composition.sectionId);
      expect(score.voiceLeadingSanity).toBeGreaterThanOrEqual(0);
      expect(score.voiceLeadingSanity).toBeLessThanOrEqual(100);
      expect(score.densityScore).toBeGreaterThanOrEqual(0);
      expect(score.densityScore).toBeLessThanOrEqual(100);
      expect(score.registerCollisions).toBeGreaterThanOrEqual(0);
      expect(score.harmonicClarity).toBeGreaterThanOrEqual(0);
      expect(score.harmonicClarity).toBeLessThanOrEqual(100);
      expect(score.overall).toBeGreaterThanOrEqual(0);
      expect(score.overall).toBeLessThanOrEqual(100);
    });
  });
});
