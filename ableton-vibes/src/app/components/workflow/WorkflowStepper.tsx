"use client";

import { WorkflowStage, WORKFLOW_STAGES, STAGE_CONFIG } from "../types";

type WorkflowStepperProps = {
  currentStage: WorkflowStage;
  completedStages: WorkflowStage[];
  onStageClick?: (stage: WorkflowStage) => void;
};

export function WorkflowStepper({
  currentStage,
  completedStages,
  onStageClick,
}: WorkflowStepperProps) {
  const currentIndex = WORKFLOW_STAGES.indexOf(currentStage);
  const completedCount = completedStages.length;
  const progress = Math.round((completedCount / WORKFLOW_STAGES.length) * 100);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        {/* Progress indicator */}
        <div className="hidden md:flex items-center gap-2 text-sm">
          <span className="text-white/60">Progress:</span>
          <span className="font-semibold text-white">{progress}%</span>
        </div>

        {/* Stepper */}
        <div className="flex flex-1 items-center justify-center">
          {WORKFLOW_STAGES.map((stage, index) => {
            const config = STAGE_CONFIG[stage];
            const isCompleted = completedStages.includes(stage);
            const isCurrent = stage === currentStage;
            const isClickable = isCompleted || isCurrent;

            return (
              <div key={stage} className="flex items-center">
                {/* Step circle */}
                <button
                  onClick={() => isClickable && onStageClick?.(stage)}
                  disabled={!isClickable}
                  className={`
                    relative flex h-8 w-8 items-center justify-center rounded-full
                    text-xs font-bold transition-all duration-200
                    ${
                      isCompleted
                        ? "text-white cursor-pointer hover:scale-110"
                        : isCurrent
                        ? "cursor-pointer hover:scale-110"
                        : "bg-white/10 text-white/40 cursor-not-allowed"
                    }
                  `}
                  style={{
                    backgroundColor: isCurrent ? config.color : isCompleted ? "#22c55e" : undefined,
                    boxShadow: isCurrent
                      ? `0 0 0 2px #0f172a, 0 0 0 4px ${config.color}`
                      : undefined,
                  }}
                  title={config.label}
                >
                  {isCompleted ? (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    config.icon
                  )}
                </button>

                {/* Connector line */}
                {index < WORKFLOW_STAGES.length - 1 && (
                  <div
                    className={`h-0.5 w-4 md:w-8 lg:w-12 transition-colors duration-200 ${
                      index < currentIndex || completedStages.includes(WORKFLOW_STAGES[index + 1])
                        ? "bg-green-500"
                        : "bg-white/20"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Current stage label */}
        <div className="hidden md:block text-right min-w-[120px]">
          <span
            className="text-sm font-medium"
            style={{ color: STAGE_CONFIG[currentStage].color }}
          >
            {STAGE_CONFIG[currentStage].label}
          </span>
        </div>
      </div>

      {/* Mobile: Show current stage below */}
      <div className="mt-3 flex md:hidden items-center justify-between">
        <span className="text-xs text-white/60">Progress: {progress}%</span>
        <span
          className="text-sm font-medium"
          style={{ color: STAGE_CONFIG[currentStage].color }}
        >
          {STAGE_CONFIG[currentStage].label}
        </span>
      </div>
    </div>
  );
}
