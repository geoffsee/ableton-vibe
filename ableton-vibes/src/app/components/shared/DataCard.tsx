"use client";

import { ReactNode } from "react";

type DataCardProps = {
  title: string;
  value: string | number | ReactNode;
  subtitle?: string;
  icon?: ReactNode;
  color?: string;
  className?: string;
  onClick?: () => void;
};

export function DataCard({
  title,
  value,
  subtitle,
  icon,
  color,
  className = "",
  onClick,
}: DataCardProps) {
  const Component = onClick ? "button" : "div";

  return (
    <Component
      onClick={onClick}
      className={`
        rounded-2xl border border-white/10 bg-white/5 p-4 text-left
        ${onClick ? "cursor-pointer hover:bg-white/10 transition-colors" : ""}
        ${className}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-widest text-white/50">{title}</p>
          <div
            className="mt-1 text-lg font-semibold"
            style={{ color: color || "white" }}
          >
            {value}
          </div>
          {subtitle && (
            <p className="mt-1 text-sm text-white/60">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: color ? `${color}20` : "rgba(255,255,255,0.1)" }}
          >
            {icon}
          </div>
        )}
      </div>
    </Component>
  );
}

type TagListProps = {
  tags: string[];
  color?: string;
  onRemove?: (tag: string) => void;
  onAdd?: () => void;
};

export function TagList({ tags, color = "#8b5cf6", onRemove, onAdd }: TagListProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag, index) => (
        <span
          key={index}
          className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {tag}
          {onRemove && (
            <button
              onClick={() => onRemove(tag)}
              className="ml-1 hover:opacity-70"
            >
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </span>
      ))}
      {onAdd && (
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-white/30 px-3 py-1 text-xs text-white/60 hover:border-white/50 hover:text-white/80 transition-colors"
        >
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add
        </button>
      )}
    </div>
  );
}

type EmptyStateProps = {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: ReactNode;
};

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-white/60 max-w-sm">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
