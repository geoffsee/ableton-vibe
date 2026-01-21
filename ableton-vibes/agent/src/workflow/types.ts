import { z } from "zod";

// ============================================================================
// Stage 1: Brief Ingestion & Intent Lock
// ============================================================================

export const ProductionBriefSchema = z.object({
  genres: z.array(z.string()).min(1).describe("Primary and secondary genres"),
  references: z.array(z.string()).optional().describe("Reference tracks or artists"),
  mood: z.array(z.string()).describe("Emotional descriptors: dark, euphoric, melancholic"),
  useCase: z.string().optional().describe("Use case: club, listening, sync, live, ambient, workout"),
  targetDurationBars: z.number().optional().describe("Target duration in bars"),
  rules: z
    .object({
      must: z.array(z.string()).describe("Required elements"),
      mustNot: z.array(z.string()).describe("Elements to avoid"),
    })
    .optional(),
});
export type ProductionBrief = z.infer<typeof ProductionBriefSchema>;

export const ProductionSpecSchema = z.object({
  tempoRange: z.object({
    min: z.number(),
    max: z.number(),
  }),
  energyArc: z.array(
    z.object({
      position: z.number().describe("Position 0-1 through track"),
      energy: z.number().describe("Energy level 0-100"),
    })
  ),
  instrumentation: z.array(z.string()).describe("Suggested instruments"),
  mixAesthetic: z.string().describe("Mix aesthetic description"),
  structuralConstraints: z.object({
    minSections: z.number(),
    maxSections: z.number(),
    requireIntro: z.boolean().optional(),
    requireOutro: z.boolean().optional(),
  }),
});
export type ProductionSpec = z.infer<typeof ProductionSpecSchema>;

// ============================================================================
// Stage 2: Build Style Prior
// ============================================================================

export const StylePriorSchema = z.object({
  bpmSignature: z.object({
    typical: z.number(),
    variance: z.number().describe("Acceptable BPM variance"),
  }),
  swingProfile: z.object({
    amount: z.number().min(0).max(100),
    subdivision: z.enum(["8th", "16th"]),
  }),
  soundDesignTraits: z.array(z.string()).describe("Sound design characteristics"),
  arrangementNorms: z.object({
    typicalIntroLength: z.number().describe("Bars"),
    typicalDropLength: z.number(),
    typicalBreakdownLength: z.number(),
    transitionStyle: z.array(z.string()),
  }),
  guardrails: z.object({
    energyProfile: z.string().describe("Overall energy description"),
    avoidCliches: z.array(z.string()).describe("Cliches to avoid"),
  }),
});
export type StylePrior = z.infer<typeof StylePriorSchema>;

// ============================================================================
// Stage 3: Create Time Base
// ============================================================================

export const GrooveCandidateSchema = z.object({
  id: z.string(),
  tempo: z.number(),
  meter: z.string().describe("Time signature like 4/4, 6/8"),
  swingAmount: z.number().min(0).max(100),
  kickPattern: z.array(z.number()).describe("Beat positions 0-15 for 16th notes"),
  snarePattern: z.array(z.number()),
  hatPattern: z.array(z.number()),
  velocityVariance: z.number().min(0).max(30),
  humanization: z.object({
    timingJitter: z.number(),
    velocityJitter: z.number(),
  }),
  description: z.string(),
});
export type GrooveCandidate = z.infer<typeof GrooveCandidateSchema>;

export const GrooveBreakdownSchema = z.object({
  kickPlacement: z.number(),
  snareBackbeat: z.number(),
  hatGroove: z.number(),
  syncopation: z.number(),
});
export type GrooveBreakdown = z.infer<typeof GrooveBreakdownSchema>;

export const GrooveScoreSchema = z.object({
  candidateId: z.string(),
  danceability: z.number().min(0).max(100),
  pocket: z.number().min(0).max(100),
  genreFit: z.number().min(0).max(100),
  overall: z.number().min(0).max(100),
  breakdown: z.record(z.number()),
});
export type GrooveScore = z.infer<typeof GrooveScoreSchema>;

export const TimeBaseSchema = z.object({
  finalTempo: z.number(),
  finalMeter: z.string(),
  selectedGroove: GrooveCandidateSchema,
  alternateGrooves: z.array(GrooveCandidateSchema),
});
export type TimeBase = z.infer<typeof TimeBaseSchema>;

