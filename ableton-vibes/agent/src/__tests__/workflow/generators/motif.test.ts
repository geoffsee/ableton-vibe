import { describe, it, expect } from "vitest";
import {
  generateScaleMotif,
  generateArpeggioMotif,
  generateContourMotif,
  generateRhythmicMotif,
  generateEuclideanMotif,
  generateChordMotif,
  generateTexturalMotif,
  generateBassMotif,
  varyMotif,
  createMotifSeed,
  generateMotifCandidates,
} from "../../../workflow/generators/motif";
import type { StylePrior } from "../../../workflow/types";

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

describe("Motif Generators", () => {
  describe("generateScaleMotif", () => {
    it("should generate ascending scale notes", () => {
      const notes = generateScaleMotif("C", "major", 4, 4, 0.5);

      expect(notes.length).toBe(4);
      // Notes should be ascending
      for (let i = 1; i < notes.length; i++) {
        expect(notes[i]!.pitch).toBeGreaterThan(notes[i - 1]!.pitch);
      }
    });

    it("should respect note duration", () => {
      const notes = generateScaleMotif("C", "major", 4, 4, 0.25);

      expect(notes.every((n) => n.duration === 0.25)).toBe(true);
      expect(notes[1]!.time).toBe(0.25);
    });
  });

  describe("generateArpeggioMotif", () => {
    it("should generate ascending arpeggio", () => {
      const notes = generateArpeggioMotif(60, "up", [0, 4, 7, 12]);

      expect(notes.length).toBe(4);
      expect(notes[0]!.pitch).toBe(60);
      expect(notes[1]!.pitch).toBe(64);
      expect(notes[2]!.pitch).toBe(67);
      expect(notes[3]!.pitch).toBe(72);
    });

    it("should generate descending arpeggio", () => {
      const notes = generateArpeggioMotif(60, "down", [0, 4, 7, 12]);

      expect(notes[0]!.pitch).toBe(72);
      expect(notes[notes.length - 1]!.pitch).toBe(60);
    });

    it("should generate up-down arpeggio", () => {
      const notes = generateArpeggioMotif(60, "updown", [0, 4, 7]);

      expect(notes.length).toBe(4); // 3 up + 1 back down (middle note)
    });

    it("should accent the first note", () => {
      const notes = generateArpeggioMotif(60, "up");

      expect(notes[0]!.velocity).toBe(100);
      expect(notes[1]!.velocity).toBe(85);
    });
  });

  describe("generateContourMotif", () => {
    it("should generate arch contour", () => {
      const notes = generateContourMotif("C", "major", "arch", 8);

      expect(notes.length).toBe(8);
      // Arch should go up then down
      const midpoint = Math.floor(notes.length / 2);
      expect(notes[midpoint]!.pitch).toBeGreaterThan(notes[0]!.pitch);
      expect(notes[midpoint]!.pitch).toBeGreaterThan(notes[notes.length - 1]!.pitch);
    });

    it("should generate ascending contour", () => {
      const notes = generateContourMotif("C", "major", "ascending", 6);

      expect(notes.length).toBe(6);
      // Should generally trend upward
      expect(notes[notes.length - 1]!.pitch).toBeGreaterThanOrEqual(notes[0]!.pitch);
    });

    it("should generate descending contour", () => {
      const notes = generateContourMotif("C", "major", "descending", 6);

      expect(notes.length).toBe(6);
      // First note should be higher than last
      expect(notes[0]!.pitch).toBeGreaterThan(notes[notes.length - 1]!.pitch);
    });
  });

  describe("generateRhythmicMotif", () => {
    it("should generate notes at specified pattern positions", () => {
      const pattern = [0, 4, 8, 12];
      const notes = generateRhythmicMotif(60, pattern, 0.25);

      expect(notes.length).toBe(4);
      expect(notes.map((n) => n.time)).toEqual([0, 1, 2, 3]); // 0.25 * step
      expect(notes.every((n) => n.pitch === 60)).toBe(true);
    });

    it("should apply accents correctly", () => {
      const notes = generateRhythmicMotif(60, [0, 2, 4, 6], 0.25, [0, 4]);

      expect(notes[0]!.velocity).toBe(100); // Accented
      expect(notes[1]!.velocity).toBe(70); // Not accented
      expect(notes[2]!.velocity).toBe(100); // Accented
    });
  });

  describe("generateEuclideanMotif", () => {
    it("should generate euclidean distributed notes", () => {
      const notes = generateEuclideanMotif(60, 5, 16);

      expect(notes.length).toBe(5);
      expect(notes.every((n) => n.pitch === 60)).toBe(true);
    });
  });

  describe("generateChordMotif", () => {
    it("should generate block chords", () => {
      const notes = generateChordMotif([48, 53], "major", 1);

      // Two chords, 3 notes each (major triad)
      expect(notes.length).toBe(6);
      // First chord at time 0
      expect(notes.filter((n) => n.time === 0).length).toBe(3);
    });

    it("should generate seventh chords", () => {
      const notes = generateChordMotif([48], "seventh", 1);

      // One chord, 4 notes (seventh chord)
      expect(notes.length).toBe(4);
    });
  });

  describe("generateTexturalMotif", () => {
    it("should generate sparse texture", () => {
      const notes = generateTexturalMotif("C", "minor", "sparse", 2);

      // Sparse = 2 notes per bar * 2 bars = 4 notes
      expect(notes.length).toBe(4);
    });

    it("should generate dense texture with more notes", () => {
      const sparse = generateTexturalMotif("C", "minor", "sparse", 2);
      const dense = generateTexturalMotif("C", "minor", "dense", 2);

      expect(dense.length).toBeGreaterThan(sparse.length);
    });

    it("should have soft velocities", () => {
      const notes = generateTexturalMotif("C", "minor", "medium", 1);

      // Textural notes should be relatively soft (50-90)
      expect(notes.every((n) => n.velocity < 100)).toBe(true);
    });
  });

  describe("generateBassMotif", () => {
    it("should generate root note pattern", () => {
      const notes = generateBassMotif("C", "major", "root", 1);

      expect(notes.length).toBe(4); // One per beat
      expect(notes.every((n) => n.duration === 1)).toBe(true);
    });

    it("should generate walking bass pattern", () => {
      const notes = generateBassMotif("C", "major", "walking", 1);

      expect(notes.length).toBe(8);
      expect(notes.every((n) => n.duration === 0.5)).toBe(true);
    });

    it("should generate syncopated bass pattern", () => {
      const notes = generateBassMotif("C", "major", "syncopated", 1);

      // Should have varied timing
      const times = notes.map((n) => n.time);
      expect(new Set(times).size).toBe(times.length); // All unique times
    });
  });

  describe("varyMotif", () => {
    it("should transpose motif", () => {
      const original = generateScaleMotif("C", "major", 4, 4);
      const transposed = varyMotif(original, "transpose", 12);

      expect(transposed.length).toBe(original.length);
      transposed.forEach((n, i) => {
        expect(n.pitch).toBe(original[i]!.pitch + 12);
      });
    });

    it("should invert motif", () => {
      const original = [
        { pitch: 60, time: 0, duration: 0.5, velocity: 100 },
        { pitch: 64, time: 0.5, duration: 0.5, velocity: 100 },
      ];
      const inverted = varyMotif(original, "invert", 60);

      expect(inverted[0]!.pitch).toBe(60); // Pivot stays same
      expect(inverted[1]!.pitch).toBe(56); // 64 - 60 = 4 down from pivot = 60 - 4 = 56
    });

    it("should retrograde motif", () => {
      const original = [
        { pitch: 60, time: 0, duration: 0.5, velocity: 100 },
        { pitch: 64, time: 0.5, duration: 0.5, velocity: 100 },
        { pitch: 67, time: 1, duration: 0.5, velocity: 100 },
      ];
      const retrograded = varyMotif(original, "retrograde");

      expect(retrograded[0]!.pitch).toBe(67);
      expect(retrograded[2]!.pitch).toBe(60);
    });

    it("should augment motif timing", () => {
      const original = [
        { pitch: 60, time: 0, duration: 0.5, velocity: 100 },
        { pitch: 64, time: 0.5, duration: 0.5, velocity: 100 },
      ];
      const augmented = varyMotif(original, "augment", 2);

      expect(augmented[0]!.time).toBe(0);
      expect(augmented[0]!.duration).toBe(1);
      expect(augmented[1]!.time).toBe(1);
    });

    it("should diminish motif timing", () => {
      const original = [
        { pitch: 60, time: 0, duration: 1, velocity: 100 },
        { pitch: 64, time: 1, duration: 1, velocity: 100 },
      ];
      const diminished = varyMotif(original, "diminish", 0.5);

      expect(diminished[0]!.duration).toBe(0.5);
      expect(diminished[1]!.time).toBe(0.5);
    });
  });

  describe("createMotifSeed", () => {
    it("should create a valid MotifSeed", () => {
      const notes = generateScaleMotif("C", "major", 4, 4);
      const seed = createMotifSeed(notes, "melodic", "C", "major", "Test motif");

      expect(seed.id).toBeDefined();
      expect(seed.type).toBe("melodic");
      expect(seed.name).toBe("Test motif");
      expect(seed.notes).toBe(notes);
      expect(seed.key).toBe("C");
      expect(seed.scale).toBe("major");
      expect(seed.lengthBars).toBeGreaterThan(0);
    });
  });

  describe("generateMotifCandidates", () => {
    const stylePrior = createStylePrior();

    it("should generate melodic candidates", () => {
      const candidates = generateMotifCandidates(stylePrior, "melodic", "C", "minor", 5);

      expect(candidates.length).toBeLessThanOrEqual(5);
      expect(candidates.every((c) => c.type === "melodic")).toBe(true);
    });

    it("should generate rhythmic candidates", () => {
      const candidates = generateMotifCandidates(stylePrior, "rhythmic", "C", "minor", 5);

      expect(candidates.length).toBeLessThanOrEqual(5);
      expect(candidates.every((c) => c.type === "rhythmic")).toBe(true);
    });

    it("should generate harmonic candidates", () => {
      const candidates = generateMotifCandidates(stylePrior, "harmonic", "C", "minor", 5);

      expect(candidates.length).toBeLessThanOrEqual(5);
      expect(candidates.every((c) => c.type === "harmonic")).toBe(true);
    });

    it("should generate textural candidates", () => {
      const candidates = generateMotifCandidates(stylePrior, "textural", "C", "minor", 5);

      expect(candidates.length).toBeLessThanOrEqual(5);
      expect(candidates.every((c) => c.type === "textural")).toBe(true);
    });
  });
});
