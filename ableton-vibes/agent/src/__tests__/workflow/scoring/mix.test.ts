import { describe, it, expect } from "vitest";
import {
  scoreFrequencyBalance,
  scoreStereoField,
  scoreDepthLayers,
  scoreTranslation,
  calculateMixScore,
} from "../../../workflow/scoring/mix";
import type {
  SoundPalette,
  LevelingPlan,
  SpatialScene,
  MixDesign,
  PaletteEntry,
} from "../../../workflow/types";

// Helper to create a palette entry
function createPaletteEntry(
  role: PaletteEntry["role"],
  freqRange: { low: number; high: number }
): PaletteEntry {
  return {
    id: `${role}-1`,
    name: `${role} sound`,
    role,
    type: "synth",
    frequencyRange: freqRange,
    characteristics: [],
    processingHints: [],
  };
}

// Helper to create a palette
function createPalette(entries: PaletteEntry[] = []): SoundPalette {
  return {
    maxElements: 12,
    entries,
    coverageByRole: {},
    forbidden: [],
  };
}

// Helper to create leveling plan
function createLevelingPlan(
  tracks: Array<{ name: string; group: LevelingPlan["tracks"][0]["stemGroup"]; db: number; pan: number }>
): LevelingPlan {
  return {
    tracks: tracks.map((t) => ({
      trackName: t.name,
      stemGroup: t.group,
      targetDb: t.db,
      pan: t.pan,
    })),
  };
}

// Helper to create spatial scene
function createSpatialScene(overrides: Partial<SpatialScene> = {}): SpatialScene {
  return {
    depthLayers: [
      {
        name: "Room",
        reverbType: "room",
        decayTime: 0.8,
        predelay: 10,
        wetLevel: 20,
        assignedTracks: [],
        character: "tight",
      },
      {
        name: "Hall",
        reverbType: "hall",
        decayTime: 2.5,
        predelay: 30,
        wetLevel: 30,
        assignedTracks: [],
        character: "spacious",
      },
    ],
    delays: [
      {
        name: "Ping Pong",
        type: "ping-pong",
        time: "1/8",
        feedback: 40,
        assignedTracks: [],
      },
    ],
    widthProcessing: [],
    ...overrides,
  };
}

// Helper to create mix design
function createMixDesign(overrides: Partial<MixDesign> = {}): MixDesign {
  return {
    leveling: createLevelingPlan([
      { name: "Kick", group: "drums", db: -6, pan: 0 },
      { name: "Snare", group: "drums", db: -8, pan: 0 },
      { name: "Bass", group: "bass", db: -8, pan: 0 },
      { name: "Lead", group: "synths", db: -10, pan: 20 },
      { name: "Pad", group: "pads", db: -14, pan: -30 },
    ]),
    eqCompSuggestions: [],
    spatialScene: createSpatialScene(),
    automationPasses: [],
    masterChain: [
      { order: 1, device: "EQ Eight", purpose: "tonal shaping", settings: {} },
      { order: 2, device: "Glue Compressor", purpose: "glue", settings: {} },
      { order: 3, device: "Limiter", purpose: "ceiling", settings: {} },
    ],
    ...overrides,
  };
}

