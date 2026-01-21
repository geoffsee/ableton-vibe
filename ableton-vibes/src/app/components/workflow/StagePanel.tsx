"use client";

import { WorkflowStage, STAGE_CONFIG } from "../types";
import { ReactNode } from "react";

type StagePanelProps = {
  stage: WorkflowStage;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  isLocked?: boolean;
};

export function StagePanel({
  stage,
  title,
  subtitle,
  children,
  actions,
  isLocked = false,
}: StagePanelProps) {
  const config = STAGE_CONFIG[stage];

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
      {/* Header */}
      <div
        className="px-6 py-4 border-b border-white/10"
        style={{ backgroundColor: `${config.color}15` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: config.color }}
            >
              {config.icon}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {title || config.label}
              </h2>
              {subtitle && (
                <p className="text-sm text-white/60">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Status / Lock indicator */}
          {isLocked ? (
            <div className="flex items-center gap-2 rounded-full bg-green-500/20 px-3 py-1 text-xs text-green-400">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
              Locked
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/60">
              <div className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
              In Progress
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">{children}</div>

      {/* Actions footer */}
      {actions && (
        <div className="px-6 py-4 border-t border-white/10 bg-black/20">
          {actions}
        </div>
      )}
    </div>
  );
}
