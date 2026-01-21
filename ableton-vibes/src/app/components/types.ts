// Frontend types mirroring agent workflow types
// Re-export key types from agent for use in frontend

export type WorkflowStage =
  | "briefIngestion"
  | "stylePrior"
  | "timeBase"
  | "palette"
  | "motifSeed"
  | "macroStructure"
  | "composeOrchestrate"
  | "variationOperators"
  | "mixSpatial";

export const WORKFLOW_STAGES: WorkflowStage[] = [
  "briefIngestion",
  "stylePrior",
  "timeBase",
  "palette",
  "motifSeed",
  "macroStructure",
  "composeOrchestrate",
  "variationOperators",
  "mixSpatial",
];

export const STAGE_CONFIG: Record<
  WorkflowStage,
  { label: string; shortLabel: string; color: string; icon: string }
> = {
  briefIngestion: {
    label: "Brief & Intent",
    shortLabel: "Brief",
    color: "#ec4899", // pink
    icon: "1",
  },
  stylePrior: {
    label: "Style Prior",
    shortLabel: "Style",
    color: "#f97316", // orange
    icon: "2",
  },
  timeBase: {
    label: "Time Base",
    shortLabel: "Groove",
    color: "#eab308", // yellow
    icon: "3",
  },
  palette: {
    label: "Sound Palette",
    shortLabel: "Palette",
    color: "#22c55e", // green
    icon: "4",
  },
  motifSeed: {
    label: "Motif Seeds",
    shortLabel: "Motifs",
    color: "#06b6d4", // cyan
    icon: "5",
  },
  macroStructure: {
    label: "Structure",
    shortLabel: "Structure",
    color: "#3b82f6", // blue
    icon: "6",
  },
  composeOrchestrate: {
    label: "Compose",
    shortLabel: "Compose",
    color: "#8b5cf6", // violet
    icon: "7",
  },
  variationOperators: {
    label: "Variations",
    shortLabel: "Variations",
    color: "#a855f7", // purple
    icon: "8",
  },
  mixSpatial: {
    label: "Mix Design",
    shortLabel: "Mix",
    color: "#f43f5e", // rose
    icon: "9",
  },
};

// Brief types
export type ProductionBrief = {
  genres: string[];
  references?: string[];
  mood: string[];
  useCase?: string;
  targetDurationBars?: number;
  rules?: {
    must: string[];
    mustNot: string[];
  };
};

export type ProductionSpec = {
  tempoRange: { min: number; max: number };
  energyArc: { position: number; energy: number }[];
  instrumentation: string[];
  mixAesthetic: string;
  structuralConstraints: {
    minSections: number;
    maxSections: number;
    requireIntro?: boolean;
    requireOutro?: boolean;
  };
};

// Style Prior types
export type StylePrior = {
  bpmSignature: { typical: number; variance: number };
  swingProfile: { amount: number; subdivision: "8th" | "16th" };
  soundDesignTraits: string[];
  arrangementNorms: {
    typicalIntroLength: number;
    typicalDropLength: number;
    typicalBreakdownLength: number;
    transitionStyle: string[];
  };
  guardrails: {
    energyProfile: string;
    avoidCliches: string[];
  };
};

// Time Base types
export type GrooveCandidate = {
  id: string;
  tempo: number;
  meter: string;
  swingAmount: number;
  kickPattern: number[];
  snarePattern: number[];
  hatPattern: number[];
  velocityVariance: number;
  humanization: { timingJitter: number; velocityJitter: number };
  description: string;
};

export type GrooveScore = {
  candidateId: string;
  danceability: number;
  pocket: number;
  genreFit: number;
  overall: number;
  breakdown: Record<string, number>;
};

export type TimeBase = {
  finalTempo: number;
  finalMeter: string;
  selectedGroove: GrooveCandidate;
  alternateGrooves: GrooveCandidate[];
};

// Palette types
export type PaletteEntry = {
  id: string;
  name: string;
  role: "sub" | "bass" | "lowMid" | "mid" | "highMid" | "presence" | "air";
  type: "sample" | "synth" | "recording";
  frequencyRange: { low: number; high: number };
  characteristics: string[];
  processingHints: string[];
};

export type SoundPalette = {
  maxElements: number;
  entries: PaletteEntry[];
  coverageByRole: Record<string, number>;
  forbidden: string[];
};

// Motif types
export type MotifNote = {
  pitch: number;
  time: number;
  duration: number;
  velocity: number;
};

export type MotifSeed = {
  id: string;
  type: "melodic" | "rhythmic" | "harmonic" | "textural";
  name: string;
  notes: MotifNote[];
  lengthBars: number;
  key: string;
  scale: string;
  description?: string;
};

export type MotifScore = {
  motifId: string;
  memorability: number;
  singability: number;
  tensionRelief: number;
  novelty: number;
  genreFit: number;
  overall: number;
  breakdown: {
    intervalVariety: number;
    rhythmicInterest: number;
    contour: number;
    repetitionBalance: number;
  };
};

export type MotifSeedSet = {
  totalGenerated: number;
  seeds: MotifSeed[];
  scores: MotifScore[];
  topN: number;
};