// ============================================================================
// Stage 4: Assemble Palette & Sound Bank
// ============================================================================

export const PaletteEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(["sub", "bass", "lowMid", "mid", "highMid", "presence", "air"]),
  type: z.enum(["sample", "synth", "recording"]),
  frequencyRange: z.object({
    low: z.number(),
    high: z.number(),
  }),
  characteristics: z.array(z.string()),
  processingHints: z.array(z.string()),
});
export type PaletteEntry = z.infer<typeof PaletteEntrySchema>;

export const SoundPaletteSchema = z.object({
  maxElements: z.number(),
  entries: z.array(PaletteEntrySchema),
  coverageByRole: z.record(z.number()),
  forbidden: z.array(z.string()),
});
export type SoundPalette = z.infer<typeof SoundPaletteSchema>;

// ============================================================================
// Stage 5: Generate Motif Seed Set
// ============================================================================

export const MotifNoteSchema = z.object({
  pitch: z.number().describe("MIDI pitch 0-127"),
  time: z.number().describe("Time in beats"),
  duration: z.number().describe("Duration in beats"),
  velocity: z.number().describe("Velocity 0-127"),
});
export type MotifNote = z.infer<typeof MotifNoteSchema>;

export const MotifSeedSchema = z.object({
  id: z.string(),
  type: z.enum(["melodic", "rhythmic", "harmonic", "textural"]),
  name: z.string(),
  notes: z.array(MotifNoteSchema),
  lengthBars: z.number(),
  key: z.string(),
  scale: z.string(),
  description: z.string().optional(),
});
export type MotifSeed = z.infer<typeof MotifSeedSchema>;

export const MotifBreakdownSchema = z.object({
  intervalVariety: z.number(),
  rhythmicInterest: z.number(),
  contour: z.number(),
  repetitionBalance: z.number(),
});
export type MotifBreakdown = z.infer<typeof MotifBreakdownSchema>;

export const MotifScoreSchema = z.object({
  motifId: z.string(),
  memorability: z.number().min(0).max(100),
  singability: z.number().min(0).max(100),
  tensionRelief: z.number().min(0).max(100),
  novelty: z.number().min(0).max(100),
  genreFit: z.number().min(0).max(100),
  overall: z.number().min(0).max(100),
  breakdown: MotifBreakdownSchema,
});
export type MotifScore = z.infer<typeof MotifScoreSchema>;

export const MotifSeedSetSchema = z.object({
  totalGenerated: z.number(),
  seeds: z.array(MotifSeedSchema),
  scores: z.array(MotifScoreSchema),
  topN: z.number(),
});
export type MotifSeedSet = z.infer<typeof MotifSeedSetSchema>;

// ============================================================================
// Stage 6: Draft Macro-Structure
// ============================================================================

export type StructuralArchetype = "verse-chorus" | "build-drop" | "aba" | "through-composed" | "rondo" | "verseChorus" | "buildDrop" | "throughComposed" | "aaba" | "binary" | "ternary";
export type SectionType = "intro" | "verse" | "buildup" | "drop" | "breakdown" | "bridge" | "outro" | "chorus" | "preChorus" | "build" | "transition";

export const ArrangementSectionSchema = z.object({
  id: z.string(),
  type: z.enum(["intro", "verse", "buildup", "drop", "breakdown", "bridge", "outro", "chorus", "preChorus", "build", "transition"]),
  name: z.string(),
  startBar: z.number(),
  lengthBars: z.number(),
  energyLevel: z.number().min(0).max(100),
  elements: z.array(z.string()).describe("Which elements are active"),
  transitions: z.object({
    in: z.string().optional(),
    out: z.string().optional(),
  }).optional(),
});
export type ArrangementSection = z.infer<typeof ArrangementSectionSchema>;

export const MacroStructureSchema = z.object({
  archetype: z.string(),
  totalBars: z.number(),
  sections: z.array(ArrangementSectionSchema),
  energyCurve: z.array(
    z.object({
      bar: z.number(),
      energy: z.number(),
    })
  ),
  keyMoments: z.array(
    z.object({
      bar: z.number(),
      description: z.string(),
    })
  ),
});
export type MacroStructure = z.infer<typeof MacroStructureSchema>;

