/**
 * Mix scoring functions for balance, depth, and translation
 */

import type {
  SoundPalette,
  LevelingPlan,
  SpatialScene,
  MixDesign,
  SoundRole,
  TrackLevel,
} from "../types";

/**
 * Frequency band definitions in Hz
 */
const FREQUENCY_BANDS = {
  sub: { low: 20, high: 60 },
  bass: { low: 60, high: 200 },
  lowMid: { low: 200, high: 500 },
  mid: { low: 500, high: 2000 },
  highMid: { low: 2000, high: 6000 },
  presence: { low: 6000, high: 10000 },
  air: { low: 10000, high: 20000 },
  transient: { low: 2000, high: 10000 }, // Overlaps for transient content
};

/**
 * Check if frequency ranges overlap
 */
function rangesOverlap(
  range1: { low: number; high: number },
  range2: { low: number; high: number }
): boolean {
  return range1.low < range2.high && range2.low < range1.high;
}

/**
 * Score frequency balance based on palette coverage
 */
export function scoreFrequencyBalance(
  palette: SoundPalette,
  leveling: LevelingPlan
): number {
  // Check coverage of each frequency band
  const coveredBands = new Set<string>();

  for (const entry of palette.entries) {
    const { frequencyRange } = entry;
    for (const [band, bandRange] of Object.entries(FREQUENCY_BANDS)) {
      if (rangesOverlap(frequencyRange, bandRange)) {
        coveredBands.add(band);
      }
    }
  }

  // Essential bands for a balanced mix
  const essentialBands = ["bass", "lowMid", "mid", "highMid"];
  let essentialCoverage = 0;
  for (const band of essentialBands) {
    if (coveredBands.has(band)) essentialCoverage++;
  }

  let score = (essentialCoverage / essentialBands.length) * 60; // Up to 60 points for coverage

  // Check for gaps in the spectrum
  const hasSub = coveredBands.has("sub");
  const hasAir = coveredBands.has("air");
  if (hasSub) score += 10;
  if (hasAir) score += 10;

  // Check leveling balance
  const levels = leveling.tracks.map((t) => t.targetDb);
  if (levels.length > 0) {
    const avgLevel = levels.reduce((a, b) => a + b, 0) / levels.length;
    const variance =
      levels.reduce((sum, l) => sum + Math.abs(l - avgLevel), 0) / levels.length;

    // Reasonable variance is 6-12 dB
    if (variance >= 6 && variance <= 15) {
      score += 20;
    } else if (variance < 6) {
      score += 10; // Too flat can be boring
    }
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Score stereo field usage
 */
export function scoreStereoField(leveling: LevelingPlan): number {
  const { tracks } = leveling;
  if (tracks.length === 0) return 50;

  // Check pan distribution
  const leftPans = tracks.filter((t) => t.pan < -20);
  const rightPans = tracks.filter((t) => t.pan > 20);
  const centerPans = tracks.filter((t) => Math.abs(t.pan) <= 20);

  let score = 60; // Base score

  // Reward balanced L/R distribution
  const lrBalance = Math.abs(leftPans.length - rightPans.length);
  if (lrBalance <= 1) {
    score += 15; // Well balanced
  } else if (lrBalance <= 2) {
    score += 5;
  } else {
    score -= 10; // Lopsided
  }

  // Check that bass and kick are centered
  const lowEndTracks = tracks.filter(
    (t) => t.stemGroup === "bass" || t.stemGroup === "drums"
  );
  const lowEndCentered = lowEndTracks.every((t) => Math.abs(t.pan) <= 30);
  if (lowEndCentered) {
    score += 15; // Good practice
  } else {
    score -= 10;
  }

  // Check width variety
  const panValues = new Set(tracks.map((t) => Math.round(t.pan / 20) * 20));
  if (panValues.size >= 3) {
    score += 10; // Good use of stereo field
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Score depth perception from spatial scene
 */
export function scoreDepthLayers(spatialScene: SpatialScene): number {
  const { depthLayers, delays } = spatialScene;

  if (depthLayers.length === 0) return 40; // No depth is limiting

  let score = 50;

  // Check for variety in depth layers
  const reverbTypes = new Set(depthLayers.map((l) => l.reverbType));
  if (reverbTypes.size >= 2) {
    score += 15; // Multiple reverb types adds dimension
  }

  // Check decay time variety (front to back)
  const decayTimes = depthLayers.map((l) => l.decayTime).sort((a, b) => a - b);
  if (decayTimes.length >= 2) {
    const range = decayTimes[decayTimes.length - 1]! - decayTimes[0]!;
    if (range >= 1) {
      score += 15; // Good depth range
    }
  }

  // Check that delays add movement
  if (delays.length > 0) {
    score += 10;
    // Bonus for tempo-synced delays
    const syncedDelays = delays.filter((d) => d.time.includes("/"));
    if (syncedDelays.length > 0) {
      score += 5;
    }
  }

  // Check pre-delay usage (helps with clarity)
  const hasPredelay = depthLayers.some((l) => l.predelay >= 20);
  if (hasPredelay) {
    score += 5;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Score mono compatibility and translation likelihood
 */
export function scoreTranslation(mixDesign: MixDesign): number {
  const { leveling, spatialScene, eqCompSuggestions } = mixDesign;

  let score = 70; // Base score - assume reasonable defaults

  // Check for potential phase issues
  const { widthProcessing } = spatialScene;
  const haasEffects = widthProcessing.filter((w) => w.technique === "haas");
  if (haasEffects.length > 2) {
    score -= 15; // Too much Haas can cause phase issues
  }

  // Check that critical elements are not too wide
  const criticalTracks = leveling.tracks.filter(
    (t) => t.stemGroup === "bass" || t.stemGroup === "drums"
  );
  const wideCritical = widthProcessing.filter((w) => {
    const track = criticalTracks.find((t) => t.trackName === w.trackName);
    return track && w.amount > 50;
  });
  if (wideCritical.length > 0) {
    score -= 10; // Bass/drums too wide
  }

  // Check EQ decisions
  for (const suggestion of eqCompSuggestions) {
    // Reward high-pass filtering on non-bass elements
    const hasHighPass = suggestion.eq.some(
      (eq) => eq.type === "highpass"
    );
    if (hasHighPass && suggestion.stemGroup !== "bass") {
      score += 2;
    }
  }

  // Check master chain has limiter
  const hasLimiter = mixDesign.masterChain.some(
    (d) => d.device.toLowerCase().includes("limiter")
  );
  if (hasLimiter) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate overall mix score
 */
export function calculateMixScore(mixDesign: MixDesign): {
  balance: number;
  stereo: number;
  depth: number;
  translation: number;
  overall: number;
} {
  // We need palette for frequency balance, but it's not in MixDesign
  // Use a simplified balance check based on leveling only
  const balance = scoreLevelingBalance(mixDesign.leveling);
  const stereo = scoreStereoField(mixDesign.leveling);
  const depth = scoreDepthLayers(mixDesign.spatialScene);
  const translation = scoreTranslation(mixDesign);

  const overall = Math.round(
    balance * 0.3 + stereo * 0.2 + depth * 0.2 + translation * 0.3
  );

  return { balance, stereo, depth, translation, overall };
}

/**
 * Score leveling balance without palette
 */
function scoreLevelingBalance(leveling: LevelingPlan): number {
  const { tracks } = leveling;
  if (tracks.length === 0) return 50;

  let score = 60;

  // Group by stem group
  const groups = new Map<string, TrackLevel[]>();
  for (const track of tracks) {
    const group = groups.get(track.stemGroup) || [];
    group.push(track);
    groups.set(track.stemGroup, group);
  }

  // Check that essential groups are present
  const essentialGroups = ["drums", "bass"];
  for (const group of essentialGroups) {
    if (groups.has(group)) {
      score += 10;
    }
  }

  // Check level relationships
  const drumAvg = getGroupAvgLevel(groups.get("drums") || []);
  const bassAvg = getGroupAvgLevel(groups.get("bass") || []);
  const synthAvg = getGroupAvgLevel(groups.get("synths") || []);

  // Drums and bass should be prominent
  if (drumAvg !== null && bassAvg !== null) {
    if (Math.abs(drumAvg - bassAvg) <= 6) {
      score += 10; // Balanced low end
    }
  }

  // Synths/melodic content slightly lower than drums
  if (drumAvg !== null && synthAvg !== null) {
    if (drumAvg >= synthAvg - 3) {
      score += 10; // Good hierarchy
    }
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Get average level for a group of tracks
 */
function getGroupAvgLevel(tracks: TrackLevel[]): number | null {
  if (tracks.length === 0) return null;
  return tracks.reduce((sum, t) => sum + t.targetDb, 0) / tracks.length;
}

/**
 * Evaluate automation coverage
 */
export function scoreAutomationCoverage(mixDesign: MixDesign): number {
  const { automationPasses } = mixDesign;

  if (automationPasses.length === 0) return 30; // No automation is static

  let score = 50;

  // Reward filter automation
  const filterAutomation = automationPasses.filter((a) =>
    a.parameter.toLowerCase().includes("filter")
  );
  if (filterAutomation.length > 0) score += 15;

  // Reward volume automation
  const volumeAutomation = automationPasses.filter(
    (a) =>
      a.parameter.toLowerCase().includes("volume") ||
      a.parameter.toLowerCase().includes("level")
  );
  if (volumeAutomation.length > 0) score += 10;

  // Reward send automation (creates movement)
  const sendAutomation = automationPasses.filter((a) =>
    a.parameter.toLowerCase().includes("send")
  );
  if (sendAutomation.length > 0) score += 10;

  // Check keyframe density
  const totalKeyframes = automationPasses.reduce(
    (sum, a) => sum + a.keyframes.length,
    0
  );
  if (totalKeyframes >= 10) score += 10;
  if (totalKeyframes >= 20) score += 5;

  return Math.max(0, Math.min(100, score));
}
