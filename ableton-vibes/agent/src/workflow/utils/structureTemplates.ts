/**
 * Arrangement structure templates and archetypes
 */

import type {
  StructuralArchetype,
  SectionType,
  ArrangementSection,
  MacroStructure,
} from "../types";

/**
 * Section template with relative energy and typical length
 */
export interface SectionTemplate {
  type: SectionType;
  typicalLengthBars: number;
  energyLevel: number;
  description: string;
}

/**
 * Section templates by type
 */
export const SECTION_TEMPLATES: Record<SectionType, SectionTemplate> = {
  intro: {
    type: "intro",
    typicalLengthBars: 8,
    energyLevel: 30,
    description: "Sets the mood and introduces key elements",
  },
  verse: {
    type: "verse",
    typicalLengthBars: 16,
    energyLevel: 50,
    description: "Main lyrical/melodic content, moderate energy",
  },
  preChorus: {
    type: "preChorus",
    typicalLengthBars: 8,
    energyLevel: 65,
    description: "Builds tension before the chorus",
  },
  chorus: {
    type: "chorus",
    typicalLengthBars: 16,
    energyLevel: 85,
    description: "Hook and highest energy vocal/melodic section",
  },
  buildup: {
    type: "buildup",
    typicalLengthBars: 8,
    energyLevel: 70,
    description: "Rising tension leading to drop/chorus",
  },
  drop: {
    type: "drop",
    typicalLengthBars: 16,
    energyLevel: 95,
    description: "Maximum energy, full instrumentation",
  },
  breakdown: {
    type: "breakdown",
    typicalLengthBars: 8,
    energyLevel: 35,
    description: "Stripped back section for contrast",
  },
  build: {
    type: "build",
    typicalLengthBars: 8,
    energyLevel: 70,
    description: "Rising tension leading to drop/chorus (alias for buildup)",
  },
  bridge: {
    type: "bridge",
    typicalLengthBars: 8,
    energyLevel: 55,
    description: "Contrasting section with new musical ideas",
  },
  outro: {
    type: "outro",
    typicalLengthBars: 8,
    energyLevel: 25,
    description: "Wind down and conclusion",
  },
  transition: {
    type: "transition",
    typicalLengthBars: 4,
    energyLevel: 50,
    description: "Bridge between major sections",
  },
};

/**
 * Archetype structure definitions
 */
export interface ArchetypeStructure {
  name: string;
  sections: SectionType[];
  description: string;
  typicalGenres: string[];
}

export const ARCHETYPE_STRUCTURES: Record<StructuralArchetype, ArchetypeStructure> = {
  // CamelCase versions
  verseChorus: {
    name: "Verse-Chorus",
    sections: ["intro", "verse", "chorus", "verse", "chorus", "bridge", "chorus", "outro"],
    description: "Traditional pop/rock structure with alternating verses and choruses",
    typicalGenres: ["pop", "rock", "indie", "country"],
  },
  buildDrop: {
    name: "Build-Drop",
    sections: ["intro", "build", "drop", "breakdown", "build", "drop", "outro"],
    description: "EDM-style structure focused on tension and release",
    typicalGenres: ["techno", "house", "trance", "dubstep", "dnb"],
  },
  throughComposed: {
    name: "Through-Composed",
    sections: ["intro", "verse", "verse", "bridge", "verse", "outro"],
    description: "Continuously evolving without repeating sections",
    typicalGenres: ["ambient", "classical", "progressive"],
  },
  rondo: {
    name: "Rondo (ABACA)",
    sections: ["intro", "chorus", "verse", "chorus", "bridge", "chorus", "outro"],
    description: "Recurring main theme with contrasting episodes",
    typicalGenres: ["classical", "jazz", "progressive"],
  },
  aaba: {
    name: "AABA (32-bar)",
    sections: ["verse", "verse", "bridge", "verse"],
    description: "Classic jazz/tin pan alley form",
    typicalGenres: ["jazz", "standards", "musical theater"],
  },
  binary: {
    name: "Binary (AB)",
    sections: ["intro", "verse", "chorus", "outro"],
    description: "Simple two-part structure",
    typicalGenres: ["electronic", "ambient", "minimal"],
  },
  ternary: {
    name: "Ternary (ABA)",
    sections: ["intro", "verse", "bridge", "verse", "outro"],
    description: "Three-part structure with return to opening",
    typicalGenres: ["classical", "ambient", "cinematic"],
  },
  // Hyphenated versions (aliases)
  "verse-chorus": {
    name: "Verse-Chorus",
    sections: ["intro", "verse", "chorus", "verse", "chorus", "bridge", "chorus", "outro"],
    description: "Traditional pop/rock structure with alternating verses and choruses",
    typicalGenres: ["pop", "rock", "indie", "country"],
  },
  "build-drop": {
    name: "Build-Drop",
    sections: ["intro", "build", "drop", "breakdown", "build", "drop", "outro"],
    description: "EDM-style structure focused on tension and release",
    typicalGenres: ["techno", "house", "trance", "dubstep", "dnb"],
  },
  "through-composed": {
    name: "Through-Composed",
    sections: ["intro", "verse", "verse", "bridge", "verse", "outro"],
    description: "Continuously evolving without repeating sections",
    typicalGenres: ["ambient", "classical", "progressive"],
  },
  aba: {
    name: "ABA (Ternary)",
    sections: ["intro", "verse", "bridge", "verse", "outro"],
    description: "Three-part structure with return to opening",
    typicalGenres: ["classical", "ambient", "cinematic"],
  },
};