// ============================================================================
// Stage 7: Compose & Orchestrate Per Section
// ============================================================================

export const HarmonyProgressionSchema = z.object({
  startBeat: z.number(),
  chord: z.string(),
  duration: z.number(),
});
export type HarmonyProgression = z.infer<typeof HarmonyProgressionSchema>;

export const VoiceSchema = z.object({
  role: z.enum(["bass", "harmony", "topline", "lead", "counterline", "rhythm", "pad", "texture", "fx"]),
  trackName: z.string(),
  clipName: z.string(),
  notes: z.array(MotifNoteSchema),
  paletteEntryId: z.string().optional(),
});
export type Voice = z.infer<typeof VoiceSchema>;

export const SectionCompositionSchema = z.object({
  sectionId: z.string(),
  voices: z.array(VoiceSchema),
  harmonyProgression: z.array(HarmonyProgressionSchema),
  densityLevel: z.number().min(1).max(10),
  registerDistribution: z.record(z.number()),
});
export type SectionComposition = z.infer<typeof SectionCompositionSchema>;

export const CompositionScoreSchema = z.object({
  sectionId: z.string(),
  voiceLeadingSanity: z.number().min(0).max(100),
  densityScore: z.number().min(0).max(100),
  registerCollisions: z.number(),
  harmonicClarity: z.number().min(0).max(100),
  overall: z.number().min(0).max(100),
});
export type CompositionScore = z.infer<typeof CompositionScoreSchema>;

// ============================================================================
// Stage 8: Iterate with Variation Operators
// ============================================================================

export const VariationSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  operator: z.string(),
  result: MotifSeedSchema,
  coherenceScore: z.number(),
  improvementDelta: z.number(),
});
export type Variation = z.infer<typeof VariationSchema>;

export const EarCandySchema = z.object({
  id: z.string(),
  type: z.enum(["riser", "downlifter", "impact", "sweep", "stutter", "vocal-chop", "reverse", "white-noise"]),
  position: z.number().describe("Position in bars"),
  duration: z.number().describe("Duration in bars"),
});
export type EarCandy = z.infer<typeof EarCandySchema>;

export const VariationPassSchema = z.object({
  passNumber: z.number(),
  variations: z.array(VariationSchema),
  earCandy: z.array(EarCandySchema),
  transitionEnhancements: z.array(
    z.object({
      bar: z.number(),
      earCandy: z.array(EarCandySchema),
      fillPattern: MotifSeedSchema.optional(),
    })
  ),
});
export type VariationPass = z.infer<typeof VariationPassSchema>;

// ============================================================================
// Stage 9: Mix & Spatial Design
// ============================================================================

export type SoundRole = "sub" | "bass" | "lowMid" | "mid" | "highMid" | "presence" | "air";

export type TrackLevel = {
  trackName: string;
  stemGroup: "drums" | "bass" | "synths" | "pads" | "fx" | "vocals";
  targetDb: number;
  pan: number;
};

export const LevelingPlanSchema = z.object({
  tracks: z.array(
    z.object({
      trackName: z.string(),
      stemGroup: z.enum(["drums", "bass", "synths", "pads", "fx", "vocals"]),
      targetDb: z.number(),
      pan: z.number().min(-100).max(100),
    })
  ),
});
export type LevelingPlan = z.infer<typeof LevelingPlanSchema>;

export const EqBandSchema = z.object({
  frequency: z.number(),
  gain: z.number(),
  q: z.number(),
  type: z.enum(["peak", "shelf", "highpass", "lowpass"]),
});
export type EqBand = z.infer<typeof EqBandSchema>;

export const CompressionSettingsSchema = z.object({
  threshold: z.number(),
  ratio: z.number(),
  attack: z.number(),
  release: z.number(),
});
export type CompressionSettings = z.infer<typeof CompressionSettingsSchema>;

export const EqCompSuggestionSchema = z.object({
  stemGroup: z.enum(["drums", "bass", "synths", "pads", "fx", "vocals"]),
  eq: z.array(EqBandSchema),
  compression: CompressionSettingsSchema,
  saturation: z.object({
    drive: z.number(),
    mix: z.number(),
  }).optional(),
});
export type EqCompSuggestion = z.infer<typeof EqCompSuggestionSchema>;

