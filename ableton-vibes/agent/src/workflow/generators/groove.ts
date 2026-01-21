/**
 * Groove pattern generators
 * Generate kick, snare, and hat patterns for various genres
 */

import type { GrooveCandidate, StylePrior } from "../types";
import { euclideanRhythm, humanizeVelocity } from "../utils/rhythmUtils";

/**
 * Generate a four-on-the-floor kick pattern
 */
export function generateFourOnFloorKick(): number[] {
  return [0, 4, 8, 12]; // Every quarter note in a 16-step bar
}

/**
 * Generate a syncopated kick pattern for house/techno
 */
export function generateSyncopatedKick(density: "sparse" | "medium" | "dense" = "medium"): number[] {
  switch (density) {
    case "sparse":
      return [0, 10]; // Kick on 1 and offbeat
    case "medium":
      return [0, 6, 10]; // With offbeat syncopation
    case "dense":
      return [0, 3, 6, 10, 14]; // More driving
  }
}

/**
 * Generate euclidean kick pattern
 */
export function generateEuclideanKick(hits: number, steps: number = 16, rotation: number = 0): number[] {
  return euclideanRhythm(hits, steps, rotation);
}

/**
 * Generate a standard backbeat snare pattern (2 and 4)
 */
export function generateBackbeatSnare(): number[] {
  return [4, 12]; // Beats 2 and 4 in a 16-step bar
}

/**
 * Generate a sparse snare pattern
 */
export function generateSparseSnare(): number[] {
  return [12]; // Just the 4
}

/**
 * Generate a syncopated snare pattern
 */
export function generateSyncopatedSnare(): number[] {
  return [4, 10, 12]; // With offbeat hit
}

/**
 * Generate a breakbeat-style snare pattern
 */
export function generateBreakbeatSnare(): number[] {
  return [4, 7, 12, 15]; // More complex rhythm
}

/**
 * Generate an 8th note hi-hat pattern
 */
export function generate8thHats(): number[] {
  return [0, 2, 4, 6, 8, 10, 12, 14];
}

/**
 * Generate a 16th note hi-hat pattern
 */
export function generate16thHats(): number[] {
  return Array.from({ length: 16 }, (_, i) => i);
}

/**
 * Generate offbeat hi-hats
 */
export function generateOffbeatHats(): number[] {
  return [2, 6, 10, 14]; // Only the offbeats
}

/**
 * Generate euclidean hi-hat pattern
 */
export function generateEuclideanHats(hits: number, steps: number = 16, rotation: number = 0): number[] {
  return euclideanRhythm(hits, steps, rotation);
}

/**
 * Generate a house groove
 */
export function generateHouseGroove(tempo: number = 124, swingAmount: number = 0): GrooveCandidate {
  return {
    id: `house-groove-${Date.now()}`,
    tempo,
    meter: "4/4",
    swingAmount,
    kickPattern: generateFourOnFloorKick(),
    snarePattern: generateBackbeatSnare(),
    hatPattern: generate8thHats(),
    velocityVariance: 10,
    humanization: { timingJitter: 5, velocityJitter: 8 },
    description: "Classic four-on-the-floor house groove",
  };
}

/**
 * Generate a techno groove
 */
export function generateTechnoGroove(tempo: number = 130, variant: "minimal" | "driving" | "industrial" = "driving"): GrooveCandidate {
  const kickPatterns = {
    minimal: [0, 8],
    driving: generateFourOnFloorKick(),
    industrial: [0, 3, 8, 11],
  };

  const hatPatterns = {
    minimal: generateOffbeatHats(),
    driving: generate16thHats(),
    industrial: generateEuclideanHats(12, 16),
  };

  return {
    id: `techno-groove-${variant}-${Date.now()}`,
    tempo,
    meter: "4/4",
    swingAmount: 0,
    kickPattern: kickPatterns[variant],
    snarePattern: variant === "industrial" ? generateSyncopatedSnare() : generateSparseSnare(),
    hatPattern: hatPatterns[variant],
    velocityVariance: variant === "minimal" ? 5 : 15,
    humanization: { timingJitter: 3, velocityJitter: 5 },
    description: `${variant} techno groove`,
  };
}

/**
 * Generate a drum and bass groove
 */
export function generateDnBGroove(tempo: number = 174): GrooveCandidate {
  return {
    id: `dnb-groove-${Date.now()}`,
    tempo,
    meter: "4/4",
    swingAmount: 0,
    kickPattern: [0, 10], // Typical DnB two-step kick
    snarePattern: [4, 12], // Backbeat but fast
    hatPattern: generate16thHats(),
    velocityVariance: 15,
    humanization: { timingJitter: 4, velocityJitter: 10 },
    description: "Two-step drum and bass groove",
  };
}

/**
 * Generate a UK garage / 2-step groove
 */
export function generateUKGarageGroove(tempo: number = 130): GrooveCandidate {
  return {
    id: `ukg-groove-${Date.now()}`,
    tempo,
    meter: "4/4",
    swingAmount: 35, // Shuffled feel
    kickPattern: [0, 5, 10], // Syncopated
    snarePattern: [4, 12],
    hatPattern: generateEuclideanHats(9, 16, 1),
    velocityVariance: 20,
    humanization: { timingJitter: 8, velocityJitter: 15 },
    description: "Shuffled UK garage groove",
  };
}

/**
 * Generate a hip-hop groove
 */
