/**
 * Groove scoring functions for danceability, pocket, and genre-fit
 */

import type { GrooveCandidate, GrooveScore, StylePrior, GrooveBreakdown } from "../types";

/**
 * Analyze kick placement quality
 * Rewards downbeat anchoring and balanced syncopation
 */
export function analyzeKickPlacement(kickPattern: number[]): number {
  if (kickPattern.length === 0) return 0;

  let score = 0;
  const hasDownbeat = kickPattern.includes(0);
  const hasBeat3 = kickPattern.includes(8); // Beat 3 in 16th notes

  // Reward downbeat presence (crucial for most dance music)
  if (hasDownbeat) score += 40;

  // Reward beat 3 for four-on-the-floor feel
  if (hasBeat3) score += 20;

  // Reward consistent spacing
  const spacings: number[] = [];
  for (let i = 1; i < kickPattern.length; i++) {
    spacings.push(kickPattern[i]! - kickPattern[i - 1]!);
  }
  if (spacings.length > 0) {
    const avgSpacing = spacings.reduce((a, b) => a + b, 0) / spacings.length;
    const variance = spacings.reduce((sum, s) => sum + Math.abs(s - avgSpacing), 0) / spacings.length;
    // Lower variance = more consistent = higher score
    score += Math.max(0, 30 - variance * 2);
  }

  // Penalize too sparse or too dense
  const density = kickPattern.length / 16;
  if (density < 0.1) score -= 20; // Too sparse
  if (density > 0.5) score -= 15; // Too dense

  return Math.max(0, Math.min(100, score + 10)); // Base score of 10
}

/**
 * Analyze snare backbeat strength
 */
export function analyzeSnareBackbeat(snarePattern: number[], meter = "4/4"): number {
  if (snarePattern.length === 0) return 0;

  let score = 0;
  const is44 = meter === "4/4";

  if (is44) {
    // In 4/4, backbeat is beats 2 and 4 (positions 4 and 12 in 16th notes)
    const hasBackbeat2 = snarePattern.includes(4);
    const hasBackbeat4 = snarePattern.includes(12);

    if (hasBackbeat2) score += 40;
    if (hasBackbeat4) score += 40;

    // Bonus for consistent backbeat
    if (hasBackbeat2 && hasBackbeat4) score += 10;
  } else {
    // For other meters, reward hits on weak beats
    const strongBeats = [0, 8]; // Assuming 16th note grid for 4 beats
    const weakBeats = snarePattern.filter((p) => !strongBeats.includes(p % 16));
    score += (weakBeats.length / snarePattern.length) * 80;
  }

  // Penalize snares on the downbeat (usually undesirable)
  if (snarePattern.includes(0)) score -= 20;

  return Math.max(0, Math.min(100, score));
}

/**
 * Analyze hi-hat groove interest
 */
export function analyzeHatGroove(hatPattern: number[]): number {
  if (hatPattern.length === 0) return 30; // Minimal patterns can work

  let score = 50; // Base score

  // Reward moderate density (not too sparse, not machine-gun)
  const density = hatPattern.length / 16;
  if (density >= 0.25 && density <= 0.75) score += 20;
  if (density > 0.9) score -= 15; // Too busy
  if (density < 0.1) score -= 10; // Too sparse

  // Check for off-beat emphasis (common in dance music)
  const offBeats = hatPattern.filter((p) => p % 2 === 1); // Odd 16th positions
  const offBeatRatio = offBeats.length / hatPattern.length;
  if (offBeatRatio >= 0.3 && offBeatRatio <= 0.7) score += 15;

  // Check for pattern variety (not just every 16th or 8th)
  const spacings = new Set<number>();
  for (let i = 1; i < hatPattern.length; i++) {
    spacings.add(hatPattern[i]! - hatPattern[i - 1]!);
  }
  if (spacings.size >= 2) score += 15; // Some variety

  return Math.max(0, Math.min(100, score));
}

/**
 * Measure syncopation level (0-100)
 * 0 = fully on-beat, 100 = heavily syncopated
 */
export function measureSyncopation(pattern: number[]): number {
  if (pattern.length === 0) return 0;

  // Strong beats: 0, 4, 8, 12 (quarter notes in 16th grid)
  const strongBeats = [0, 4, 8, 12];

  const onBeatHits = pattern.filter((p) => strongBeats.includes(p % 16)).length;
  const offBeatHits = pattern.length - onBeatHits;

  return Math.round((offBeatHits / pattern.length) * 100);
}

/**
 * Score danceability based on kick/snare placement and syncopation
 */