/**
 * Generate a macro structure from an archetype
 */
export function generateMacroStructure(
  archetype: StructuralArchetype,
  options: {
    totalBars?: number;
    scaleFactor?: number;
    key?: string;
  } = {}
): MacroStructure {
  const archetypeData = ARCHETYPE_STRUCTURES[archetype];
  const scaleFactor = options.scaleFactor ?? 1;

  let currentBar = 0;
  const sections: ArrangementSection[] = [];
  const energyCurve: { bar: number; energy: number }[] = [];
  const keyMoments: { bar: number; description: string }[] = [];

  for (let i = 0; i < archetypeData.sections.length; i++) {
    const sectionType = archetypeData.sections[i]!;
    const template = SECTION_TEMPLATES[sectionType];
    const lengthBars = Math.round(template.typicalLengthBars * scaleFactor);

    // Create unique name for repeated section types
    const sameTypeSections = sections.filter((s) => s.type === sectionType);
    const suffix = sameTypeSections.length > 0 ? ` ${sameTypeSections.length + 1}` : "";

    const section: ArrangementSection = {
      id: `${sectionType}-${i}`,
      type: sectionType,
      name: `${sectionType.charAt(0).toUpperCase() + sectionType.slice(1)}${suffix}`,
      startBar: currentBar,
      lengthBars,
      energyLevel: template.energyLevel,
      elements: [],
      transitions: {
        in: i > 0 ? getTransitionType(archetypeData.sections[i - 1]!, sectionType) : undefined,
        out: i < archetypeData.sections.length - 1
          ? getTransitionType(sectionType, archetypeData.sections[i + 1]!)
          : undefined,
      },
    };

    sections.push(section);

    // Add energy curve points
    energyCurve.push({ bar: currentBar, energy: template.energyLevel });
    energyCurve.push({ bar: currentBar + lengthBars, energy: template.energyLevel });

    // Mark key moments
    if (sectionType === "drop" || sectionType === "chorus") {
      keyMoments.push({ bar: currentBar, description: `${sectionType} starts` });
    } else if (sectionType === "breakdown") {
      keyMoments.push({ bar: currentBar, description: "breakdown starts" });
    } else if (sectionType === "build") {
      keyMoments.push({ bar: currentBar, description: "build starts" });
    }

    currentBar += lengthBars;
  }

  // Override total bars if specified
  if (options.totalBars && options.totalBars !== currentBar) {
    const ratio = options.totalBars / currentBar;
    for (const section of sections) {
      section.startBar = Math.round(section.startBar * ratio);
      section.lengthBars = Math.round(section.lengthBars * ratio);
    }
    for (const point of energyCurve) {
      point.bar = Math.round(point.bar * ratio);
    }
    for (const moment of keyMoments) {
      moment.bar = Math.round(moment.bar * ratio);
    }
    currentBar = options.totalBars;
  }

  return {
    archetype,
    totalBars: currentBar,
    sections,
    energyCurve,
    keyMoments,
  };
}

/**
 * Get appropriate transition type between sections
 */
