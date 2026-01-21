import { describe, it, expect } from "vitest";
import {
  PROGRESSION_TEMPLATES,
  degreeToChord,
  generateProgressionFromTemplate,
  generateBasicProgression,
  generatePopProgression,
  generateEDMProgression,
  generateTranceProgression,
  generateJazzProgression,
  generateRandomProgression,
  extendProgression,
  generateProgressionCandidates,
  transposeProgression,
  analyzeProgressionMood,
} from "../../../workflow/generators/harmony";
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

describe("Harmony Generators", () => {
  describe("PROGRESSION_TEMPLATES", () => {
    it("should have common chord progressions", () => {
      expect(PROGRESSION_TEMPLATES["I-V-vi-IV"]).toBeDefined();
      expect(PROGRESSION_TEMPLATES["I-IV-V-I"]).toBeDefined();
      expect(PROGRESSION_TEMPLATES["ii-V-I"]).toBeDefined();
    });

    it("should have valid degree arrays", () => {
      Object.values(PROGRESSION_TEMPLATES).forEach((template) => {
        expect(template.degrees.length).toBeGreaterThan(0);
        expect(template.degrees.every((d) => d >= 1 && d <= 7)).toBe(true);
      });
    });
  });

  describe("degreeToChord", () => {
    it("should convert scale degrees to chord symbols in major", () => {
      expect(degreeToChord(1, "C", "major")).toBe("Cmaj");
      expect(degreeToChord(4, "C", "major")).toBe("Fmaj");
      expect(degreeToChord(5, "C", "major")).toBe("Gmaj");
    });

    it("should convert scale degrees to chord symbols in minor", () => {
      expect(degreeToChord(1, "A", "minor")).toBe("Amin");
      expect(degreeToChord(6, "A", "minor")).toBe("Fmaj");
      expect(degreeToChord(7, "A", "minor")).toBe("Gmaj");
    });

    it("should work with different keys", () => {
      expect(degreeToChord(1, "G", "major")).toBe("Gmaj");
      expect(degreeToChord(1, "F#", "minor")).toBe("F#min");
    });
  });

  describe("generateProgressionFromTemplate", () => {
    it("should generate progression from template", () => {
      const progression = generateProgressionFromTemplate("I-V-vi-IV", "C", "major", 4);

      expect(progression.length).toBe(4);
      expect(progression[0]!.chord).toBe("Cmaj");
      expect(progression[0]!.startBeat).toBe(0);
      expect(progression[0]!.duration).toBe(4);
    });

    it("should throw for unknown template", () => {
      expect(() => generateProgressionFromTemplate("invalid", "C")).toThrow();
    });
  });

  describe("generateBasicProgression", () => {
    it("should generate I-IV-V-I progression", () => {
      const progression = generateBasicProgression("C", "major");

      expect(progression.length).toBe(4);
      expect(progression.map((p) => p.chord)).toContain("Cmaj");
      expect(progression.map((p) => p.chord)).toContain("Fmaj");
      expect(progression.map((p) => p.chord)).toContain("Gmaj");
    });
  });

  describe("generatePopProgression", () => {
    it("should generate standard pop progression", () => {
      const progression = generatePopProgression("G", "standard");

      expect(progression.length).toBe(4);
      // I-V-vi-IV in G
      expect(progression[0]!.chord).toBe("Gmaj");
    });

    it("should generate emotional pop progression", () => {
      const progression = generatePopProgression("G", "emotional");

      expect(progression.length).toBe(4);
      // vi-IV-I-V starts on minor chord
      expect(progression[0]!.chord).toBe("Emin");
    });
  });

  describe("generateEDMProgression", () => {
    it("should generate dark house progression in minor", () => {
      const progression = generateEDMProgression("A", "dark");

      expect(progression.length).toBe(4);
      // Should start on minor i chord
      expect(progression[0]!.chord).toBe("Amin");
    });

    it("should generate driving house progression", () => {
      const progression = generateEDMProgression("A", "driving");

      expect(progression.length).toBe(4);
    });
  });

  describe("generateTranceProgression", () => {
    it("should generate epic trance progression", () => {
      const progression = generateTranceProgression("A", "epic", 8);

      expect(progression.length).toBe(4);
      // Longer chord durations for trance
      expect(progression[0]!.duration).toBe(8);
    });

    it("should generate uplifting trance progression", () => {
      const progression = generateTranceProgression("E", "uplifting");

      expect(progression.length).toBe(4);
    });
  });

  describe("generateJazzProgression", () => {
    it("should generate ii-V-I progression", () => {
      const progression = generateJazzProgression("C", "ii-V-I");

      expect(progression.length).toBe(3);
      // ii-V-I: Dmin, Gmaj, Cmaj
      expect(progression[0]!.chord).toBe("Dmin");
      expect(progression[1]!.chord).toBe("Gmaj");
      expect(progression[2]!.chord).toBe("Cmaj");
    });

    it("should generate turnaround progression", () => {
      const progression = generateJazzProgression("C", "turnaround");

      expect(progression.length).toBe(4);
    });
  });

  describe("generateRandomProgression", () => {
    it("should generate valid progression", () => {
      const progression = generateRandomProgression("C", "minor", 4, 4);

      expect(progression.length).toBe(4);
      // Should start on I
      expect(progression[0]!.startBeat).toBe(0);
    });

    it("should respect chord count", () => {
      const progression = generateRandomProgression("C", "major", 8, 2);

      expect(progression.length).toBe(8);
    });
  });

  describe("extendProgression", () => {
    it("should extend progression to fill bars", () => {
      const base = generateBasicProgression("C", "major", 4);
      const extended = extendProgression(base, 8, 4);

      // 8 bars * 4 beats = 32 beats, should loop the 4-chord progression
      expect(extended.length).toBeGreaterThan(base.length);
    });

    it("should maintain chord timing", () => {
      const base = [
        { startBeat: 0, chord: "Cmaj", duration: 4 },
        { startBeat: 4, chord: "Gmaj", duration: 4 },
      ];
      const extended = extendProgression(base, 4, 4);

      expect(extended[0]!.startBeat).toBe(0);
      expect(extended[1]!.startBeat).toBe(4);
      expect(extended[2]!.startBeat).toBe(8);
    });
  });

  describe("generateProgressionCandidates", () => {
    it("should generate house candidates", () => {
      const stylePrior = createStylePrior({
        guardrails: { energyProfile: "deep house", avoidCliches: [] },
      });

      const candidates = generateProgressionCandidates(stylePrior, "A", 5);

      expect(candidates.length).toBeLessThanOrEqual(5);
      expect(candidates.every((c) => c.name && c.progression.length > 0)).toBe(true);
    });

    it("should generate trance candidates", () => {
      const stylePrior = createStylePrior({
        guardrails: { energyProfile: "uplifting trance", avoidCliches: [] },
      });

      const candidates = generateProgressionCandidates(stylePrior, "E", 5);

      expect(candidates.some((c) => c.name.toLowerCase().includes("trance"))).toBe(true);
    });

    it("should generate pop candidates", () => {
      const stylePrior = createStylePrior({
        guardrails: { energyProfile: "indie pop", avoidCliches: [] },
      });

      const candidates = generateProgressionCandidates(stylePrior, "G", 5);

      expect(candidates.some((c) => c.name.toLowerCase().includes("pop"))).toBe(true);
    });
  });

  describe("transposeProgression", () => {
    it("should transpose up a semitone", () => {
      const original = [
        { startBeat: 0, chord: "Cmaj", duration: 4 },
        { startBeat: 4, chord: "Gmaj", duration: 4 },
      ];
      const transposed = transposeProgression(original, 1);

      expect(transposed[0]!.chord).toBe("C#maj");
      expect(transposed[1]!.chord).toBe("G#maj");
    });

    it("should transpose down (wrap around)", () => {
      const original = [{ startBeat: 0, chord: "Cmaj", duration: 4 }];
      const transposed = transposeProgression(original, -1);

      expect(transposed[0]!.chord).toBe("Bmaj");
    });

    it("should preserve timing", () => {
      const original = [
        { startBeat: 0, chord: "Cmaj", duration: 4 },
        { startBeat: 4, chord: "Gmaj", duration: 4 },
      ];
      const transposed = transposeProgression(original, 5);

      expect(transposed[0]!.startBeat).toBe(0);
      expect(transposed[0]!.duration).toBe(4);
    });
  });

  describe("analyzeProgressionMood", () => {
    it("should identify dark progression", () => {
      const darkProg = [
        { startBeat: 0, chord: "Amin", duration: 4 },
        { startBeat: 4, chord: "Fmin", duration: 4 },
        { startBeat: 8, chord: "Gmin", duration: 4 },
        { startBeat: 12, chord: "Edim", duration: 4 },
      ];

      const analysis = analyzeProgressionMood(darkProg);
      expect(analysis.mood).toBe("dark");
    });

    it("should identify bright progression", () => {
      const brightProg = [
        { startBeat: 0, chord: "Cmaj", duration: 4 },
        { startBeat: 4, chord: "Gmaj", duration: 4 },
        { startBeat: 8, chord: "Fmaj", duration: 4 },
        { startBeat: 12, chord: "Cmaj", duration: 4 },
      ];

      const analysis = analyzeProgressionMood(brightProg);
      expect(analysis.mood).toBe("bright");
    });

    it("should calculate tension from diminished chords", () => {
      const tenseProg = [
        { startBeat: 0, chord: "Cmaj", duration: 4 },
        { startBeat: 4, chord: "Bdim", duration: 4 },
      ];

      const analysis = analyzeProgressionMood(tenseProg);
      expect(analysis.tension).toBeGreaterThan(0);
    });
  });
});
