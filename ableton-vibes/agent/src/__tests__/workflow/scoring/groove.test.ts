import { describe, it, expect } from "vitest";
import {
  scoreDanceability,
  scorePocket,
  scoreGenreFit,
  analyzeKickPlacement,
  analyzeSnareBackbeat,
  analyzeHatGroove,
  measureSyncopation,
  calculateGrooveScore,
  rankGrooves,
} from "../../../workflow/scoring/groove";
import type { GrooveCandidate, StylePrior } from "../../../workflow/types";

// Helper to create a groove candidate
function createGroove(overrides: Partial<GrooveCandidate> = {}): GrooveCandidate {
  return {
    id: "test-groove",
    tempo: 128,
    meter: "4/4",
    swingAmount: 0,
    kickPattern: [0, 4, 8, 12], // Four on the floor
    snarePattern: [4, 12], // Backbeat
    hatPattern: [0, 2, 4, 6, 8, 10, 12, 14], // 8th notes
    velocityVariance: 10,
    humanization: { timingJitter: 5, velocityJitter: 8 },
    description: "Test groove",
    ...overrides,
  };
}

// Helper to create a style prior
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
    guardrails: { energyProfile: "driving", avoidCliches: [] },
    ...overrides,
  };
}

describe("Groove Scoring", () => {
  describe("analyzeKickPlacement", () => {
    it("should score four-on-the-floor kick pattern highly", () => {
      const score = analyzeKickPlacement([0, 4, 8, 12]);
      expect(score).toBeGreaterThan(70);
    });

    it("should reward downbeat anchoring", () => {
      const withDownbeat = analyzeKickPlacement([0, 4, 8, 12]);
      const withoutDownbeat = analyzeKickPlacement([2, 6, 10, 14]);
      expect(withDownbeat).toBeGreaterThan(withoutDownbeat);
    });

    it("should penalize very sparse patterns", () => {
      const sparse = analyzeKickPlacement([0]);
      const normal = analyzeKickPlacement([0, 8]);
      expect(normal).toBeGreaterThan(sparse);
    });

    it("should return 0 for empty pattern", () => {
      const score = analyzeKickPlacement([]);
      expect(score).toBe(0);
    });
  });

  describe("analyzeSnareBackbeat", () => {
    it("should score standard backbeat highly in 4/4", () => {
      const score = analyzeSnareBackbeat([4, 12], "4/4");
      expect(score).toBeGreaterThanOrEqual(80);
    });

    it("should penalize snare on downbeat", () => {
      const withDownbeat = analyzeSnareBackbeat([0, 4, 12], "4/4");
      const withoutDownbeat = analyzeSnareBackbeat([4, 12], "4/4");
      expect(withoutDownbeat).toBeGreaterThan(withDownbeat);
    });

    it("should return 0 for empty pattern", () => {
      const score = analyzeSnareBackbeat([]);
      expect(score).toBe(0);
    });
  });

  describe("analyzeHatGroove", () => {
    it("should score moderate density well", () => {
      const moderate = analyzeHatGroove([0, 2, 4, 6, 8, 10, 12, 14]); // 8th notes
      expect(moderate).toBeGreaterThan(50);
    });

    it("should handle empty pattern", () => {
      const score = analyzeHatGroove([]);
      expect(score).toBe(30); // Minimal patterns can work
    });

    it("should penalize machine-gun patterns", () => {
      // Every 16th note
      const machineGun = analyzeHatGroove([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
      const moderate = analyzeHatGroove([0, 2, 4, 6, 8, 10, 12, 14]);
      expect(moderate).toBeGreaterThan(machineGun);
    });
  });

  describe("measureSyncopation", () => {
    it("should return 0 for fully on-beat pattern", () => {
      const syncopation = measureSyncopation([0, 4, 8, 12]);
      expect(syncopation).toBe(0);
    });

    it("should return high value for off-beat pattern", () => {
      const syncopation = measureSyncopation([2, 6, 10, 14]);
      expect(syncopation).toBe(100);
    });

    it("should return moderate value for mixed pattern", () => {
      const syncopation = measureSyncopation([0, 2, 4, 6]);
      expect(syncopation).toBe(50);
    });

    it("should return 0 for empty pattern", () => {
      const syncopation = measureSyncopation([]);
      expect(syncopation).toBe(0);
    });
  });

  describe("scoreDanceability", () => {
    it("should score four-on-the-floor groove highly", () => {
      const groove = createGroove();
      const score = scoreDanceability(groove);
      expect(score).toBeGreaterThan(70);
    });

    it("should penalize sparse kick patterns for club music", () => {
      const groove = createGroove({
        kickPattern: [0], // Single kick per bar
      });
      const score = scoreDanceability(groove);
      expect(score).toBeLessThan(65); // Sparse patterns score lower than full patterns
    });

    it("should consider tempo in danceability", () => {
      const goodTempo = createGroove({ tempo: 125 });
      const slowTempo = createGroove({ tempo: 70 });

      expect(scoreDanceability(goodTempo)).toBeGreaterThan(scoreDanceability(slowTempo));
    });
  });

  describe("scorePocket", () => {
    it("should reward appropriate humanization", () => {
      const humanized = createGroove({
        humanization: { timingJitter: 8, velocityJitter: 12 },
      });
      const robotic = createGroove({
        humanization: { timingJitter: 0, velocityJitter: 0 },
      });

      expect(scorePocket(humanized)).toBeGreaterThan(scorePocket(robotic));
    });

    it("should penalize excessive humanization", () => {
      const good = createGroove({
        humanization: { timingJitter: 8, velocityJitter: 12 },
      });
      const sloppy = createGroove({
        humanization: { timingJitter: 30, velocityJitter: 40 },
      });

      expect(scorePocket(good)).toBeGreaterThan(scorePocket(sloppy));
    });

    it("should reward swing amount", () => {
      const withSwing = createGroove({ swingAmount: 30 });
      const noSwing = createGroove({ swingAmount: 0 });

      expect(scorePocket(withSwing)).toBeGreaterThanOrEqual(scorePocket(noSwing));
    });
  });

  describe("scoreGenreFit", () => {
    it("should score highly when tempo matches style prior", () => {
      const groove = createGroove({ tempo: 128 });
      const stylePrior = createStylePrior({
        bpmSignature: { typical: 128, variance: 5 },
      });

      const score = scoreGenreFit(groove, stylePrior);
      expect(score).toBeGreaterThan(70);
    });

    it("should penalize tempo mismatch", () => {
      const groove = createGroove({ tempo: 90 });
      const stylePrior = createStylePrior({
        bpmSignature: { typical: 128, variance: 5 },
      });

      const score = scoreGenreFit(groove, stylePrior);
      expect(score).toBeLessThanOrEqual(60); // Tempo mismatch reduces score
    });

    it("should consider swing alignment", () => {
      const matchingSwing = createGroove({ swingAmount: 50 });
      const mismatchedSwing = createGroove({ swingAmount: 0 });
      const stylePrior = createStylePrior({
        swingProfile: { amount: 50, subdivision: "8th" },
      });

      expect(scoreGenreFit(matchingSwing, stylePrior)).toBeGreaterThan(
        scoreGenreFit(mismatchedSwing, stylePrior)
      );
    });
  });

  describe("calculateGrooveScore", () => {
    it("should return complete score object", () => {
      const groove = createGroove();
      const stylePrior = createStylePrior();

      const score = calculateGrooveScore(groove, stylePrior);

      expect(score.candidateId).toBe(groove.id);
      expect(score.danceability).toBeGreaterThanOrEqual(0);
      expect(score.danceability).toBeLessThanOrEqual(100);
      expect(score.pocket).toBeGreaterThanOrEqual(0);
      expect(score.pocket).toBeLessThanOrEqual(100);
      expect(score.genreFit).toBeGreaterThanOrEqual(0);
      expect(score.genreFit).toBeLessThanOrEqual(100);
      expect(score.overall).toBeGreaterThanOrEqual(0);
      expect(score.overall).toBeLessThanOrEqual(100);
      expect(score.breakdown).toBeDefined();
    });

    it("should calculate weighted overall score", () => {
      const groove = createGroove();
      const stylePrior = createStylePrior();

      const score = calculateGrooveScore(groove, stylePrior);

      // Overall should be weighted combination
      const expected = Math.round(
        score.danceability * 0.4 + score.pocket * 0.35 + score.genreFit * 0.25
      );
      expect(score.overall).toBe(expected);
    });
  });

  describe("rankGrooves", () => {
    it("should rank grooves by overall score descending", () => {
      const groove1 = createGroove({ id: "groove-1", tempo: 128 });
      const groove2 = createGroove({ id: "groove-2", tempo: 70, kickPattern: [0] });
      const stylePrior = createStylePrior();

      const ranked = rankGrooves([groove2, groove1], stylePrior);

      expect(ranked[0]!.groove.id).toBe("groove-1");
      expect(ranked[1]!.groove.id).toBe("groove-2");
      expect(ranked[0]!.score.overall).toBeGreaterThan(ranked[1]!.score.overall);
    });
  });
});