export const DepthLayerSchema = z.object({
  name: z.string(),
  reverbType: z.enum(["room", "plate", "hall", "spring", "shimmer"]),
  decayTime: z.number(),
  predelay: z.number(),
  wetLevel: z.number(),
  assignedTracks: z.array(z.string()),
  character: z.string(),
});
export type DepthLayer = z.infer<typeof DepthLayerSchema>;

export const DelaySchema = z.object({
  name: z.string(),
  type: z.enum(["mono", "ping-pong", "tape", "dotted"]),
  time: z.string().describe("Time value like 1/4, 1/8d"),
  feedback: z.number(),
  assignedTracks: z.array(z.string()),
});
export type Delay = z.infer<typeof DelaySchema>;

export const WidthProcessingSchema = z.object({
  trackName: z.string(),
  technique: z.enum(["stereoWidth", "haas", "mid-side", "microshift"]),
  amount: z.number(),
});
export type WidthProcessing = z.infer<typeof WidthProcessingSchema>;

export const SpatialSceneSchema = z.object({
  depthLayers: z.array(DepthLayerSchema),
  delays: z.array(DelaySchema),
  widthProcessing: z.array(WidthProcessingSchema),
});
export type SpatialScene = z.infer<typeof SpatialSceneSchema>;

export const AutomationPassSchema = z.object({
  parameter: z.string(),
  trackName: z.string(),
  keyframes: z.array(
    z.object({
      bar: z.number(),
      value: z.number(),
    })
  ),
  purpose: z.string(),
});
export type AutomationPass = z.infer<typeof AutomationPassSchema>;

export const MasterChainDeviceSchema = z.object({
  order: z.number(),
  device: z.string(),
  purpose: z.string(),
  settings: z.record(z.any()),
});
export type MasterChainDevice = z.infer<typeof MasterChainDeviceSchema>;

export const MixDesignSchema = z.object({
  leveling: LevelingPlanSchema,
  eqCompSuggestions: z.array(EqCompSuggestionSchema),
  spatialScene: SpatialSceneSchema,
  automationPasses: z.array(AutomationPassSchema),
  masterChain: z.array(MasterChainDeviceSchema),
});
export type MixDesign = z.infer<typeof MixDesignSchema>;

export const MixScoreSchema = z.object({
  balance: z.number(),
  stereo: z.number(),
  depth: z.number(),
  translation: z.number(),
  overall: z.number(),
});
export type MixScore = z.infer<typeof MixScoreSchema>;

// ============================================================================
// Workflow State
// ============================================================================

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

export type RevisionHistoryEntry = {
  stage: WorkflowStage;
  timestamp: string;
  action: string;
  summary: string;
};

export const WorkflowStateSchema = z.object({
  currentStage: z.enum([
    "briefIngestion",
    "stylePrior",
    "timeBase",
    "palette",
    "motifSeed",
    "macroStructure",
    "composeOrchestrate",
    "variationOperators",
    "mixSpatial",
  ]),
  stagesCompleted: z.array(z.enum([
    "briefIngestion",
    "stylePrior",
    "timeBase",
    "palette",
    "motifSeed",
    "macroStructure",
    "composeOrchestrate",
    "variationOperators",
    "mixSpatial",
  ])),
  brief: ProductionBriefSchema.optional(),
  spec: ProductionSpecSchema.optional(),
  stylePrior: StylePriorSchema.optional(),
  timeBase: TimeBaseSchema.optional(),
  palette: SoundPaletteSchema.optional(),
  motifSeedSet: MotifSeedSetSchema.optional(),
  macroStructure: MacroStructureSchema.optional(),
  compositions: z.array(SectionCompositionSchema).optional(),
  variationPasses: z.array(VariationPassSchema).optional(),
  mixDesign: MixDesignSchema.optional(),
  revisionHistory: z.array(
    z.object({
      stage: z.enum([
        "briefIngestion",
        "stylePrior",
        "timeBase",
        "palette",
        "motifSeed",
        "macroStructure",
        "composeOrchestrate",
        "variationOperators",
        "mixSpatial",
      ]),
      timestamp: z.string(),
      action: z.string(),
      summary: z.string(),
    })
  ),
});
export type WorkflowState = z.infer<typeof WorkflowStateSchema>;
