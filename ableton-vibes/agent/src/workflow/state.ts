import { Annotation } from "@langchain/langgraph";
import type { WorkflowState, WorkflowStage, RevisionHistoryEntry } from "./types";

/**
 * Default initial workflow state
 */
export const defaultWorkflowState: WorkflowState = {
  currentStage: "briefIngestion",
  stagesCompleted: [],
  revisionHistory: [],
};

/**
 * Workflow state annotation for LangGraph integration.
 * Uses a reducer that properly merges workflow progress.
 */
export const WorkflowStateAnnotation = Annotation<WorkflowState>({
  reducer: (current, update) => {
    if (!current) return update ?? defaultWorkflowState;
    if (!update) return current;

    // Merge completed stages (unique set)
    const stagesCompleted = [
      ...new Set([
        ...(current.stagesCompleted ?? []),
        ...(update.stagesCompleted ?? []),
      ]),
    ] as WorkflowStage[];

    // Append revision history
    const revisionHistory = [
      ...(current.revisionHistory ?? []),
      ...(update.revisionHistory ?? []),
    ] as RevisionHistoryEntry[];

    return {
      ...current,
      ...update,
      stagesCompleted,
      revisionHistory,
    };
  },
  default: () => defaultWorkflowState,
});

/**
 * Helper to add a revision history entry
 */
export function createRevisionEntry(
  stage: WorkflowStage,
  action: string,
  summary: string
): RevisionHistoryEntry {
  return {
    stage,
    timestamp: new Date().toISOString(),
    action,
    summary,
  };
}

/**
 * Check if a stage has been completed
 */
export function isStageCompleted(
  state: WorkflowState,
  stage: WorkflowStage
): boolean {
  return state.stagesCompleted.includes(stage);
}

/**
 * Get the next recommended stage based on current progress
 */
export function getNextStage(state: WorkflowState): WorkflowStage | null {
  const stageOrder: WorkflowStage[] = [
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

  for (const stage of stageOrder) {
    if (!state.stagesCompleted.includes(stage)) {
      return stage;
    }
  }

  return null; // All stages completed
}

/**
 * Calculate workflow completion percentage
 */
export function getWorkflowProgress(state: WorkflowState): number {
  const totalStages = 9;
  return Math.round((state.stagesCompleted.length / totalStages) * 100);
}