function getTransitionType(from: SectionType, to: SectionType): string {
  // Build to drop: riser, filter sweep, white noise
  if (from === "build" && to === "drop") {
    return "riser + impact";
  }

  // Drop to breakdown: reverse cymbal, filter close
  if (from === "drop" && to === "breakdown") {
    return "reverse cymbal + filter close";
  }

  // Breakdown to build: gradual layer addition
  if (from === "breakdown" && to === "build") {
    return "gradual layer in";
  }

  // Verse to chorus: lift, fill
  if (from === "verse" && to === "chorus") {
    return "drum fill + lift";
  }

  // Chorus to verse: strip back
  if (from === "chorus" && to === "verse") {
    return "strip elements";
  }

  // Default: crossfade
  return "crossfade";
}

/**
 * Common transition techniques
 */
export const TRANSITION_TECHNIQUES = {
  riser: {
    name: "Riser",
    description: "Ascending noise or synth sweep",
    duration: 4,
    energyChange: +20,
  },
  downlifter: {
    name: "Downlifter",
    description: "Descending sweep",
    duration: 2,
    energyChange: -10,
  },
  impact: {
    name: "Impact",
    description: "Explosive hit marking section start",
    duration: 0.5,
    energyChange: +30,
  },
  reverseCymbal: {
    name: "Reverse Cymbal",
    description: "Reversed crash building into hit",
    duration: 2,
    energyChange: +10,
  },
  drumFill: {
    name: "Drum Fill",
    description: "Rhythmic break leading to new section",
    duration: 1,
    energyChange: +5,
  },
  filterSweep: {
    name: "Filter Sweep",
    description: "High or low pass filter movement",
    duration: 4,
    energyChange: 0,
  },
  whiteNoise: {
    name: "White Noise Riser",
    description: "Filtered noise sweep",
    duration: 4,
    energyChange: +15,
  },
  silence: {
    name: "Silence",
    description: "Brief pause for impact",
    duration: 0.25,
    energyChange: -40,
  },
};

/**
 * Suggest best archetype for a genre
 */
export function suggestArchetypeForGenre(genre: string): StructuralArchetype {
  const lowerGenre = genre.toLowerCase();

  // Check each archetype's typical genres
  for (const [archetype, data] of Object.entries(ARCHETYPE_STRUCTURES)) {
    if (data.typicalGenres.some((g) => lowerGenre.includes(g) || g.includes(lowerGenre))) {
      return archetype as StructuralArchetype;
    }
  }

  // Default based on broad categories
  if (["techno", "house", "trance", "edm", "electronic", "dubstep", "dnb"].some((g) =>
    lowerGenre.includes(g)
  )) {
    return "buildDrop";
  }

  if (["ambient", "drone", "experimental", "noise"].some((g) => lowerGenre.includes(g))) {
    return "throughComposed";
  }

  if (["jazz", "swing", "bebop"].some((g) => lowerGenre.includes(g))) {
    return "aaba";
  }

  // Default to verse-chorus
  return "verseChorus";
}

/**
 * Calculate energy curve smoothness score
 */
export function scoreEnergyCurveSmoothness(
  energyCurve: { bar: number; energy: number }[]
): number {
  if (energyCurve.length < 2) return 100;

  let totalJump = 0;
  for (let i = 1; i < energyCurve.length; i++) {
    const prev = energyCurve[i - 1]!;
    const curr = energyCurve[i]!;
    const barDiff = curr.bar - prev.bar;
    const energyDiff = Math.abs(curr.energy - prev.energy);

    // Penalize large energy jumps over short bar spans
    if (barDiff > 0) {
      const rateOfChange = energyDiff / barDiff;
      if (rateOfChange > 10) {
        totalJump += rateOfChange - 10;
      }
    }
  }

  return Math.max(0, 100 - totalJump);
}

/**
 * Validate that structure meets production spec constraints
 */
export function validateStructure(
  structure: MacroStructure,
  constraints: {
    minSections?: number;
    maxSections?: number;
    mustHaveDrop?: boolean;
    mustHaveBreakdown?: boolean;
  }
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (constraints.minSections && structure.sections.length < constraints.minSections) {
    issues.push(`Too few sections: ${structure.sections.length} < ${constraints.minSections}`);
  }

  if (constraints.maxSections && structure.sections.length > constraints.maxSections) {
    issues.push(`Too many sections: ${structure.sections.length} > ${constraints.maxSections}`);
  }

  if (constraints.mustHaveDrop && !structure.sections.some((s) => s.type === "drop")) {
    issues.push("Structure must have a drop section");
  }

  if (constraints.mustHaveBreakdown && !structure.sections.some((s) => s.type === "breakdown")) {
    issues.push("Structure must have a breakdown section");
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
