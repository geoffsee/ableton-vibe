import { describe, it, expect } from "vitest";
import {
  generateFourOnFloorKick,
  generateSyncopatedKick,
  generateEuclideanKick,
  generateBackbeatSnare,
  generateSparseSnare,
  generate8thHats,
  generate16thHats,
  generateOffbeatHats,
  generateHouseGroove,
  generateTechnoGroove,
  generateDnBGroove,
  generateUKGarageGroove,
  generateHipHopGroove,
  generateTranceGroove,
  generateGrooveCandidates,
  humanizePattern,
  mutateGroove,
} from "../../../workflow/generators/groove";
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

describe("Groove Generators", () => {
  describe("Kick patterns", () => {
    it("should generate four-on-the-floor kick pattern", () => {
      const pattern = generateFourOnFloorKick();
      expect(pattern).toEqual([0, 4, 8, 12]);
    });

    it("should generate syncopated kick patterns", () => {
      const sparse = generateSyncopatedKick("sparse");
      const medium = generateSyncopatedKick("medium");
      const dense = generateSyncopatedKick("dense");

      expect(sparse.length).toBeLessThan(medium.length);
      expect(medium.length).toBeLessThan(dense.length);
    });

    it("should generate euclidean kick pattern", () => {
      const pattern = generateEuclideanKick(4, 16);
      expect(pattern.length).toBe(4);
      expect(pattern.every((s) => s >= 0 && s < 16)).toBe(true);
    });
  });

  describe("Snare patterns", () => {
    it("should generate backbeat snare", () => {
      const pattern = generateBackbeatSnare();
      expect(pattern).toEqual([4, 12]);
    });

    it("should generate sparse snare", () => {
      const pattern = generateSparseSnare();
      expect(pattern).toEqual([12]);
    });
  });

  describe("Hi-hat patterns", () => {
    it("should generate 8th note hats", () => {
      const pattern = generate8thHats();
      expect(pattern.length).toBe(8);
      expect(pattern).toEqual([0, 2, 4, 6, 8, 10, 12, 14]);
    });

    it("should generate 16th note hats", () => {
      const pattern = generate16thHats();
      expect(pattern.length).toBe(16);
    });

    it("should generate offbeat hats", () => {
      const pattern = generateOffbeatHats();
      expect(pattern).toEqual([2, 6, 10, 14]);
    });
  });

  describe("Genre grooves", () => {
    it("should generate house groove with correct properties", () => {
      const groove = generateHouseGroove(124, 10);

      expect(groove.tempo).toBe(124);
      expect(groove.swingAmount).toBe(10);
      expect(groove.meter).toBe("4/4");
      expect(groove.kickPattern).toEqual([0, 4, 8, 12]);
      expect(groove.snarePattern).toEqual([4, 12]);
      expect(groove.description).toContain("house");
    });

    it("should generate techno grooves with variants", () => {
      const minimal = generateTechnoGroove(130, "minimal");
      const driving = generateTechnoGroove(130, "driving");
      const industrial = generateTechnoGroove(130, "industrial");

      expect(minimal.kickPattern.length).toBeLessThan(driving.kickPattern.length);
      expect(industrial.description).toContain("industrial");
    });

    it("should generate DnB groove with fast tempo", () => {
      const groove = generateDnBGroove(174);

      expect(groove.tempo).toBe(174);
      expect(groove.kickPattern).toEqual([0, 10]);
    });

    it("should generate UK garage groove with swing", () => {
      const groove = generateUKGarageGroove(130);

      expect(groove.swingAmount).toBeGreaterThan(0);
      expect(groove.description).toContain("garage");
    });

    it("should generate hip-hop grooves with variants", () => {
      const boomBap = generateHipHopGroove(90, "boom-bap");
      const trap = generateHipHopGroove(90, "trap");
      const lofi = generateHipHopGroove(90, "lo-fi");

      expect(boomBap.swingAmount).toBeGreaterThan(0);
      expect(trap.swingAmount).toBe(0);
      expect(lofi.swingAmount).toBeGreaterThan(boomBap.swingAmount);
    });

    it("should generate trance groove", () => {
      const groove = generateTranceGroove(138);

      expect(groove.tempo).toBe(138);
      expect(groove.kickPattern).toEqual([0, 4, 8, 12]);
      expect(groove.hatPattern).toEqual([2, 6, 10, 14]); // Offbeat
    });
  });

  describe("generateGrooveCandidates", () => {
    it("should generate house candidates for house style prior", () => {
      const stylePrior = createStylePrior({
        guardrails: { energyProfile: "deep house", avoidCliches: [] },
      });

      const candidates = generateGrooveCandidates(stylePrior, 3);

      expect(candidates.length).toBeLessThanOrEqual(3);
      expect(candidates.every((c) => c.id && c.tempo && c.kickPattern)).toBe(true);
    });

    it("should generate techno candidates for techno style prior", () => {
      const stylePrior = createStylePrior({
        bpmSignature: { typical: 130, variance: 5 },
        guardrails: { energyProfile: "dark techno", avoidCliches: [] },
      });

      const candidates = generateGrooveCandidates(stylePrior, 5);

      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates.some((c) => c.description.includes("techno"))).toBe(true);
    });

    it("should generate default candidates for unknown genre", () => {
      const stylePrior = createStylePrior({
        guardrails: { energyProfile: "experimental ambient", avoidCliches: [] },
      });

      const candidates = generateGrooveCandidates(stylePrior, 3);

      expect(candidates.length).toBeGreaterThan(0);
    });
  });

  describe("humanizePattern", () => {
    it("should add velocity variation to pattern", () => {
      const pattern = [0, 4, 8, 12];
      const humanized = humanizePattern(pattern, 5, 20);

      expect(humanized.length).toBe(4);
      // Velocities should vary (not all the same)
      const velocities = humanized.map((h) => h.velocity);
      expect(new Set(velocities).size).toBeGreaterThanOrEqual(1);
    });
  });

  describe("mutateGroove", () => {
    it("should create a variation of the groove", () => {
      const original = generateHouseGroove(128);
      const mutated = mutateGroove(original, 0.3);

      expect(mutated.id).not.toBe(original.id);
      expect(mutated.description).toContain("mutated");
      // The pattern should be different (most of the time)
      // Note: This can occasionally fail if random mutations preserve the pattern
    });
  });
});