export function generateHipHopGroove(tempo: number = 90, variant: "boom-bap" | "trap" | "lo-fi" = "boom-bap"): GrooveCandidate {
  const patterns = {
    "boom-bap": {
      kick: [0, 5, 8, 13],
      snare: [4, 12],
      hat: generate8thHats(),
      swing: 30,
    },
    "trap": {
      kick: [0, 7, 10],
      snare: [4, 12],
      hat: generate16thHats(),
      swing: 0,
    },
    "lo-fi": {
      kick: [0, 10],
      snare: [4, 12],
      hat: generateEuclideanHats(6, 16),
      swing: 40,
    },
  };

  const p = patterns[variant];
  return {
    id: `hiphop-groove-${variant}-${Date.now()}`,
    tempo,
    meter: "4/4",
    swingAmount: p.swing,
    kickPattern: p.kick,
    snarePattern: p.snare,
    hatPattern: p.hat,
    velocityVariance: 20,
    humanization: { timingJitter: 10, velocityJitter: 15 },
    description: `${variant} hip-hop groove`,
  };
}

/**
 * Generate a trance groove
 */
export function generateTranceGroove(tempo: number = 138): GrooveCandidate {
  return {
    id: `trance-groove-${Date.now()}`,
    tempo,
    meter: "4/4",
    swingAmount: 0,
    kickPattern: generateFourOnFloorKick(),
    snarePattern: [4, 12],
    hatPattern: generateOffbeatHats(),
    velocityVariance: 5,
    humanization: { timingJitter: 2, velocityJitter: 3 },
    description: "Classic trance groove with offbeat hats",
  };
}

/**
 * Generate multiple groove candidates based on style prior
 */
export function generateGrooveCandidates(stylePrior: StylePrior, count: number = 5): GrooveCandidate[] {
  const candidates: GrooveCandidate[] = [];
  const genreKeywords = stylePrior.guardrails.energyProfile.toLowerCase();
  const baseTempo = stylePrior.bpmSignature.typical;
  const swing = stylePrior.swingProfile.amount;

  // Generate genre-appropriate candidates
  if (genreKeywords.includes("house")) {
    candidates.push(generateHouseGroove(baseTempo, swing));
    candidates.push(generateHouseGroove(baseTempo + 2, swing + 10));
  }

  if (genreKeywords.includes("techno")) {
    candidates.push(generateTechnoGroove(baseTempo, "driving"));
    candidates.push(generateTechnoGroove(baseTempo, "minimal"));
    candidates.push(generateTechnoGroove(baseTempo, "industrial"));
  }

  if (genreKeywords.includes("dnb") || genreKeywords.includes("drum") || genreKeywords.includes("bass")) {
    candidates.push(generateDnBGroove(baseTempo));
  }

  if (genreKeywords.includes("garage") || genreKeywords.includes("2-step")) {
    candidates.push(generateUKGarageGroove(baseTempo));
  }

  if (genreKeywords.includes("hip") || genreKeywords.includes("hop") || genreKeywords.includes("trap")) {
    candidates.push(generateHipHopGroove(baseTempo, "boom-bap"));
    candidates.push(generateHipHopGroove(baseTempo, "trap"));
    candidates.push(generateHipHopGroove(baseTempo, "lo-fi"));
  }

  if (genreKeywords.includes("trance")) {
    candidates.push(generateTranceGroove(baseTempo));
  }

  // If no specific genre matched, generate generic candidates
  if (candidates.length === 0) {
    candidates.push(generateHouseGroove(baseTempo, swing));
    candidates.push(generateTechnoGroove(baseTempo, "driving"));
    candidates.push({
      id: `custom-groove-${Date.now()}`,
      tempo: baseTempo,
      meter: "4/4",
      swingAmount: swing,
      kickPattern: generateEuclideanKick(4, 16),
      snarePattern: generateBackbeatSnare(),
      hatPattern: generate8thHats(),
      velocityVariance: 12,
      humanization: { timingJitter: 6, velocityJitter: 10 },
      description: "Custom euclidean groove",
    });
  }

  // Limit to requested count
  return candidates.slice(0, count);
}

/**
 * Apply humanization to a pattern
 * @param pattern - Array of step positions (0-15 for 16th notes)
 * @param timingJitter - Max timing variation in percentage of step (0-100)
 * @param velocityJitter - Max velocity variation
 */
export function humanizePattern(
  pattern: number[],
  timingJitter: number = 5,
  velocityJitter: number = 10
): Array<{ step: number; velocity: number }> {
  return pattern.map((step) => {
    // Apply simple random offset for timing (scaled by jitter percentage)
    const offset = (Math.random() - 0.5) * (timingJitter / 50);
    return {
      step: step + offset,
      velocity: humanizeVelocity(100, velocityJitter),
    };
  });
}

/**
 * Mutate a groove to create variations
 */
export function mutateGroove(groove: GrooveCandidate, mutationAmount: number = 0.2): GrooveCandidate {
  const mutate = (pattern: number[]): number[] => {
    const mutated = [...pattern];
    const mutations = Math.floor(pattern.length * mutationAmount);

    for (let i = 0; i < mutations; i++) {
      const action = Math.random();
      const idx = Math.floor(Math.random() * mutated.length);

      if (action < 0.33 && mutated.length > 1) {
        // Remove a step
        mutated.splice(idx, 1);
      } else if (action < 0.66) {
        // Shift a step
        const newStep = (mutated[idx]! + (Math.random() < 0.5 ? 1 : -1) + 16) % 16;
        mutated[idx] = newStep;
      } else {
        // Add a step
        const newStep = Math.floor(Math.random() * 16);
        if (!mutated.includes(newStep)) {
          mutated.push(newStep);
        }
      }
    }

    return [...new Set(mutated)].sort((a, b) => a - b);
  };

  return {
    ...groove,
    id: `${groove.id}-mutated-${Date.now()}`,
    kickPattern: mutate(groove.kickPattern),
    hatPattern: mutate(groove.hatPattern),
    description: `${groove.description} (mutated)`,
  };
}