// Structure types
export type SectionType =
  | "intro"
  | "verse"
  | "buildup"
  | "drop"
  | "breakdown"
  | "bridge"
  | "outro"
  | "chorus"
  | "preChorus"
  | "build"
  | "transition";

export type ArrangementSection = {
  id: string;
  type: SectionType;
  name: string;
  startBar: number;
  lengthBars: number;
  energyLevel: number;
  elements: string[];
  transitions?: { in?: string; out?: string };
};

export type MacroStructure = {
  archetype: string;
  totalBars: number;
  sections: ArrangementSection[];
  energyCurve: { bar: number; energy: number }[];
  keyMoments: { bar: number; description: string }[];
};

// Composition types
export type Voice = {
  role: "bass" | "harmony" | "topline" | "lead" | "counterline" | "rhythm" | "pad" | "texture" | "fx";
  trackName: string;
  clipName: string;
  notes: MotifNote[];
  paletteEntryId?: string;
};

export type SectionComposition = {
  sectionId: string;
  voices: Voice[];
  harmonyProgression: { startBeat: number; chord: string; duration: number }[];
  densityLevel: number;
  registerDistribution: Record<string, number>;
};

// Variation types
export type EarCandy = {
  id: string;
  type: "riser" | "downlifter" | "impact" | "sweep" | "stutter" | "vocal-chop" | "reverse" | "white-noise";
  position: number;
  duration: number;
};

export type VariationPass = {
  passNumber: number;
  variations: {
    id: string;
    sourceId: string;
    operator: string;
    result: MotifSeed;
    coherenceScore: number;
    improvementDelta: number;
  }[];
  earCandy: EarCandy[];
  transitionEnhancements: {
    bar: number;
    earCandy: EarCandy[];
    fillPattern?: MotifSeed;
  }[];
};

// Mix types
export type TrackLevel = {
  trackName: string;
  stemGroup: "drums" | "bass" | "synths" | "pads" | "fx" | "vocals";
  targetDb: number;
  pan: number;
};

export type DepthLayer = {
  name: string;
  reverbType: "room" | "plate" | "hall" | "spring" | "shimmer";
  decayTime: number;
  predelay: number;
  wetLevel: number;
  assignedTracks: string[];
  character: string;
};

export type MixDesign = {
  leveling: { tracks: TrackLevel[] };
  eqCompSuggestions: {
    stemGroup: "drums" | "bass" | "synths" | "pads" | "fx" | "vocals";
    eq: { frequency: number; gain: number; q: number; type: string }[];
    compression: { threshold: number; ratio: number; attack: number; release: number };
    saturation?: { drive: number; mix: number };
  }[];
  spatialScene: {
    depthLayers: DepthLayer[];
    delays: {
      name: string;
      type: "mono" | "ping-pong" | "tape" | "dotted";
      time: string;
      feedback: number;
      assignedTracks: string[];
    }[];
    widthProcessing: {
      trackName: string;
      technique: "stereoWidth" | "haas" | "mid-side" | "microshift";
      amount: number;
    }[];
  };
  automationPasses: {
    parameter: string;
    trackName: string;
    keyframes: { bar: number; value: number }[];
    purpose: string;
  }[];
  masterChain: {
    order: number;
    device: string;
    purpose: string;
    settings: Record<string, unknown>;
  }[];
};

// Complete workflow state
export type WorkflowUIState = {
  currentStage: WorkflowStage;
  stagesCompleted: WorkflowStage[];
  brief?: ProductionBrief;
  spec?: ProductionSpec;
  stylePrior?: StylePrior;
  grooveCandidates?: GrooveCandidate[];
  grooveScores?: GrooveScore[];
  timeBase?: TimeBase;
  palette?: SoundPalette;
  motifSeedSet?: MotifSeedSet;
  macroStructure?: MacroStructure;
  compositions?: SectionComposition[];
  variationPasses?: VariationPass[];
  mixDesign?: MixDesign;
};

// Existing Ableton types from page.tsx
export type AbletonDevice = {
  name: string;
  category: "Instrument" | "Audio Effect" | "MIDI Effect" | "Max for Live" | string;
  notes?: string;
};

export type AbletonClip = {
  name: string;
  length: string;
  clipType: "MIDI" | "Audio" | "Automation" | string;
  description?: string;
  notes?: MotifNote[];
};

export type MaxPatchIdea = {
  id: string;
  name: string;
  description: string;
  devices?: string[];
  modulationTargets?: string[];
};

export type AbletonTrack = {
  id: string;
  name: string;
  type: "MIDI" | "Audio" | "Return" | string;
  color?: string;
  role?: string;
  notes?: string;
  devices: AbletonDevice[];
  clips: AbletonClip[];
  maxPatch?: MaxPatchIdea | null;
};

export type AbletonProjectState = {
  projectName: string;
  genre: string;
  vibe: string;
  tempo: number;
  key: string;
  timeSignature: string;
  arrangementNotes: string;
  sessionViewNotes: string;
  nextActions: string[];
  maxPatchIdeas: MaxPatchIdea[];
  tracks: AbletonTrack[];
};

export type AbletonAgentState = {
  project: AbletonProjectState;
  workflow: WorkflowUIState;
};