describe("Mix Scoring", () => {
  describe("scoreFrequencyBalance", () => {
    it("should score well with full frequency coverage", () => {
      const palette = createPalette([
        createPaletteEntry("sub", { low: 30, high: 80 }),
        createPaletteEntry("bass", { low: 60, high: 250 }),
        createPaletteEntry("mid", { low: 400, high: 2000 }),
        createPaletteEntry("highMid", { low: 2000, high: 8000 }),
        createPaletteEntry("air", { low: 8000, high: 16000 }),
      ]);
      const leveling = createLevelingPlan([
        { name: "Sub", group: "bass", db: -10, pan: 0 },
        { name: "Lead", group: "synths", db: -8, pan: 0 },
      ]);

      const score = scoreFrequencyBalance(palette, leveling);
      expect(score).toBeGreaterThan(60);
    });

    it("should penalize missing frequency ranges", () => {
      // Only mids, no bass or highs
      const sparsePalette = createPalette([
        createPaletteEntry("mid", { low: 500, high: 2000 }),
      ]);
      const fullPalette = createPalette([
        createPaletteEntry("bass", { low: 60, high: 250 }),
        createPaletteEntry("lowMid", { low: 200, high: 500 }),
        createPaletteEntry("mid", { low: 500, high: 2000 }),
        createPaletteEntry("highMid", { low: 2000, high: 8000 }),
      ]);

      const leveling = createLevelingPlan([]);

      expect(scoreFrequencyBalance(fullPalette, leveling)).toBeGreaterThan(
        scoreFrequencyBalance(sparsePalette, leveling)
      );
    });
  });

  describe("scoreStereoField", () => {
    it("should score balanced stereo field highly", () => {
      const leveling = createLevelingPlan([
        { name: "Kick", group: "drums", db: -6, pan: 0 },
        { name: "Bass", group: "bass", db: -8, pan: 0 },
        { name: "Lead L", group: "synths", db: -10, pan: -50 },
        { name: "Lead R", group: "synths", db: -10, pan: 50 },
        { name: "Pad", group: "pads", db: -12, pan: 0 },
      ]);

      const score = scoreStereoField(leveling);
      expect(score).toBeGreaterThan(70);
    });

    it("should penalize bass/drums panned wide", () => {
      const badLeveling = createLevelingPlan([
        { name: "Kick", group: "drums", db: -6, pan: 50 }, // Bad: kick panned
        { name: "Bass", group: "bass", db: -8, pan: -50 }, // Bad: bass panned
      ]);
      const goodLeveling = createLevelingPlan([
        { name: "Kick", group: "drums", db: -6, pan: 0 },
        { name: "Bass", group: "bass", db: -8, pan: 0 },
      ]);

      expect(scoreStereoField(goodLeveling)).toBeGreaterThan(scoreStereoField(badLeveling));
    });

    it("should handle empty leveling", () => {
      const empty = createLevelingPlan([]);
      expect(scoreStereoField(empty)).toBe(50);
    });
  });

  describe("scoreDepthLayers", () => {
    it("should reward variety in depth layers", () => {
      const variedScene = createSpatialScene({
        depthLayers: [
          { name: "Room", reverbType: "room", decayTime: 0.5, predelay: 5, wetLevel: 15, assignedTracks: [], character: "tight" },
          { name: "Hall", reverbType: "hall", decayTime: 3, predelay: 40, wetLevel: 25, assignedTracks: [], character: "wide" },
          { name: "Plate", reverbType: "plate", decayTime: 1.5, predelay: 20, wetLevel: 20, assignedTracks: [], character: "smooth" },
        ],
      });

      const score = scoreDepthLayers(variedScene);
      expect(score).toBeGreaterThan(70);
    });

    it("should penalize no depth layers", () => {
      const flatScene = createSpatialScene({ depthLayers: [], delays: [] });
      expect(scoreDepthLayers(flatScene)).toBeLessThan(50);
    });

    it("should reward tempo-synced delays", () => {
      const syncedScene = createSpatialScene({
        delays: [
          { name: "Delay", type: "ping-pong", time: "1/4", feedback: 30, assignedTracks: [] },
        ],
      });
      const unsyncedScene = createSpatialScene({
        delays: [
          { name: "Delay", type: "mono", time: "250ms", feedback: 30, assignedTracks: [] },
        ],
      });

      expect(scoreDepthLayers(syncedScene)).toBeGreaterThan(scoreDepthLayers(unsyncedScene));
    });
  });

  describe("scoreTranslation", () => {
    it("should reward limiter on master chain", () => {
      const withLimiter = createMixDesign({
        masterChain: [
          { order: 1, device: "Limiter", purpose: "ceiling", settings: {} },
        ],
      });
      const withoutLimiter = createMixDesign({
        masterChain: [],
      });

      expect(scoreTranslation(withLimiter)).toBeGreaterThan(scoreTranslation(withoutLimiter));
    });

    it("should penalize excessive Haas effects", () => {
      const manyHaas = createMixDesign({
        spatialScene: createSpatialScene({
          widthProcessing: [
            { trackName: "Synth 1", technique: "haas", amount: 50 },
            { trackName: "Synth 2", technique: "haas", amount: 60 },
            { trackName: "Synth 3", technique: "haas", amount: 40 },
          ],
        }),
      });
      const noHaas = createMixDesign({
        spatialScene: createSpatialScene({ widthProcessing: [] }),
      });

      expect(scoreTranslation(noHaas)).toBeGreaterThan(scoreTranslation(manyHaas));
    });
  });

  describe("calculateMixScore", () => {
    it("should return complete score object", () => {
      const mixDesign = createMixDesign();
      const score = calculateMixScore(mixDesign);

      expect(score.balance).toBeGreaterThanOrEqual(0);
      expect(score.balance).toBeLessThanOrEqual(100);
      expect(score.stereo).toBeGreaterThanOrEqual(0);
      expect(score.stereo).toBeLessThanOrEqual(100);
      expect(score.depth).toBeGreaterThanOrEqual(0);
      expect(score.depth).toBeLessThanOrEqual(100);
      expect(score.translation).toBeGreaterThanOrEqual(0);
      expect(score.translation).toBeLessThanOrEqual(100);
      expect(score.overall).toBeGreaterThanOrEqual(0);
      expect(score.overall).toBeLessThanOrEqual(100);
    });
  });
});