export function scoreDanceability(groove: GrooveCandidate): number {
  const kickScore = analyzeKickPlacement(groove.kickPattern);
  const snareScore = analyzeSnareBackbeat(groove.snarePattern, groove.meter);
  const hatScore = analyzeHatGroove(groove.hatPattern);

  // Calculate syncopation - moderate is best for dance music
  const kickSyncopation = measureSyncopation(groove.kickPattern);
  const snareSyncopation = measureSyncopation(groove.snarePattern);

  // Ideal syncopation range: 20-60%
  let syncopationBonus = 0;
  const avgSyncopation = (kickSyncopation + snareSyncopation) / 2;
  if (avgSyncopation >= 20 && avgSyncopation <= 60) {
    syncopationBonus = 10;
  } else if (avgSyncopation < 10 || avgSyncopation > 80) {
    syncopationBonus = -10;
  }

  // Tempo affects danceability
  let tempoBonus = 0;
  if (groove.tempo >= 115 && groove.tempo <= 135) {
    tempoBonus = 10; // Sweet spot for most dance music
  } else if (groove.tempo < 90 || groove.tempo > 160) {
    tempoBonus = -10;
  }

  const rawScore = kickScore * 0.4 + snareScore * 0.35 + hatScore * 0.25;
  return Math.max(0, Math.min(100, rawScore + syncopationBonus + tempoBonus));
}

/**
 * Score how well the groove sits "in the pocket"
 */
export function scorePocket(groove: GrooveCandidate): number {
  let score = 70; // Base pocket score

  // Humanization improves pocket feel (but not too much)
  const { timingJitter, velocityJitter } = groove.humanization;

  if (timingJitter >= 3 && timingJitter <= 15) {
    score += 15; // Good timing humanization
  } else if (timingJitter > 25) {
    score -= 15; // Too sloppy
  }

  if (velocityJitter >= 5 && velocityJitter <= 20) {
    score += 10; // Good velocity humanization
  }

  // Swing amount affects pocket
  if (groove.swingAmount >= 10 && groove.swingAmount <= 70) {
    score += 10; // Swing adds pocket feel
  }

  // Velocity variance (from the pattern itself)
  if (groove.velocityVariance >= 5 && groove.velocityVariance <= 20) {
    score += 5;
  }

  // Analyze kick-snare relationship for pocket
  const hasGoodKickSnareRelation = groove.kickPattern.some((k) => {
    return groove.snarePattern.some((s) => {
      const distance = Math.abs(k - s) % 16;
      return distance >= 2 && distance <= 6; // Good spacing
    });
  });

  if (hasGoodKickSnareRelation) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Score genre fit by comparing pattern characteristics to genre norms
 */
export function scoreGenreFit(groove: GrooveCandidate, stylePrior: StylePrior): number {
  let score = 50; // Base score

  // Check tempo alignment
  const { typical, variance } = stylePrior.bpmSignature;
  const tempoDiff = Math.abs(groove.tempo - typical);
  if (tempoDiff <= variance) {
    score += 25;
  } else if (tempoDiff <= variance * 2) {
    score += 10;
  } else {
    score -= 15;
  }

  // Check swing alignment
  const expectedSwing = stylePrior.swingProfile.amount;
  const swingDiff = Math.abs(groove.swingAmount - expectedSwing);
  if (swingDiff <= 15) {
    score += 15;
  } else if (swingDiff <= 30) {
    score += 5;
  } else {
    score -= 10;
  }

  // Check meter alignment (most EDM is 4/4)
  if (groove.meter === "4/4") {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate detailed groove breakdown
 */
export function calculateGrooveBreakdown(groove: GrooveCandidate): GrooveBreakdown {
  return {
    kickPlacement: analyzeKickPlacement(groove.kickPattern),
    snareBackbeat: analyzeSnareBackbeat(groove.snarePattern, groove.meter),
    hatGroove: analyzeHatGroove(groove.hatPattern),
    syncopation: measureSyncopation([
      ...groove.kickPattern,
      ...groove.snarePattern,
      ...groove.hatPattern,
    ]),
  };
}

/**
 * Calculate overall groove score
 */
export function calculateGrooveScore(
  groove: GrooveCandidate,
  stylePrior: StylePrior
): GrooveScore {
  const danceability = scoreDanceability(groove);
  const pocket = scorePocket(groove);
  const genreFit = scoreGenreFit(groove, stylePrior);
  const breakdown = calculateGrooveBreakdown(groove);

  // Weighted overall score
  const overall = Math.round(danceability * 0.4 + pocket * 0.35 + genreFit * 0.25);

  return {
    candidateId: groove.id,
    danceability,
    pocket,
    genreFit,
    overall,
    breakdown,
  };
}

/**
 * Rank multiple groove candidates
 */
export function rankGrooves(
  grooves: GrooveCandidate[],
  stylePrior: StylePrior
): Array<{ groove: GrooveCandidate; score: GrooveScore }> {
  const scored = grooves.map((groove) => ({
    groove,
    score: calculateGrooveScore(groove, stylePrior),
  }));

  return scored.sort((a, b) => b.score.overall - a.score.overall);
}
