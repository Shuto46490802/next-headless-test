import type { ReactNode } from "react";

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-neutral-300 px-6 py-16 text-center">
      <span className="text-lg font-medium text-neutral-900">{title}</span>
      {description ? <span className="max-w-sm text-sm text-neutral-500">{description}</span> : null}
      {action}
    </div>
  );
}
