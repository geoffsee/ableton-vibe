"use client";

import { ReactNode } from "react";

type ActionButton = {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "danger";
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
};

type QuickActionBarProps = {
  actions: ActionButton[];
  className?: string;
};

export function QuickActionBar({ actions, className = "" }: QuickActionBarProps) {
  const getButtonStyles = (variant: ActionButton["variant"] = "secondary") => {
    switch (variant) {
      case "primary":
        return "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white";
      case "danger":
        return "bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30";
      default:
        return "bg-white/10 hover:bg-white/20 text-white/80 border border-white/10";
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {actions.map((action, index) => (
        <button
          key={index}
          onClick={action.onClick}
          disabled={action.disabled || action.loading}
          className={`
            flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium
            transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
            ${getButtonStyles(action.variant)}
          `}
        >
          {action.loading ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            action.icon
          )}
          {action.label}
        </button>
      ))}
    </div>
  );
}
