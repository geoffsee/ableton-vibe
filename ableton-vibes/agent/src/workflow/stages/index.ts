// Stage 1: Brief Ingestion & Intent Lock
export {
  workflowIngestBrief,
  workflowLockIntent,
  stage1Tools,
  parseBrief,
  deriveProductionSpec,
} from "./briefIngestion";

// Stage 2: Build Style Prior
export {
  workflowBuildStylePrior,
  stage2Tools,
  buildStylePrior,
} from "./stylePrior";

// Stage 3: Create Time Base
export {
  workflowGenerateGrooves,
  workflowScoreGrooves,
  workflowSelectTimeBase,
  stage3Tools,
} from "./timeBase";

// Stage 4: Assemble Palette & Sound Bank
export {
  workflowAssemblePalette,
  workflowValidatePaletteCoverage,
  stage4Tools,
  generatePaletteEntries,
  validatePaletteCoverage,
} from "./palette";

// Stage 5: Generate Motif Seed Set
export {
  workflowGenerateMotifs,
  workflowScoreMotifs,
  workflowSelectTopMotifs,
  workflowGenerateAllMotifTypes,
  stage5Tools,
} from "./motifSeed";

// Stage 6: Draft Macro-Structure
export {
  workflowDraftMacroStructure,
  workflowValidateEnergyCurve,
  workflowAdjustSection,
  stage6Tools,
} from "./macroStructure";

// Stage 7: Compose & Orchestrate Per Section
export {
  workflowComposeSection,
  workflowScoreComposition,
  workflowComposeAllSections,
  stage7Tools,
} from "./composeOrchestrate";

// Stage 8: Iterate with Variation Operators
export {
  workflowApplyVariation,
  workflowGenerateEarCandy,
  workflowRunVariationPass,
  workflowGenerateTransitionFill,
  stage8Tools,
} from "./variationOperators";

// Stage 9: Mix & Spatial Design
export {
  workflowCreateLevelingPlan,
  workflowGenerateEqCompSuggestions,
  workflowDesignSpatialScene,
  workflowPlanAutomation,
  workflowAssembleMixDesign,
  stage9Tools,
} from "./mixSpatial";

// All workflow tools combined
export const allWorkflowTools = [
  // Re-import and combine
  ...require("./briefIngestion").stage1Tools,
  ...require("./stylePrior").stage2Tools,
  ...require("./timeBase").stage3Tools,
  ...require("./palette").stage4Tools,
  ...require("./motifSeed").stage5Tools,
  ...require("./macroStructure").stage6Tools,
  ...require("./composeOrchestrate").stage7Tools,
  ...require("./variationOperators").stage8Tools,
  ...require("./mixSpatial").stage9Tools,
];
